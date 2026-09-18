/**
 * 「上游请求信封」的存留与重放判定（纯逻辑：不碰数据库、不触网，可直接在 Node 下单测）。
 *
 * 2026-09-18 线上账：7 天 170 条失败里，有 51 条死在我们自己这侧（客户端断连、清扫超时、进程重启），
 * 而这一批的共同点是——**同步通道没有上游任务号**，成品只在「我们那次调用的响应」里出现过一次。
 * 发起调用的进程一没（部署重启、900 秒超时、连接被重置），那份响应就永远拿不到了：
 * 上游照收费，我们手上什么都没有，用户也没有。
 *
 * 所以把「发往上游的那一次请求」本身留在服务端：地址、方法、非鉴权头、请求体。
 * 有了它，服务端可以
 *   - 补发（阶段 1）：调用方死在半路时，原样再发一次，把成品取回来；
 *   - 替浏览器执行（阶段 2）：从一开始就不让浏览器参与等待，它只负责提交与看进度。
 *
 * 四条硬规则（前两条是安全边界，后两条是账面纪律）：
 *   1) 信封里**不留鉴权头**：Key 只在发送的那一刻注入，落库的是「怎么问」，不是「拿什么问」；
 *   2) 只留**可重放通道**（同步出图这类「一次调用就给成品」的渠道）：任务制通道有上游任务号，
 *      归补取件管（generation-recovery），对着提交信封重放只会在上游多建一个任务、多收一次钱；
 *   3) 补发有预算（默认每单 1 次）：宁可多付一次上游，也不接受「付一次、图上谁都没有」；
 *   4) 有人正在调（信封很新）或有调用在飞时一律不补发。
 */

/** 超过这个体积的请求体不留信复（几十 MB 的素材信封留在磁盘上不划算，宁可这一单不补发） */
export const MAX_ENVELOPE_BODY_BYTES = 64 * 1024 * 1024;

/** 任务开跑多久之后才考虑补发：给还在飞的那次调用留出「登记进登记簿 / 自己结束」的时间 */
export const RESEND_AFTER_MS = 120_000;

/** 信封比这个还新，说明有人正在调（例如任务制通道每 3 秒一次轮询），不补发 */
export const ENVELOPE_FRESH_MS = 120_000;

/** 信封的存活上限：比这更老的信封不再重放（任务真挂着的话，清扫已经接手了） */
export const MAX_ENVELOPE_AGE_MS = 60 * 60 * 1000;

/** 每单补发次数上限（默认值；可按渠道用环境变量放大，但要清楚这是拿钱换确定性） */
export const DEFAULT_MAX_RESEND_ATTEMPTS = 1;

/** 一次补发扫描最多处理几条任务（补发本身要等上游，不能一次拖住整个扫描） */
export const DEFAULT_RESEND_LIMIT = 2;
export const MAX_RESEND_LIMIT = 5;

/**
 * 「哪些渠道可以补发 / 可以交给服务端执行」的白名单。
 * 按**主机名**而不是渠道标签来配：线上 `ProviderCredential.provider` 存的是协议标签
 * （openai / gemini / aigccc），多条渠道共用同一个标签（ggwk1 与 apimart 都是 openai），
 * 只按标签配会把任务制通道一起放进重放名单 —— 那正好是这套机制最不该碰的一类。
 * 标签仍作为可选项保留（aigccc 这类网关确实靠标签区分）。
 *
 * **空名单 = 谁都不放行**：这是拿钱换确定性的开关，宁可什么都不做，也不默认对所有渠道生效。
 */
export type ChannelMatcher = {
    hosts: string[];
    providers: string[];
};

/** 渠道标签/主机名统一小写去空白（比较时一律用这个口径） */
export function normalizeProvider(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

export function resolveChannelMatcher(rawHosts: unknown, rawProviders: unknown): ChannelMatcher {
    const split = (value: unknown) =>
        String(value ?? "")
            .split(",")
            .map((item) => normalizeProvider(item))
            .filter(Boolean);
    return { hosts: split(rawHosts), providers: split(rawProviders) };
}

/** 从地址里取主机名（取不到返回空串：拿不准就当不匹配） */
export function hostOf(url: unknown): string {
    try {
        return normalizeProvider(new URL(String(url ?? "")).hostname);
    } catch {
        return "";
    }
}

/** 主机名是否命中白名单条目（精确相等或其子域，禁止子串匹配：`evil-ggwk1.online` 不算） */
export function isHostMatch(host: string, base: string): boolean {
    if (!host || !base) return false;
    return host === base || host.endsWith(`.${base}`);
}

/** 这次调用所在的渠道是否在名单里（主机名优先，其次渠道标签；名单为空一律不匹配） */
export function matchesChannel(channel: { url?: unknown; provider?: unknown }, matcher: ChannelMatcher): boolean {
    const host = hostOf(channel.url);
    if (host && matcher.hosts.some((base) => isHostMatch(host, base))) return true;
    const provider = normalizeProvider(channel.provider);
    return Boolean(provider) && matcher.providers.includes(provider);
}

export type ReplayConfig = ChannelMatcher & {
    /** 每单补发上限 */
    maxAttempts: number;
};

/**
 * 信封在任务记录里的位置。
 *   - primary  —— 这次真正发出的请求（补发重放的就是它）；
 *   - fallback —— 提交时就备好的改道方案（例如「编辑端点不吃这个模型」时改走的生成端点信封），
 *     上游拒收时才用得上，所以它只是备用，不参与补发扫描。
 */
export type EnvelopeSlot = "primary" | "fallback";

export function envelopeKey(slot: EnvelopeSlot): string {
    return slot === "fallback" ? "upstreamEnvelopeFallback" : "upstreamEnvelope";
}

/**
 * 环境变量视图：Next 的 `ProcessEnv` 没有索引签名，直接把 `process.env` 传给
 * 「只认某几个键」的结构化参数会报「no properties in common」，所以统一从这里取。
 * 纯函数仍以入参为准，单测照旧可以直接传一份环境变量进来。
 */
export type EnvLike = { [key: string]: string | undefined };

export function readEnv(): EnvLike {
    return process.env as unknown as EnvLike;
}

/** 读运维配置：可重放渠道（主机名/标签）、补发上限。默认「谁都不重放」，要显式打开。 */
export function resolveReplayConfig(env: EnvLike = readEnv()): ReplayConfig {
    const matcher = resolveChannelMatcher(env.SERVER_REPLAY_HOSTS, env.SERVER_REPLAY_PROVIDERS);
    const raw = Number(env.SERVER_REPLAY_MAX_ATTEMPTS);
    const maxAttempts = Number.isFinite(raw) && raw >= 0 ? Math.min(5, Math.floor(raw)) : DEFAULT_MAX_RESEND_ATTEMPTS;
    return { ...matcher, maxAttempts };
}

/**
 * 留信封的形态。
 *
 * `origin` 区分两种用途：
 *   - `live`  —— 浏览器在等的那次调用（阶段 1：只在进程死掉后用于补发）；
 *   - `defer` —— 服务端替浏览器执行的那次调用（阶段 2：主路径本身就是服务端在跑）。
 */
export type UpstreamEnvelope = {
    url: string;
    method: string;
    /** 发往上游的非鉴权头（含 x-sf-provider / x-sf-model），鉴权头在发送那一刻注入 */
    headers: Record<string, string>;
    /** 请求体的 content-type（multipart 时含 boundary），重放时要原样带上 */
    contentType?: string;
    /** 平台渠道标签与模型：重放时据此重新解析凭证、重新签发鉴权头（Key 会轮换，不能存 Key） */
    provider?: string;
    model?: string;
    /** 请求体在 spool 目录里的键；没有请求体（GET 等）时为空 */
    spoolKey?: string;
    /** 请求体字节数 */
    bodyBytes: number;
    origin: "live" | "defer";
    savedAt: number;
};

// ---------- 阶段 2：服务端替浏览器执行（主路径）----------
//
// 与「可重放通道」是同一个判据：一次调用就给成品的同步渠道。
// 任务制通道不能走这里 —— 它的成品要靠轮询取件（提交应答里只有任务号），
// 让服务端执行提交、却没人去轮询，用户就白等一场。

export type ServerRunPolicy = ChannelMatcher & { enabled: boolean };

/**
 * 服务端执行开关。默认**关闭**：这是把整条生成链路换个主人，必须由运维显式打开，
 * 而且随时可以一个环境变量改回旧路径（客户端不用改、也不用重新部署）。
 */
export function resolveServerRunPolicy(env: EnvLike = readEnv()): ServerRunPolicy {
    const enabled = /^(1|true|on|yes)$/i.test(String(env.SERVER_RUN_GENERATION ?? "").trim());
    return { enabled, ...resolveChannelMatcher(env.SERVER_RUN_HOSTS, env.SERVER_RUN_PROVIDERS) };
}

/**
 * 这次调用能不能交给服务端执行（拿不准一律返回 false = 走老路径）。
 *
 * 白名单为空时**一律不放行**（与补发同一口径）：能交给服务端执行的只有「一次调用就给成品」
 * 的同步渠道，而这类判据无法从请求本身看出来 —— 任务制通道的提交应答里只有任务号，
 * 没人轮询就等于让用户白等一场。所以只放行运维显式点名的渠道。
 */
export function canRunOnServer(input: { policy: ServerRunPolicy; provider?: unknown; url?: unknown; stream?: unknown; responseType?: unknown; hasJobId: boolean }): boolean {
    if (!input.policy.enabled) return false;
    if (!input.hasJobId) return false;
    if (input.stream === true) return false;
    if (input.responseType === "blob") return false;
    return matchesChannel({ url: input.url, provider: input.provider }, input.policy);
}

/** 这个渠道的请求能不能重放（一次调用就给成品的那类同步渠道） */
export function isReplayChannel(channel: { url?: unknown; provider?: unknown }, config: ReplayConfig): boolean {
    return matchesChannel(channel, config);
}

/**
 * 这条请求值不值得留信封。
 *
 * 只留「会产出成品、且重放有意义」的：流式对话、纯文本/工具调用既没有成品，也不该被重放；
 * 成品下载（responseType=blob）重放一次也变不出新东西。
 * 体积超限的（超大素材信封）同样不留：留着也发不出去，不如让这一单走补取件/清扫的老路。
 */
export function shouldPersistEnvelope(input: { stream?: boolean; hasJobId: boolean; bodyBytes: number; method?: string; responseType?: unknown }): boolean {
    if (!input.hasJobId) return false;
    if (input.stream === true) return false;
    if (input.responseType === "blob") return false;
    if (input.bodyBytes > MAX_ENVELOPE_BODY_BYTES) return false;
    return true;
}

/** 这条请求体要落在磁盘上（而不是塞进数据库的 JSON 字段里） */
export function shouldSpoolBody(bodyBytes: number): boolean {
    return bodyBytes > 0;
}

/** 信封能不能用：地址/方法齐全、年龄没超上限。字段缺一个就当没有信封，不做半截重放。 */
export function isEnvelopeReplayable(envelope: UpstreamEnvelope | null | undefined, now = Date.now()): boolean {
    if (!envelope) return false;
    if (typeof envelope.url !== "string" || !/^https?:\/\//i.test(envelope.url)) return false;
    if (typeof envelope.method !== "string" || !envelope.method.trim()) return false;
    const savedAt = Number(envelope.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return false;
    return now - savedAt <= MAX_ENVELOPE_AGE_MS;
}

/** 信封是不是「刚刚有人调用过」（有调用在飞或客户端还在轮询时用它挡掉补发） */
export function isEnvelopeFresh(envelope: UpstreamEnvelope | null | undefined, now = Date.now()): boolean {
    const savedAt = Number(envelope?.savedAt);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return false;
    return now - savedAt < ENVELOPE_FRESH_MS;
}

export type ResendSkipReason = "not-running" | "has-artifact" | "no-envelope" | "envelope-fresh" | "call-in-flight" | "upstream-task-known" | "channel-not-replayable" | "budget-spent" | "too-early" | "envelope-too-old";

/** 补发已经彻底没戏的跳过原因（信封没了、渠道不让补发、预算用完、信封过期）：这时候才该按失败结账 */
export const TERMINAL_SKIP_REASONS: ResendSkipReason[] = ["not-running", "has-artifact", "no-envelope", "upstream-task-known", "channel-not-replayable", "budget-spent", "envelope-too-old"];

export type ResendDecision = { resend: true } | { resend: false; reason: ResendSkipReason };

/**
 * 这条任务**还有没有补发的机会**（不看时间窗口，只看「这条路还通不通」）。
 *
 * 与 decideResend 的分工：decideResend 回答「现在这一刻该不该发」（还带时间与新鲜度），
 * 这个函数回答「这一单还有没有人能把它带回来」。
 * 结账侧要的是后者 —— 客户端在部署重启后立刻报失败时，进程内的「在飞登记簿」已经空了
 * （新进程什么都没登记），可服务端手上明明还留着一份可以重放的信封：
 * 若这时候照旧判失败退款，补发就永远等不到一条 running 的任务（2026-09-18 的教训正是如此：
 * 客户端那句「失败」跑赢了真相）。所以只要补发还有机会，就先别结账。
 */
export function hasResendPending(input: { status: string | null | undefined; hasArtifact: boolean; envelope: UpstreamEnvelope | null | undefined; attempts: number; externalId?: string | null; provider?: string | null; config: ReplayConfig }): boolean {
    if (input.status !== "running") return false;
    if (input.hasArtifact) return false;
    if (input.externalId) return false;
    if (!isEnvelopeReplayable(input.envelope)) return false;
    if (!isReplayChannel({ url: input.envelope?.url, provider: input.provider ?? input.envelope?.provider }, input.config)) return false;
    return input.attempts < input.config.maxAttempts;
}

/**
 * 这条任务此刻该不该补发。规则全部收在这里，扫描只负责照着执行。
 *
 * 顺序刻意如此：先排除「没有补发必要」的（任务已结、成品已在手），
 * 再排除「补发有害」的（有人正在调、有上游任务号 = 该走补取件），
 * 最后才是预算与时间窗口。
 */
export function decideResend(input: {
    status: string | null | undefined;
    hasArtifact: boolean;
    envelope: UpstreamEnvelope | null | undefined;
    attempts: number;
    startedAt: number | string | Date | null | undefined;
    /** 上游任务号在手上：那不是同步通道，重放提交只会在上游多建一个任务 */
    externalId?: string | null;
    /** 此刻有没有属于这条任务的调用在飞（进程内登记簿） */
    inFlight: boolean;
    /** 渠道标签（任务记录上的，作为主机名之外的第二判据） */
    provider?: string | null;
    config: ReplayConfig;
    now?: number;
    /** 覆盖「开跑多久才允许补发」，测试与运维用 */
    resendAfterMs?: number;
}): ResendDecision {
    const now = input.now ?? Date.now();
    if (input.status !== "running") return { resend: false, reason: "not-running" };
    if (input.hasArtifact) return { resend: false, reason: "has-artifact" };
    if (!isEnvelopeReplayable(input.envelope, now)) return { resend: false, reason: "no-envelope" };
    if (isEnvelopeFresh(input.envelope, now)) return { resend: false, reason: "envelope-fresh" };
    if (input.inFlight) return { resend: false, reason: "call-in-flight" };
    if (input.externalId) return { resend: false, reason: "upstream-task-known" };

    if (!isReplayChannel({ url: input.envelope?.url, provider: input.provider ?? input.envelope?.provider }, input.config)) return { resend: false, reason: "channel-not-replayable" };
    if (input.attempts >= input.config.maxAttempts) return { resend: false, reason: "budget-spent" };

    const startedAt = toMillis(input.startedAt);
    const resendAfterMs = Number.isFinite(Number(input.resendAfterMs)) ? Number(input.resendAfterMs) : RESEND_AFTER_MS;
    if (!Number.isFinite(startedAt) || startedAt <= 0) return { resend: false, reason: "too-early" };
    if (now - startedAt < resendAfterMs) return { resend: false, reason: "too-early" };

    return { resend: true };
}

/** 任务记录里读得出的补发状态（metadata.resend） */
export type ResendState = { attempts: number; lastAt?: number; lastError?: string };

export function readResendState(metadata: unknown): ResendState {
    const record = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
    const resend = (record.resend && typeof record.resend === "object" ? record.resend : {}) as Record<string, unknown>;
    const attempts = Number(resend.attempts);
    return {
        attempts: Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0,
        lastAt: Number.isFinite(Number(resend.lastAt)) ? Number(resend.lastAt) : undefined,
        lastError: typeof resend.lastError === "string" ? resend.lastError : undefined,
    };
}

/** 任务记录里读得出的信封（metadata.upstreamEnvelope / upstreamEnvelopeFallback）；结构不认识就当作没有 */
export function readEnvelope(metadata: unknown, slot: EnvelopeSlot = "primary"): UpstreamEnvelope | null {
    const record = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
    const raw = record[envelopeKey(slot)];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const envelope = raw as Record<string, unknown>;
    return {
        url: String(envelope.url ?? ""),
        method: String(envelope.method ?? ""),
        headers: (envelope.headers && typeof envelope.headers === "object" && !Array.isArray(envelope.headers) ? envelope.headers : {}) as Record<string, string>,
        contentType: typeof envelope.contentType === "string" ? envelope.contentType : undefined,
        provider: typeof envelope.provider === "string" ? envelope.provider : undefined,
        model: typeof envelope.model === "string" ? envelope.model : undefined,
        spoolKey: typeof envelope.spoolKey === "string" ? envelope.spoolKey : undefined,
        bodyBytes: Number(envelope.bodyBytes) || 0,
        origin: envelope.origin === "defer" ? "defer" : "live",
        savedAt: Number(envelope.savedAt) || 0,
    };
}

/** 成品是不是已经在手上（认领过、归档过都算）：有的话就没有补发的必要了 */
export function hasKeptArtifact(resultData: unknown): boolean {
    const items = (resultData && typeof resultData === "object" ? (resultData as { items?: unknown }).items : undefined) ?? (Array.isArray(resultData) ? resultData : undefined);
    if (!Array.isArray(items)) return false;
    return items.some((item) => Boolean(item && typeof item === "object" && typeof (item as { archiveKey?: unknown }).archiveKey === "string"));
}

/** 上游渠道标签：优先用调用方显式声明的，其次从平台凭证解析出来的 */
export function pickProviderLabel(explicit: unknown, resolved?: string | null): string {
    const label = normalizeProvider(explicit);
    return label || normalizeProvider(resolved);
}

function toMillis(value: number | string | Date | null | undefined): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    if (typeof value === "string") return new Date(value).getTime();
    return 0;
}
