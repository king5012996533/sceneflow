import { isCredentialTargetAllowed, platformAuthHeaders, resolvePlatformCredential, resolvePlatformCredentialDetailed, type ResolvedCredential } from "@/lib/credential-store.server";
import { channelMaintenanceMessage } from "@/lib/credential-health";

/**
 * 上游请求的统一鉴权（服务端）。
 *
 * 原先这段逻辑在两条代理路由里各写了一份（JSON 信封一份、form-data 一份，
 * 后者还多一个 aigccc 用 `apikey` 头的分支）。补发与服务端执行也要发上游请求，
 * 再抄第三份就一定会漂移：某天改了网关的头规则，只有一条路径跟着改，
 * 表现是「补发过去全是 401」——那正是这套机制最容易悄悄失效的地方。
 *
 * 所以收成一处：给一批「调用方声明的头」+ 目标地址，返回「该发什么头、用的哪个渠道」。
 * 信封里**不存 Key**，重放时在这里重新解析、重新签发（Key 会轮换，存下来既危险又会过期）。
 */

export type UpstreamAuthorization = {
    /** 已经注入鉴权头的最终请求头 */
    headers: Record<string, string>;
    /** 平台渠道标签（登记进信封，重放时据此再解析凭证） */
    provider: string;
    model?: string;
    credential: ResolvedCredential;
};

/**
 * 解析凭证并注入鉴权头。返回 null = 不该放行（未注册渠道，或跨源目标）。
 *
 * `headers` 会被就地修改：先清掉调用方自带的 authorization（可能是同名字头的另一种大小写），
 * 再写入平台签发的那一份，避免同名字头重复导致上游取到错的那把。
 */
export async function authorizeUpstreamRequest(input: { headers: Record<string, string>; targetUrl: string; providerHint?: unknown; modelHint?: unknown }): Promise<UpstreamAuthorization | null> {
    const headers = input.headers;
    const providerHint = typeof input.providerHint === "string" ? input.providerHint : undefined;
    const modelHint = typeof input.modelHint === "string" ? input.modelHint : undefined;

    const credential = await resolvePlatformCredential({ targetUrl: input.targetUrl, provider: providerHint, model: modelHint });
    // 代理白名单：只放行已注册渠道（目标必须与凭证同源）。
    // 只做同源校验、不做路径前缀限制（各渠道端点拼接规则不同，见 isCredentialTargetAllowed）。
    if (!credential || !isCredentialTargetAllowed(credential.baseUrl, input.targetUrl)) return null;

    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "authorization" || key.toLowerCase() === "apikey") delete headers[key];
    }

    if (credential.apiKey) {
        // 鉴权头规则与超时补取件共用一份（platformAuthHeaders）：三处用的是同一把密钥、同一批网关。
        // aigccc 的 apikey 头、gemini 的 x-goog-api-key 都收在那份规则里 —— 这里不再各写一遍，
        // 否则「某天改了网关的头规则、只有一条路径跟着改」的漂移会如期而至。
        for (const [name, value] of Object.entries(platformAuthHeaders({ provider: credential.provider, apiKey: credential.apiKey }, input.targetUrl))) {
            for (const key of Object.keys(headers)) {
                if (key.toLowerCase() === name.toLowerCase()) delete headers[key];
            }
            headers[name] = value;
        }
    }

    return { headers, provider: String(credential.provider || providerHint || ""), model: modelHint, credential };
}

/**
 * authorizeUpstreamRequest 返回 null 时，说清「为什么」——两种原因对用户的意义完全不同。
 *
 * - 没配这个渠道 = 我们自己的配置缺失（用户照着任何提示都做不了什么）；
 * - 渠道在熔断窗口内 = 上游凭证失效，是可等待的（稍后重试 / 换模型），而且**现在就要说实话**，
 *   不能让用户看到「目标地址不在已注册渠道白名单内」这种内部话术（2026-09-20 Replicate 那次
 *   就是这样：真实原因是平台令牌被吊销，用户看到的是「请检查 Base URL、API Key」）。
 *
 * 只在解析失败这条冷路径上多查一次库；正常请求不受影响。
 */
export async function explainUpstreamAuthorizationFailure(input: { targetUrl: string; providerHint?: unknown; modelHint?: unknown }): Promise<string | null> {
    const providerHint = typeof input.providerHint === "string" ? input.providerHint : undefined;
    const modelHint = typeof input.modelHint === "string" ? input.modelHint : undefined;
    const resolution = await resolvePlatformCredentialDetailed({ targetUrl: input.targetUrl, provider: providerHint, model: modelHint });
    if (resolution.ok || resolution.reason !== "maintenance") return null;
    return channelMaintenanceMessage(modelHint);
}

/**
 * 落库前把鉴权头从信封里摘掉。
 *
 * Key 只在发送那一刻存在：信封要活好几天、还会进数据库备份，存下来的既危险又会过期。
 * 重放时由 authorizeUpstreamRequest 重新解析、重新签发（Key 轮换后照样能发得出去）。
 * content-type 也一并摘掉，它单独存在信封的 contentType 字段里（重放要的是原样那份 boundary）。
 *
 * ⚠️ 这份名单必须覆盖 platformAuthHeaders 可能产出的**每一个**头名（authorization / apikey /
 * x-goog-api-key）：漏一个，那把平台密钥就会被写进任务记录的 metadata 里跟着备份走。
 * 回归门禁里有一条断言盯着这件事。
 */
const CREDENTIAL_HEADER_NAMES = new Set(["authorization", "apikey", "api-key", "x-api-key", "x-goog-api-key", "content-type", "content-length"]);

export function stripCredentialHeaders(headers: Record<string, string>): Record<string, string> {
    const safe: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        if (CREDENTIAL_HEADER_NAMES.has(key.toLowerCase())) continue;
        safe[key] = value;
    }
    return safe;
}

/** 发往上游时实际使用的 content-type（multipart 的 boundary 只能来自构建那一刻） */
export function pickContentType(headers: Record<string, string>): string | undefined {
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === "content-type" && value) return value;
    }
    return undefined;
}
