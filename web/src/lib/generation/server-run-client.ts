import { apiPath } from "@/lib/app-paths";

import { resultUrlsFromItems } from "./generation-result";

/**
 * 「服务端替我们跑这次生成」时的客户端侧（阶段 2）。
 *
 * 老路径是浏览器自己抱着一条长连接等上游（最长 15 分钟）：那条连接一断，
 * 上游照画照计费，用户却只看到「请求失败」——2026-09-18 那 95% 丢掉成品就是这么来的。
 * 新路径里浏览器只做两件事：把信封交出去（拿到 202 与任务号），然后轮询我们自己的任务。
 *
 * 成品从哪来：服务端执行时已经把成品归档在 `resultData.items` 里（归档键或上游直链），
 * 所以这里取件走的是我们自己的媒体路由 —— 与上游直链的有效期、防盗链彻底无关。
 */

/** 等服务端出结论的上限：上游单次最长 15 分钟（见代理的 PROXY_TIMEOUT_MS），留一点余量 */
export const SERVER_RUN_WAIT_MS = 20 * 60 * 1000;

/** 轮询间隔：服务端一有结论就能立刻出图，不用等用户手动刷新 */
export const SERVER_RUN_POLL_MS = 1_500;

type ServerRunJob = { id: string; status: string; error?: string | null; resultData?: unknown };

/** 服务端执行失败/取消/超时该抛什么：与老路径同样的错误，上游文案原样带给用户 */
export class ServerRunError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ServerRunError";
    }
}

/**
 * 等服务端那一单出结论，然后把它已经归档的成品取回来。
 *
 * 尊重调用方的 AbortSignal（用户点「停止生成」）：抛 AbortError，
 * 由上层结算成 cancelled —— 服务端那边上游停不下来，但已经画完的图照样会被留下
 * （见 generation-rescue 的 keep-artifact），用户取消的只是「这次等待」。
 */
export async function awaitServerRunImages(jobId: string, signal?: AbortSignal): Promise<Array<{ id: string; dataUrl: string }>> {
    const job = await awaitServerRunJob(jobId, signal);
    const images = await imagesFromServerRun(job);
    if (!images.length) throw new ServerRunError("这次生成在服务端完成了，但没有取到成品文件：请到「生成记录」里查看，如仍未显示可稍后重试。");
    return images;
}

async function awaitServerRunJob(jobId: string, signal?: AbortSignal): Promise<ServerRunJob> {
    const deadline = Date.now() + SERVER_RUN_WAIT_MS;
    for (;;) {
        if (signal?.aborted) throw abortError();
        const job = await readJob(jobId);
        if (job) {
            if (job.status === "succeeded") return job;
            if (job.status === "failed") throw new ServerRunError(job.error || "这次生成失败了，请重试。");
            if (job.status === "cancelled") throw new ServerRunError("这次生成已被取消。");
        }
        if (Date.now() > deadline) {
            throw new ServerRunError(`这次生成还在服务端进行中（超过 ${Math.round(SERVER_RUN_WAIT_MS / 60000)} 分钟）：结果出来后会自动出现在「生成记录」里，积分不会白扣。`);
        }
        await sleep(SERVER_RUN_POLL_MS, signal);
    }
}

/** 把服务端已归档的成品取回成图片列表（形状与上游直出的图完全一致，下游无需区分） */
export async function imagesFromServerRun(job: ServerRunJob): Promise<Array<{ id: string; dataUrl: string }>> {
    const urls = resultUrlsFromItems(job.id, (job.resultData as { items?: unknown } | null)?.items);
    const images: Array<{ id: string; dataUrl: string }> = [];
    for (const url of urls.slice(0, 8)) {
        if (/^https?:\/\//i.test(url)) {
            images.push({ id: newImageId(), dataUrl: url });
            continue;
        }
        const dataUrl = await fetchArchivedMedia(url);
        if (dataUrl) images.push({ id: newImageId(), dataUrl });
    }
    return images;
}

/** 取我们自己归档的成品（同源、带 cookie）：转成 data URL，下游用法与上游返回的图完全一致 */
export async function fetchArchivedMedia(path: string): Promise<string | undefined> {
    try {
        const response = await fetch(apiPath(path), { credentials: "include" });
        if (!response.ok) return undefined;
        const blob = await response.blob();
        if (!blob.size) return undefined;
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return undefined;
    }
}

async function readJob(jobId: string): Promise<ServerRunJob | undefined> {
    try {
        const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}`), { credentials: "include" });
        if (!response.ok) return undefined;
        const payload = await response.json().catch(() => null);
        const job = payload?.job as ServerRunJob | undefined;
        return job?.id ? job : undefined;
    } catch {
        // 网络抖动：继续等（这条路径本来就是给「连接不稳」兜底的）
        return undefined;
    }
}

function sleep(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError());
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

/** 与浏览器原生中止同形：上层（generation-guard）据此把它结算成「用户取消」 */
function abortError() {
    return new DOMException("请求已取消", "AbortError");
}

function newImageId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
