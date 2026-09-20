/**
 * 代理路由的上游访问门闸（服务端）—— 两条代理路由共用一份实现（2026-09-20）。
 *
 * 与 upstream-auth.server.ts 同一动机：这段判断原先要么不存在、要么写在某一条路由里，
 * JSON 代理与 form-data 代理各写一份就一定会漂移 —— 而这两条路由吃的是同一把平台密钥，
 * 漂移的代价是「其中一条变成后门」。
 *
 * 四道闸，按顺序：
 *   1) 端点形态白名单 —— 只放行产品真的会用到的上游端点（unknown ⇒ 拒绝）
 *   2) 用户级限速 —— 生成 60/分、读取 300/分（DB 故障时与其它敏感接口同口径：拒绝）
 *   3) 生成类必须挂本人 running 的任务号 —— 这是把「计费」与「上游调用」重新绑在一起的那一环：
 *      扣费只发生在建任务那一刻，代理层不碰积分；要求挂任务而不是要求「有余额」，
 *      是因为余额不随调用变化，只有任务号才让每一次上游调用都有对应的付过费的行。
 *   4) 同一任务的调用预算 —— 任务号能反复使用，不给预算就是「付一次钱打 N 次」，见 upstream-call-budget.ts
 */

import { checkRateLimit } from "@/lib/rate-limit";
import { findRunnableGenerationJob } from "./generation-run.server";
import { consumeUpstreamCallBudget } from "./upstream-call-budget";
import { describeUpstreamEndpoint, isModelBoundToJob, readModelFromPathname, resolveJobCallBudget, resolveProxyJobGate, resolveUpstreamEndpointClass, type UpstreamEndpointClass } from "./upstream-endpoint-policy";

/** 生成类：一次调用 = 一次上游计费。一次生成通常 1~15 次调用（Gemini 一张一次），60/分给足人工操作量 */
const GENERATE_RATE_LIMIT = { windowMs: 60_000, maxRequests: 60 };
/** 读取类：取件与轮询 —— 视频任务每 5 秒一问、图片任务更密，且可能同时跑好几条任务 */
const READ_RATE_LIMIT = { windowMs: 60_000, maxRequests: 300 };

/** 只有按次计费的生成类型才做「请求模型 vs 任务模型」绑定；文本/工具的经济性归 Phase 0 的逐 token 计费 */
const MODEL_BOUND_KINDS = new Set(["image", "video", "audio"]);

export type ProxyUpstreamAccess = { ok: true; kind: UpstreamEndpointClass; endpoint: string } | { ok: false; status: number; error: string; log: string };

export type ProxyUpstreamAccessInput = {
    userId: string;
    method: string;
    /** 目标 URL 的 pathname（不含查询串） */
    pathname: string;
    /** 调用方声明的生成任务号（JSON 信封的 jobId / form-data 的 _proxy_job），可能为空 */
    jobId: string;
    /** 请求里声明的模型（JSON 信封取 body.model，form-data 取 model 字段） */
    requestModel?: string;
};

export async function authorizeProxyUpstreamCall(input: ProxyUpstreamAccessInput): Promise<ProxyUpstreamAccess> {
    const kind = resolveUpstreamEndpointClass(input.method, input.pathname);
    if (!kind) {
        // 白名单外的形态：不解释为什么被拒（避免把白名单当探针用），日志里留全量信息给运维
        return {
            ok: false,
            status: 403,
            error: "该上游端点不在允许清单内：代理只放行产品用到的生成与取件端点。",
            log: `端点未在白名单（${input.method} ${input.pathname}，用户 ${input.userId}）`,
        };
    }

    const endpoint = describeUpstreamEndpoint(input.method, input.pathname);
    const withinRate = await checkRateLimit(`proxy:${kind}:${input.userId}`, kind === "generate" ? GENERATE_RATE_LIMIT : READ_RATE_LIMIT);
    if (!withinRate) {
        return {
            ok: false,
            status: 429,
            error: "请求过于频繁，请稍后重试。",
            log: `限速拦截（${kind} ${endpoint}，用户 ${input.userId}）`,
        };
    }

    if (kind === "read") return { ok: true, kind, endpoint };

    // —— 以下只针对生成类（会产出成品、上游按次计费）——
    const gate = resolveProxyJobGate();
    if (!gate.enabled) return { ok: true, kind, endpoint };

    if (!input.jobId) {
        return {
            ok: false,
            status: 403,
            error: "生成类上游调用必须携带生成任务号：请先创建生成任务再发起调用。",
            log: `生成类调用缺任务号（${endpoint}，用户 ${input.userId}）`,
        };
    }

    const job = await findRunnableGenerationJob(input.userId, input.jobId);
    if (!job) {
        return {
            ok: false,
            status: 403,
            error: "生成任务不存在、已结束或不属于当前账号。",
            log: `生成类调用挂不上任务（${endpoint}，任务 ${input.jobId}，用户 ${input.userId}）`,
        };
    }

    if (MODEL_BOUND_KINDS.has(job.kind)) {
        const jobModel = (job.metadata as { model?: unknown } | null)?.model;
        const requestModel = input.requestModel?.trim() || readModelFromPathname(input.pathname);
        if (!isModelBoundToJob(jobModel, requestModel)) {
            return {
                ok: false,
                status: 403,
                error: "本次请求的模型与生成任务记录的模型不一致，请重新发起生成。",
                log: `模型与任务不匹配（${endpoint}，任务模型 ${String(jobModel)} / 请求模型 ${requestModel}，任务 ${job.id}）`,
            };
        }
    }

    const budget = resolveJobCallBudget(job.kind, job.count);
    if (!consumeUpstreamCallBudget(job.id, budget)) {
        return {
            ok: false,
            status: 429,
            error: "本次生成允许的上游调用次数已用尽，请重新发起生成。",
            log: `任务调用预算用尽（${endpoint}，任务 ${job.id}，预算 ${budget}，用户 ${input.userId}）`,
        };
    }

    return { ok: true, kind, endpoint };
}
