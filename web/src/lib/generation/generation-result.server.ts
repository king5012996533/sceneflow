import { archiveGenerationMedia } from "./server-media-storage.server";
import { MAX_RESULT_BYTES, RESULT_FETCH_TIMEOUT_MS, detectMediaMime, guessMimeType, isArchivedResultItem, mergeResultItems, resultMediaPath, type ResultItem, type ResultSource } from "./generation-result";
import { fetchSafely } from "@/lib/url-safety";
import { prisma } from "@/lib/ic-prisma";

/**
 * 生成成品归档（服务端）。
 *
 * 2026-09-18 线上：nginx 显示上游调用 99% 是 200，但任务成功率只有 55%
 * —— 钱花在上游成功了，结果丢在我们自己的交付环节：下载、上传、回报全发生在
 * 用户的标签页里，标签页一关/一断/一刷新，上游已出图并计费，我们手里什么都没有，
 * 只能退款，成本全由平台承担。
 *
 * 所以成品一旦产出，服务端立刻自己取一份归档下来：
 *   - 之后用户从历史记录里随时能拿到（不再赌第三方 CDN 的有效期与防盗链）；
 *   - 浏览器那边下载失败也不再等于「这次生成失败」；
 *   - 任务状态可以只依据「上游是否产出」来判，而不是「浏览器是否活着」。
 *
 * 归档失败不算生成失败：仍然保留上游地址，任务照旧算成功（用户当时是拿到的）。
 */

/**
 * 逐份归档。返回的 items 与入参 urls **按下标一一对应**：
 * 归档成功的带 archiveKey，失败的退化成 { url }（保留可取地址，不阻断其他份）。
 */
export async function archiveGenerationResults(jobId: string, urls: string[]): Promise<ResultItem[]> {
    return archiveResultSources(
        jobId,
        urls.map((url) => ({ kind: "url", url }) satisfies ResultSource),
    );
}

/**
 * 按来源归档：内联字节（上游报文里就是成品）直接落盘，远程地址才需要再取一次。
 *
 * 内联这条通道是 2026-09-18 黑洞的正面解法：OpenAI 兼容通道 response_format=b64_json 时，
 * 成品字节本来就躺在我们的代理进程里，只要当场写盘，用户拿没拿到、浏览器死没死都不再影响交付。
 * 内联字节的 MIME 声明不可信（中转站常写错），一律按文件头复核，认不出就丢掉这一份。
 */
export async function archiveResultSources(jobId: string, sources: ResultSource[]): Promise<ResultItem[]> {
    const items: ResultItem[] = [];
    for (const source of sources) {
        const index = items.length;
        try {
            if (source.kind === "inline") {
                const body = Buffer.from(source.base64, "base64");
                if (!body.byteLength) throw new Error("内联成品解码为空");
                if (body.byteLength > MAX_RESULT_BYTES) throw new Error("成品体积超限");
                const mimeType = detectMediaMime(body) || "";
                if (!mimeType) throw new Error(`内联成品的文件头无法识别（声明 ${source.mimeType || "未知"}）`);
                const archiveKey = `${jobId}/${index}`;
                await archiveGenerationMedia(archiveKey, toArrayBuffer(body));
                items.push({ archiveKey, mimeType, bytes: body.byteLength });
                continue;
            }
            const response = await fetchSafely(source.url, { signal: AbortSignal.timeout(RESULT_FETCH_TIMEOUT_MS) });
            if (!response.ok) throw new Error(`成品下载失败: ${response.status}`);
            const declared = Number(response.headers.get("content-length") || 0);
            if (declared > MAX_RESULT_BYTES) throw new Error("成品体积超限");
            const body = await response.arrayBuffer();
            if (body.byteLength > MAX_RESULT_BYTES) throw new Error("成品体积超限");
            const archiveKey = `${jobId}/${index}`;
            await archiveGenerationMedia(archiveKey, body);
            items.push({ archiveKey, mimeType: response.headers.get("content-type") || guessMimeType(source.url), bytes: body.byteLength });
        } catch (error) {
            console.error("[generation-result] 归档失败", jobId, source.kind === "url" ? source.url : `${source.mimeType || "inline"} ${source.base64.length} 字符`, error instanceof Error ? error.message : error);
            if (source.kind === "url") items.push({ url: source.url });
        }
    }
    return items;
}

/**
 * 把归档结果并进任务记录（与上报路由同一套合并规则）。
 *
 * 只在任务已是 succeeded 时写入：认领（判成功）必须发生在归档之前，
 * 归档只影响「本地有没有副本」，不影响这笔账怎么结。
 */
export async function storeGenerationResults(userId: string, jobId: string, items: ResultItem[]): Promise<ResultItem[]> {
    if (!prisma) return items;
    const job = await prisma.generationJob.findFirst({ where: { id: jobId, userId }, select: { resultData: true } });
    const existing = (job?.resultData as { items?: unknown } | null)?.items;
    const merged = mergeResultItems(existing, items);
    const primary = merged[0];
    const resultUrl = primary ? (isArchivedResultItem(primary) ? resultMediaPath(jobId, 0) : primary.url) : undefined;
    await prisma.generationJob.updateMany({
        where: { id: jobId, userId, status: "succeeded" },
        data: { resultData: { items: merged }, resultUrl },
    });
    return merged;
}

/** 归档接口吃 ArrayBuffer：Buffer 视图可能只是底层内存的一段，必须按 offset/length 精确切片 */
function toArrayBuffer(body: Buffer): ArrayBuffer {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
}
