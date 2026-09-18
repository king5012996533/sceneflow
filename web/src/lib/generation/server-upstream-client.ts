import { apiPath } from "@/lib/app-paths";
import { normalizeResultUrls } from "./generation-result";

export type GenerationUpstreamRecord = { provider: string; model: string; externalId: string; externalGetUrl?: string };

/**
 * 把上游任务号记到服务端（生成提交后立刻调用）。
 *
 * 起因：2026-09-18 事故里 1900+ 条图片任务没有任何上游线索，任务卡在 running 时
 * 服务端既不知道去哪儿取件、也不知道用的哪个模型，只能退款了事。
 * 留痕之后，卡住的任务至少是可追的：哪个渠道、哪个模型、上游任务号是多少。
 *
 * 铁律：尽力而为——留痕失败绝不能把生成搞挂，所以这里吞掉所有异常。
 * keepalive 让页面正在跳转/关闭时这个请求也尽量发出去。
 */
export async function reportUpstreamTask(jobId: string | undefined, record: GenerationUpstreamRecord): Promise<void> {
    if (!jobId || !record.externalId) return;
    try {
        await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}/upstream`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(record),
            keepalive: true,
        });
    } catch {
        // 留痕是尽力而为
    }
}

/**
 * 上报成品地址（拿到结果的当下就报，越早越好）。
 *
 * 服务端会立刻认领任务（判成功）并自己取一份归档——这样「用户有没有拿到成品」
 * 就不再取决于这个标签页还活着没有。data: 形态的成品由浏览器自己带着字节，
 * 不往回传（避免几 MB 的 body 拖着生成流程）。
 * 与留痕同样尽力而为：失败绝不影响生成。
 */
export async function reportGenerationResult(jobId: string | undefined, urls: string[]): Promise<void> {
    if (!jobId) return;
    const httpUrls = normalizeResultUrls(urls);
    if (!httpUrls.length) return;
    try {
        await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}/result`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ urls: httpUrls }),
            keepalive: true,
        });
    } catch {
        // 上报是尽力而为
    }
}
