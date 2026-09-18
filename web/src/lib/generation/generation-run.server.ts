import { prisma } from "@/lib/ic-prisma";
import { fetchSafely } from "@/lib/url-safety";

import { pickSubmittedTaskId } from "@/services/api/image-task";
import { aspectRetryBody } from "@/services/api/image-ratio";
import { isEditsEndpointUnsupported } from "@/services/api/image-reference";

import { finishGenerationJob, recordGenerationUpstream, settleDeferredClientFailure } from "./generation-jobs.server";
import { TERMINAL_SKIP_REASONS, hasKeptArtifact, decideResend, isEnvelopeReplayable, readEnvelope, readResendState, resolveReplayConfig, type ResendSkipReason, type UpstreamEnvelope } from "./generation-envelope";
import { dropUpstreamEnvelope, loadUpstreamEnvelope, readEnvelopeBody, recordResendAttempt } from "./generation-spool.server";
import { salvageGenerationArtifacts } from "./generation-rescue.server";
import { beginUpstreamCall, inflightJobCount, isUpstreamCallInFlight } from "./upstream-inflight";
import { authorizeUpstreamRequest } from "./upstream-auth.server";

/**
 * 上游信封的执行引擎（服务端）。
 *
 * 同一段代码服务两个场景，因为「谁在等这次调用」不是同一个问题：
 *
 *   阶段 1 · 补发（origin="live"）：
 *     浏览器那次调用死在半路（部署重启进程、900 秒超时、连接被重置），
 *     同步通道又没有上游任务号，成品再也没人取得回来 —— 上游照收费，我们手上什么都没有。
 *     这里拿留在服务端的信封原样再发一次，把成品取回来。
 *
 *   阶段 2 · 替浏览器执行（origin="defer"）：
 *     从一开始就不让浏览器参与等待：它只提交、只看进度，调用与归档全在服务端。
 *     连接断不断、标签页关不关，都不影响这一单的归属。
 *
 * 结账口径与代理路径完全一致（走同一套 salvage）：上游产出 → 认领成功、照常收费；
 * 上游明确报错 → 结为失败并退款；网络层失败 → 什么都不结，留给清扫（用户的钱不能被无限期挂着）。
 */

/** 执行一次上游调用的时限：与两条代理路由保持一致（900s），部署侧 nginx 必须更大 */
export const RUN_TIMEOUT_MS = 900_000;

export type RunOutcome = "claimed" | "task-recorded" | "upstream-error" | "no-artifact" | "network-error" | "not-allowed";

/** 服务端要执行的信封对应的任务：必须是本人的、还在跑的任务（已结账的任务不接受新的上游调用） */
export type RunnableJob = {
    id: string;
    userId: string;
    kind: string;
    metadata?: unknown;
    startedAt?: Date | null;
};

export async function findRunnableGenerationJob(userId: string, jobId: string): Promise<RunnableJob | null> {
    if (!prisma || !jobId) return null;
    const job = await prisma.generationJob.findFirst({
        where: { id: jobId, userId, status: "running" },
        select: { id: true, userId: true, kind: true, metadata: true, startedAt: true },
    });
    return job ?? null;
}

/**
 * 按信封发一次上游请求，并把结果按代理路径同一套规则处置。
 *
 * 三条不变量：
 *   1) 信封里没有 Key —— 鉴权头在这里重新签发（Key 会轮换，存下来的既危险又会过期）；
 *   2) 发请求前后登记在飞状态，结算侧看到的就是真实的「这次调用还在不在跑」；
 *   3) 无论成败都不抛异常：调用方是后台任务，抛出去只会变成 unhandled rejection。
 */
export async function executeStoredEnvelope(input: { job: RunnableJob; envelope: UpstreamEnvelope; origin: "live" | "defer"; source?: string }): Promise<RunOutcome> {
    const { job, envelope } = input;
    const source = input.source ?? (input.origin === "defer" ? "server-run" : "resend");

    const attempt = await runOnce({ job, envelope, source });
    // 上游明确说「这条路走不通」的两种拒收：客户端侧本来各有一条改道重投，
    // 服务端执行时没人替它改道，所以这两条规则也搬过来（判据与客户端共用同一份纯逻辑）。
    if (attempt.kind === "rejected") {
        const retry = await planRetry({ job, envelope, message: attempt.message });
        if (retry) {
            console.log(`[generation-run] 任务 ${job.id} 被上游拒收（${attempt.message.slice(0, 80)}）：按 ${retry.reason} 改道重投一次`);
            const second = await runOnce({ job, envelope: retry.envelope, source: `${source} · ${retry.reason}`, body: retry.body });
            return settleAttempt({ job, envelope, attempt: second, source });
        }
    }
    return settleAttempt({ job, envelope, attempt, source });
}

type Attempt = { kind: "ok"; payload: unknown; status: number; counted: { claimed: boolean; taskId: string } } | { kind: "rejected"; status: number; message: string; snippet: string } | { kind: "network-error"; message: string };

/** 发一次上游请求并解析报文，不做任何结账（结账统一在 settleAttempt 里） */
async function runOnce(input: { job: RunnableJob; envelope: UpstreamEnvelope; source: string; body?: Buffer }): Promise<Attempt> {
    const { job, envelope } = input;
    const headers: Record<string, string> = { ...envelope.headers };
    // content-type 单独存（multipart 的 boundary 只能来自构建那一刻），重放时原样带上
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-type") delete headers[key];
    }
    if (envelope.contentType) headers["content-type"] = envelope.contentType;

    const authorization = await authorizeUpstreamRequest({ headers, targetUrl: envelope.url, providerHint: envelope.provider, modelHint: envelope.model });
    if (!authorization) {
        console.warn(`[generation-run] 任务 ${job.id} 的信封指向未注册渠道或缺少凭证，放弃执行（${envelope.url}）`);
        return { kind: "network-error", message: "未注册渠道或缺少凭证" };
    }

    let body: Buffer | undefined = input.body;
    try {
        if (!body) body = await readEnvelopeBody(job.id, envelope);
    } catch (error) {
        console.error("[generation-run] 读取信封请求体失败", job.id, error instanceof Error ? error.message : error);
        return { kind: "rejected", status: 0, message: "信封请求体读取失败", snippet: "" };
    }

    const release = beginUpstreamCall(job.id);
    let response: Response;
    try {
        response = await fetchSafely(envelope.url, {
            method: envelope.method,
            headers,
            body: body as unknown as BodyInit | undefined,
            signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
        });
    } catch (error) {
        release();
        console.warn(`[generation-run] 任务 ${job.id} 执行信封失败（网络层）：${error instanceof Error ? error.message : error}`);
        return { kind: "network-error", message: error instanceof Error ? error.message : String(error) };
    }

    // 登记要一直握到**报文正文读完**为止，不能停在「收到响应头」那一刻。
    // fetch 在响应头到达时就返回，正文（成品就在正文里）随后才送到：这段空档里登记簿会显示
    // 「没有人在调」，补发就会对着一条正在收图的任务再发一次请求 —— 上游多收一次钱。
    // 2026-09-19 线上两次踩到这一点：一次成品被当成重复报文丢掉，一次白付一次。
    let text = "";
    try {
        text = await response.text();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[generation-run] 任务 ${job.id} 读取上游报文失败（正文没到齐）：${message}`);
        return { kind: "network-error", message };
    } finally {
        release();
    }

    let payload: unknown = text;
    try {
        payload = JSON.parse(text);
    } catch {
        /* 非 JSON 报文：原样交给抢救逻辑（它只认已知字段名，认不出就是没成品） */
    }

    if (!response.ok) {
        const snippet = typeof payload === "object" && payload !== null ? JSON.stringify(payload).slice(0, 300) : String(payload).slice(0, 300);
        console.error(`[generation-run] 任务 ${job.id} 上游 ${response.status}（${input.source}）：${snippet}`);
        return { kind: "rejected", status: response.status, message: upstreamFailureText(payload) || snippet, snippet };
    }

    // 与代理路径同一套抢救：有成品就认领（照常收费）并归档
    let claimed = false;
    try {
        claimed = await salvageGenerationArtifacts({ userId: job.userId, jobId: job.id, payload, source: input.source });
    } catch (error) {
        console.error("[generation-run] 抢救异常", job.id, error instanceof Error ? error.message : error);
    }
    return { kind: "ok", payload, status: response.status, counted: { claimed, taskId: claimed ? "" : pickSubmittedTaskId(payload) } };
}

/** 一次尝试结束之后怎么结账：认领、留痕、判失败退款，还是什么都不做（留给清扫） */
async function settleAttempt(input: { job: RunnableJob; envelope: UpstreamEnvelope; attempt: Attempt; source: string }): Promise<RunOutcome> {
    const { job, envelope, attempt } = input;
    if (attempt.kind === "network-error") return "network-error";
    if (attempt.kind === "rejected") {
        await finishGenerationJob(job.userId, job.id, "failed", upstreamErrorMessage(attempt.status, attempt.snippet)).catch((error) => console.error("[generation-run] 结账失败", job.id, error instanceof Error ? error.message : error));
        await dropUpstreamEnvelope(job.id);
        return "upstream-error";
    }
    if (attempt.counted.claimed) {
        await dropUpstreamEnvelope(job.id);
        return "claimed";
    }
    // 报文里没有成品，但带着上游任务号（任务制通道）：把号留下，交给补取件去要成品。
    // 不判失败 —— 那个任务在上游还在跑，重放提交只会在上游多建一个任务、多收一次钱。
    if (attempt.counted.taskId) {
        const getUrl = taskQueryUrl(envelope.url, attempt.counted.taskId);
        await recordGenerationUpstream(job.userId, job.id, { provider: envelope.provider || "unknown", model: envelope.model || "", externalId: attempt.counted.taskId, externalGetUrl: getUrl }).catch(() => undefined);
        console.log(`[generation-run] 任务 ${job.id} 上游只收单未出图（任务号 ${attempt.counted.taskId}）：留给补取件，不重发`);
        return "task-recorded";
    }
    console.warn(`[generation-run] 任务 ${job.id} 上游 200 但报文里没有成品（${input.source}）：无法交付`);
    return "no-artifact";
}

/**
 * 被上游拒收时的改道方案（最多一次）：
 *   - 画幅不被接受 → 换成上游自己列出的比例串重投（**新请求体直接带在返回值里**：
 *     落盘的那份是原请求，指望它自己变成改过画幅的版本是不可能的）；
 *   - 编辑端点不吃这个模型 → 换用提交时就备好的「生成端点 + image_urls」信封
 *     （参考素材在提交那一刻由代理路由一起存下，不依赖浏览器还在不在）。
 */
async function planRetry(input: { job: RunnableJob; envelope: UpstreamEnvelope; message: string }): Promise<{ envelope: UpstreamEnvelope; reason: string; body?: Buffer } | null> {
    const body = await readEnvelopeBodyBuffer(input.job.id, input.envelope);
    const jsonBody = parseJsonBody(body, input.envelope.contentType);
    const rewritten = jsonBody ? aspectRetryBody(jsonBody, input.message) : null;
    if (rewritten) {
        const rewrittenBody = Buffer.from(JSON.stringify(rewritten));
        return {
            envelope: { ...input.envelope, bodyBytes: rewrittenBody.byteLength, savedAt: Date.now() },
            reason: "画幅改成上游支持的比例",
            body: rewrittenBody,
        };
    }

    if (isEditsEndpointUnsupported(input.message)) {
        const fallback = await loadUpstreamEnvelope(input.job.id, input.job.userId, "fallback");
        if (fallback && isEnvelopeReplayable(fallback)) {
            return { envelope: fallback, reason: "改走生成端点 + image_urls" };
        }
    }
    return null;
}

async function readEnvelopeBodyBuffer(jobId: string, envelope: UpstreamEnvelope): Promise<Buffer | undefined> {
    try {
        return await readEnvelopeBody(jobId, envelope);
    } catch {
        return undefined;
    }
}

function parseJsonBody(body: Buffer | undefined, contentType?: string): Record<string, unknown> | null {
    if (!body || !/json/i.test(contentType ?? "")) return null;
    try {
        const parsed = JSON.parse(body.toString("utf8")) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

/** 上游报错原文：报文里的说明优先，取不到就用报文片段 */
function upstreamFailureText(payload: unknown): string {
    if (typeof payload === "string") return payload.slice(0, 300);
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "msg", "error", "detail"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.slice(0, 300);
        if (value && typeof value === "object") {
            const nested = (value as Record<string, unknown>).message;
            if (typeof nested === "string" && nested.trim()) return nested.slice(0, 300);
        }
    }
    return "";
}

/**
 * 扫描并补发「调用死在半路」的任务。
 *
 * 只在明确知道「没有人正在调、也没有上游任务号」时才补发（见 decideResend）：
 * 补发的代价是可能向上游多付一次钱，而它买到的是「付一次、图上谁都有」。
 */
export type ResendResult = {
    scanned: number;
    resent: number;
    claimed: number;
    failed: number;
    skipped: Record<string, number>;
    outcomes: Array<{ jobId: string; outcome: RunOutcome }>;
};

export async function resendStaleGenerationJobs(input: { limit?: number; now?: number; resendAfterMs?: number } = {}): Promise<ResendResult> {
    const result: ResendResult = { scanned: 0, resent: 0, claimed: 0, failed: 0, skipped: {}, outcomes: [] };
    if (!prisma) return result;

    const config = resolveReplayConfig();
    const now = input.now ?? Date.now();
    const resendAfterMs = Number.isFinite(Number(input.resendAfterMs)) ? Number(input.resendAfterMs) : undefined;
    const limit = Math.max(1, Math.min(5, Math.floor(Number(input.limit) || 2)));
    // 没有点名任何可重放渠道时直接返回：这是拿钱换确定性的开关，默认关着（空名单 = 谁都不放行）
    if (!config.hosts.length && !config.providers.length) {
        result.skipped["channel-not-replayable"] = 0;
        return result;
    }

    const cutoff = new Date(now - (resendAfterMs ?? 120_000));
    const candidates = await prisma.generationJob.findMany({
        where: { status: "running", kind: { in: ["image", "video"] }, startedAt: { lt: cutoff } },
        orderBy: { startedAt: "asc" },
        take: limit * 6,
        select: { id: true, userId: true, kind: true, status: true, metadata: true, resultData: true, externalId: true, provider: true, startedAt: true },
    });
    result.scanned = candidates.length;

    for (const job of candidates) {
        if (result.resent >= limit) break;
        const envelope = readEnvelope(job.metadata);
        const decision = decideResend({
            status: job.status,
            hasArtifact: hasKeptArtifact(job.resultData),
            envelope,
            attempts: readResendState(job.metadata).attempts,
            startedAt: job.startedAt,
            externalId: job.externalId,
            inFlight: isUpstreamCallInFlight(job.id),
            provider: envelope?.provider ?? job.provider,
            config,
            now,
            resendAfterMs,
        });
        if (!decision.resend) {
            result.skipped[decision.reason] = (result.skipped[decision.reason] ?? 0) + 1;
            // 补发这条路彻底走不通了（信封没了/过期、渠道不让补发、预算用完）：这时候才该让结账侧
            // 按客户端那句「失败」退款。留着不管的话，这条任务要等到 30 分钟后的清扫才关账。
            if (TERMINAL_SKIP_REASONS.includes(decision.reason)) {
                await settleDeferredClientFailure(job.userId, job.id).catch((error) => console.error("[generation-run] 代为结账异常", job.id, error instanceof Error ? error.message : error));
            }
            continue;
        }

        // 预算先记账再动手：中途进程被杀也不会变成「无限重试」
        const attempts = readResendState(job.metadata).attempts + 1;
        await recordResendAttempt(job.id, job.userId, { attempts, lastAt: now }).catch(() => undefined);
        if (!envelope) continue;
        // 补发要花上游的钱，出事时得能一眼看出「当时登记簿里有什么」：
        // 2026-09-19 那次撞车就是登记簿里的这条调用没被这个路由看见（bundle 各自一份模块）
        console.log(`[generation-run] 任务 ${job.id} 的上游调用死在半路（第 ${attempts} 次补发）：${envelope.method} ${envelope.url}｜登记簿 inFlight=${isUpstreamCallInFlight(job.id)} 本轮登记数=${inflightJobCount()}`);
        result.resent += 1;

        const outcome = await executeStoredEnvelope({ job, envelope, origin: "live" });
        result.outcomes.push({ jobId: job.id, outcome });
        if (outcome === "claimed") {
            result.claimed += 1;
            continue;
        }
        if (outcome === "upstream-error" || outcome === "no-artifact") {
            result.failed += 1;
            continue;
        }
        // network-error / task-recorded / not-allowed：留着，交给清扫或补取件
    }

    console.log(`[generation-run] 补发扫描：候选 ${result.scanned}｜补发 ${result.resent}｜认领成功 ${result.claimed}｜判失败退款 ${result.failed}｜跳过 ${JSON.stringify(result.skipped)}`);
    return result;
}

/**
 * 阶段 2 的入口：把这次调用交给服务端执行，浏览器不再等待。
 *
 * 调用方必须**先把信封落盘**（saveUpstreamEnvelope）再调这里：顺序不能反 ——
 * 进程若在落盘之前死掉，这一单就既没有成品也没有信封，谁都救不回来。
 * 这里只负责把执行挂到后台：不 await，让 202 立刻回到浏览器。
 */
export function startServerRun(input: { job: RunnableJob; envelope: UpstreamEnvelope }): void {
    void executeStoredEnvelope({ job: input.job, envelope: input.envelope, origin: "defer" })
        .then(async (outcome) => {
            if (outcome === "network-error" || outcome === "task-recorded" || outcome === "not-allowed") return;
            if (outcome === "no-artifact") {
                // 上游 200 却没有成品：不能把用户挂在这里等 —— 结为失败并退款，用户看得见原因
                await finishGenerationJob(input.job.userId, input.job.id, "failed", "上游已返回但没有产出图片").catch(() => undefined);
                await dropUpstreamEnvelope(input.job.id);
            }
        })
        .catch((error) => console.error("[generation-run] 服务端执行异常", input.job.id, error instanceof Error ? error.message : error));
}

/** 上游报错原文（截断）—— 与代理路径写给客户的文案同一口径 */
function upstreamErrorMessage(status: number, snippet: string) {
    return `上游返回 ${status}（服务端执行）：${snippet || "无说明"}`.slice(0, 1000);
}

/**
 * 任务制通道的取件地址：把提交地址的最后一段换成 `tasks/<id>`。
 * 只在「重放的报文带任务号」这条兜底路径上用，取不准也只是补取件查不到，不会更差。
 */
function taskQueryUrl(submitUrl: string, taskId: string): string {
    try {
        const url = new URL(submitUrl);
        const base = url.pathname.replace(/\/[^/]*$/, "");
        return `${url.origin}${base}/tasks/${encodeURIComponent(taskId)}`;
    } catch {
        return "";
    }
}

export type { ResendSkipReason };
