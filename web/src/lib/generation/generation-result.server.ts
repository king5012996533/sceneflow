import { archiveGenerationMedia } from "./server-media-storage.server";
import { MAX_RESULT_BYTES, RESULT_FETCH_TIMEOUT_MS, guessMimeType, type ResultItem } from "./generation-result";
import { fetchSafely } from "@/lib/url-safety";

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
    const items: ResultItem[] = [];
    for (let index = 0; index < urls.length; index += 1) {
        const url = urls[index];
        try {
            const response = await fetchSafely(url, { signal: AbortSignal.timeout(RESULT_FETCH_TIMEOUT_MS) });
            if (!response.ok) throw new Error(`成品下载失败: ${response.status}`);
            const declared = Number(response.headers.get("content-length") || 0);
            if (declared > MAX_RESULT_BYTES) throw new Error("成品体积超限");
            const body = await response.arrayBuffer();
            if (body.byteLength > MAX_RESULT_BYTES) throw new Error("成品体积超限");
            const archiveKey = `${jobId}/${index}`;
            await archiveGenerationMedia(archiveKey, body);
            items.push({ archiveKey, mimeType: response.headers.get("content-type") || guessMimeType(url), bytes: body.byteLength });
        } catch (error) {
            console.error("[generation-result] 归档失败", jobId, url, error instanceof Error ? error.message : error);
            items.push({ url });
        }
    }
    return items;
}
