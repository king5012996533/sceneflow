import { prisma } from "@/lib/ic-prisma";
import { sendPlainEmail } from "@/lib/email";
import { CREDENTIAL_FAILURE_THRESHOLD, isCredentialAuthStatus, isCredentialCircuitOpen, manualHealthResetPatch, nextHealthAfterFailure, nextHealthAfterSuccess } from "@/lib/credential-health";

/**
 * 渠道健康的落库侧（纯逻辑在 credential-health.ts）。
 *
 * 调用点是「拿到上游响应之后」的三条路径：两条代理路由 + Replicate 建单路由。
 * 只认状态码：401/403 记失败，<400 记成功，其它（400/413/429/5xx）既不记失败也不清连击 ——
 * 那些是任务或上游波动，不该把渠道判成「钥匙坏了」。
 *
 * 所有写入都是「读-改-写」的小事务，最坏情况是并发下少记一次连击，不会误放行：
 * 熔断判定的唯一依据是库里的 healthDownUntil，写坏了只会晚一次熔断，不会提前拦正常流量。
 */

const SELECT_HEALTH = {
    id: true,
    name: true,
    provider: true,
    models: true,
    healthFailStreak: true,
    healthLastStatus: true,
    healthLastFailureAt: true,
    healthLastSuccessAt: true,
    healthDownUntil: true,
    healthNote: true,
} as const;

/**
 * 记一次上游响应。`credentialId` 为空（例如用户自带 Key）时什么都不做。
 * 永不抛：健康统计是旁路，不能因为它把正常请求搞挂。
 */
export async function recordCredentialUpstreamStatus(credentialId: string | null | undefined, status: number, model?: string | null): Promise<void> {
    if (!credentialId || !prisma) return;
    try {
        if (isCredentialAuthStatus(status)) return await recordFailure(credentialId, status, model);
        if (status < 400) return await recordSuccess(credentialId);
    } catch (error) {
        console.error("[credential-health] 记录失败（忽略）", credentialId, status, error instanceof Error ? error.message : error);
    }
}

async function recordFailure(credentialId: string, status: number, model?: string | null): Promise<void> {
    const row = await prisma!.providerCredential.findUnique({ where: { id: credentialId }, select: SELECT_HEALTH });
    if (!row) return;
    const patch = nextHealthAfterFailure(row, status);
    const { tripped, ...data } = patch;
    // 已熔断的凭证不会被解析，所以走到这里的失败都属于「窗口外」的失败：累加连击即可。
    await prisma!.providerCredential.update({ where: { id: credentialId }, data });
    if (!tripped) return;
    console.error(`[credential-health] 渠道熔断 ${row.name}（${row.provider}）HTTP ${status} 连续 ${data.healthFailStreak} 次｜模型 ${model || (row.models ?? []).join(",") || "-"}｜暂停至 ${data.healthDownUntil?.toISOString()}`);
    void notifyCredentialDown({ name: row.name, provider: row.provider, models: row.models ?? [], status, streak: data.healthFailStreak, model, downUntil: data.healthDownUntil });
}

async function recordSuccess(credentialId: string): Promise<void> {
    const row = await prisma!.providerCredential.findUnique({ where: { id: credentialId }, select: SELECT_HEALTH });
    if (!row) return;
    // 一次成功就清零：真实流量即探针，不做「半开成功要连续 N 次」那套，我们的调用量撑不起慢恢复。
    if ((row.healthFailStreak ?? 0) === 0 && !row.healthDownUntil) return;
    await prisma!.providerCredential.update({ where: { id: credentialId }, data: nextHealthAfterSuccess(row) });
    console.error(`[credential-health] 渠道恢复 ${row.name}（${row.provider}）`);
}

/** 管理员手动解除熔断（换好钥匙后立即放行，不必等窗口到点）。 */
export async function clearCredentialCircuit(credentialId: string): Promise<boolean> {
    if (!prisma) return false;
    const result = await prisma.providerCredential.updateMany({ where: { id: credentialId }, data: manualHealthResetPatch() });
    if (result.count) console.error(`[credential-health] 管理员手动解除熔断 ${credentialId}`);
    return result.count > 0;
}

/**
 * 熔断告警：邮件发给所有管理员。
 *
 * 到点自动半开、再失败会重新触发，所以最坏情况是「每个坏渠道每半小时一封」，不会刷屏。
 * 邮件失败只记日志 —— 告警通道坏掉不该影响熔断本身。
 */
async function notifyCredentialDown(input: { name: string; provider: string; models: string[]; status: number; streak: number; model?: string | null; downUntil: Date | null }): Promise<void> {
    try {
        const admins = await prisma!.user.findMany({ where: { role: "admin", bannedAt: null }, select: { email: true } });
        const to = admins.map((a) => a.email).filter(Boolean);
        if (!to.length) return;
        const modelList = input.model ? [input.model, ...input.models.filter((m) => m !== input.model)] : input.models;
        const html = [
            `<p>平台渠道 <b>${escapeHtml(input.name)}</b>（${escapeHtml(input.provider)}）已因凭证类失败被自动暂停。</p>`,
            `<ul>`,
            `<li>上游返回：HTTP <b>${input.status}</b>（鉴权失败，通常是 Key 被吊销、轮换后粘错，或令牌过期）</li>`,
            `<li>连续失败：${input.streak} 次（阈值 ${CREDENTIAL_FAILURE_THRESHOLD}）</li>`,
            `<li>涉及模型：${modelList.length ? modelList.map(escapeHtml).join("、") : "该渠道全部模型"}</li>`,
            `<li>自动恢复：${input.downUntil ? `${formatChinaTime(input.downUntil)} 之后自动重试（真实流量即探针）` : "下次调用"}</li>`,
            `</ul>`,
            `<p>处理：到后台「凭证」页更新该渠道的 API Key；保存后可在同一行点「立即重试」立刻放行，不必等窗口到期。</p>`,
            `<p>在此期间这些模型已置灰，用户不会被扣分（凭证类失败发生在建单之前，不会产生预扣）。</p>`,
        ].join("");
        for (const email of to) {
            const result = await sendPlainEmail(email, `【渠道告警】${input.name} 凭证失效，已自动暂停`, html);
            if (!result.ok) console.error("[credential-health] 告警邮件发送失败", email, result.error);
        }
    } catch (error) {
        console.error("[credential-health] 告警流程异常（忽略）", error instanceof Error ? error.message : error);
    }
}

function formatChinaTime(value: Date): string {
    return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value);
}

function escapeHtml(value: string): string {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}

export { isCredentialCircuitOpen };
