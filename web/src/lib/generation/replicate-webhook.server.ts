import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Replicate webhook 的鉴权与回调地址（2026-09-22）。
 *
 * 为什么要这个：Replicate 那一档的成品一直是**我们主动轮询**才知道出来的 —— 页面上有人盯着时
 * 靠事件流每 2 秒推一拍，没人盯时靠 cron（现在 15 秒）。上游本身有 completed_at，我们却在
 * 平均 7.5 秒、最坏 32.8 秒之后才结账（实测六条真实任务）。改成上游一完成就推我们，这段空窗
 * 归零；轮询保留作兜底（webhook 丢了、地址变了、上游重试都没关系）。
 *
 * 鉴权用**每个任务一份的签名**而不是账号级 webhook 密钥：回调地址里带 jobId + HMAC，
 * 收到请求时按 jobId 重算一次比对即可。这样不需要在 Replicate 账号里配置密钥、也不用
 * 依赖 X-Replicate-Signature（那是账号级配置，改起来要人手工点）。
 * 轮询路径不受影响：两个入口共用 applyReplicatePrediction，认领是乐观锁。
 */

/** 地址里签名覆盖的内容：带上版本前缀，将来换算法时旧链接会自然失效 */
function signingPayload(jobId: string): string {
    return `v1:${jobId}`;
}

/** 密钥：专门的变量优先，退回已有的 worker secret；都没有就不发 webhook（轮询照旧兜底） */
export function replicateWebhookSecret(): string {
    return (process.env.REPLICATE_WEBHOOK_SECRET || process.env.GENERATION_WORKER_SECRET || "").trim();
}

/** 给某个任务签一份回调凭证；没配密钥时返回 null（调用方据此不发 webhook） */
export function signReplicateWebhookJob(jobId: string): string | null {
    const secret = replicateWebhookSecret();
    if (!secret || !jobId) return null;
    return createHmac("sha256", secret).update(signingPayload(jobId)).digest("base64url");
}

/** 校验回调凭证。签名长度不等直接否掉，比较用 timingSafeEqual（别用 === 比 HMAC） */
export function verifyReplicateWebhookSignature(jobId: string, signature: string): boolean {
    const expected = signReplicateWebhookJob(jobId);
    if (!expected || !signature) return false;
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * 交给上游的回调地址。
 *
 * host 取值顺序：显式配的 PUBLIC_BASE_URL → 反向代理传来的 x-forwarded-host → 请求自身的 host。
 * 只有 http(s) 且能拿到 host 时才返回地址：本地开发拿不到公网地址，此时不发 webhook 即可。
 */
export function replicateWebhookUrl(jobId: string, headers: Headers): string | null {
    const signature = signReplicateWebhookJob(jobId);
    if (!signature) return null;
    const configured = (process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
    let base = configured;
    if (!base) {
        const host = (headers.get("x-forwarded-host") || headers.get("host") || "").split(",")[0].trim();
        if (!host) return null;
        const proto = (headers.get("x-forwarded-proto") || "").split(",")[0].trim() || "https";
        base = `${proto}://${host}`;
    }
    if (!/^https?:\/\//i.test(base)) return null;
    return `${base}/api/generation/webhooks/replicate?job=${encodeURIComponent(jobId)}&sig=${encodeURIComponent(signature)}`;
}
