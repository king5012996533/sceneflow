import { apiPath } from "@/lib/app-paths";

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
