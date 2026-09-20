/**
 * 上游端点形态白名单 —— 代理路由只放行「我们产品真的会用到」的上游端点（2026-09-20）。
 *
 * 背景（安全审计 H1）：代理路由原先只校验「目标与平台凭证同源」，不做任何路径限制，
 * 且 jobId 是可选的。两件事合起来就是一条免费通道 ——
 * 扣费只发生在 beginGenerationJob（建任务那一刻），代理层全程不碰积分，
 * 所以「不建任务、直接拿登录 Cookie 打 /api/proxy」既不扣积分、也不受并发上限约束，
 * 更没有任何限速：任意登录用户都能让服务端注入平台 Key、拿我们的账号去出图出片。
 *
 * 这里把「什么端点允许打」钉成一张表，分两类：
 *   - generate：会产出成品、上游按次计费的调用 → 必须挂本人 running 的生成任务（见 proxy-access.server.ts）
 *   - read：取件、轮询、模型列表、素材上传 → 免任务（它们不产生新的上游生成计费）
 *
 * 表里没有的形态一律拒绝（含 PUT/PATCH/DELETE 与未知 POST 路径）。失败方向故意选「拒绝」：
 * 漏放一个新端点只是少一个功能（而且回归门禁会盯着 fixtures），
 * 放过一个任意路径就是把平台 Key 交出去。
 *
 * 纯函数模块：不碰数据库、不读环境以外的外部状态，便于在 Node 下直接单测。
 */

export type UpstreamEndpointClass = "generate" | "read";

type EndpointRule = {
    method: "GET" | "POST";
    /** 匹配 URL 的 pathname（不含查询串）。各渠道 baseUrl 前缀不一（/v1、/v3、/api/plan/v3…），
     *  所以一律只锚定**尾部**形态、不锚定前缀 —— 这是当年 H3 误伤（前缀校验把合法请求 403）的教训。 */
    pattern: RegExp;
    kind: UpstreamEndpointClass;
    /** 日志与报错里的中文名，出问题时能一眼看出拦的是哪条链路 */
    label: string;
    /** 一份「确实会命中本规则」的样例路径：fixtures 与单测直接用它，
     *  正则一旦被改坏，样例先失败（不让白名单悄悄失效） */
    sample: string;
};

/**
 * 端点表。**新增上游端点的唯一入口**：产品里每多一条上游调用形态就要在这里加一行，
 * 否则线上会被 403（回归门禁 assertUpstreamEndpointPolicy 会先一步拦下来）。
 *
 * sample 一律带 `/v1` 前缀：真实渠道的 baseUrl 多数自带 /v1（或 /v3、/api/plan/v3），
 * 拼接后的 pathname 因此长这样 —— 样例必须贴近线上形态，否则等于没验。
 */
const ENDPOINT_RULES: readonly EndpointRule[] = [
    // —— 生成类：上游会计费，必须挂本人的 running 任务 ——
    { method: "POST", pattern: /(?:^|\/)chat\/completions$/, kind: "generate", label: "文本/工具轮次", sample: "/v1/chat/completions" },
    { method: "POST", pattern: /(?:^|\/)images\/(?:generations|edits)$/, kind: "generate", label: "出图/参考图生图", sample: "/v1/images/generations" },
    { method: "POST", pattern: /(?:^|\/)audio\/speech$/, kind: "generate", label: "语音合成", sample: "/v1/audio/speech" },
    { method: "POST", pattern: /(?:^|\/)videos$/, kind: "generate", label: "视频任务创建", sample: "/v1/videos" },
    { method: "POST", pattern: /(?:^|\/)videos\/generations$/, kind: "generate", label: "视频任务创建（GenVideo）", sample: "/v1/videos/generations" },
    { method: "POST", pattern: /(?:^|\/)v2\/video_generation$/, kind: "generate", label: "视频任务创建（MiniMax）", sample: "/v2/video_generation" },
    { method: "POST", pattern: /(?:^|\/)contents\/generations\/tasks$/, kind: "generate", label: "视频任务创建（Seedance）", sample: "/api/v3/contents/generations/tasks" },
    { method: "POST", pattern: /(?:^|\/)api\/external\/v1\/video\/task\/create$/, kind: "generate", label: "视频任务创建（Aigccc）", sample: "/api/external/v1/video/task/create" },
    { method: "POST", pattern: /(?:^|\/)models\/[^/]+\/[^/]+\/predictions$/, kind: "generate", label: "预测任务（Replicate）", sample: "/v1/models/black-forest-labs/flux-1.1-pro/predictions" },
    { method: "POST", pattern: /(?:^|\/)models\/[^/]+:(?:generateContent|streamGenerateContent)$/, kind: "generate", label: "内容生成（Gemini）", sample: "/v1beta/models/gemini-3-pro-image:generateContent" },
    // —— 读取类：不产生新的上游生成计费 ——
    { method: "POST", pattern: /(?:^|\/)api\/external\/v1\/video\/task\/status$/, kind: "read", label: "任务状态查询（Aigccc）", sample: "/api/external/v1/video/task/status" },
    { method: "POST", pattern: /(?:^|\/)api\/external\/v1\/image\/upload\/batch$/, kind: "read", label: "素材上传（Aigccc）", sample: "/api/external/v1/image/upload/batch" },
    { method: "POST", pattern: /(?:^|\/)files$/, kind: "read", label: "素材上传（Replicate）", sample: "/v1/files" },
];

/** 产品实际用到的读取类路径（GET）：取件、轮询、模型列表。表里不写正则 —— GET 一律算读取。 */
const READ_SAMPLES: readonly string[] = ["/v1/tasks/abc123", "/v1/videos/vid_1/content", "/v1/models", "/v2/query/video_generation/abc123"];

/**
 * 判定一次上游调用的形态。返回 null = 不在白名单里，调用方应当直接拒绝。
 *
 * GET 一律算读取：产品用到的 GET 只有取件、轮询与模型列表，
 * 都带不上请求体、也换不出一次新的上游计费（滥用面只是「用我们的 Key 读数据」，由限速兜着）。
 */
export function resolveUpstreamEndpointClass(method: string, pathname: string): UpstreamEndpointClass | null {
    const normalized = String(method || "").toUpperCase();
    if (normalized === "GET") return "read";
    for (const rule of ENDPOINT_RULES) {
        if (rule.method === normalized && rule.pattern.test(pathname)) return rule.kind;
    }
    return null;
}

/** 命中的端点中文名（日志与报错用）。未命中返回空串。 */
export function describeUpstreamEndpoint(method: string, pathname: string): string {
    const normalized = String(method || "").toUpperCase();
    for (const rule of ENDPOINT_RULES) {
        if (rule.method === normalized && rule.pattern.test(pathname)) return rule.label;
    }
    return normalized === "GET" ? "读取（取件/轮询/模型列表）" : "";
}

/**
 * 端点 fixtures：给单测与回归门禁共用，避免「测试里写一份路径、白名单里写另一份」的漂移。
 * 每条自带的 sample 必须命中它自己的规则，GET 样例必须都判成 read —— 单测直接断言这件事。
 */
export function listUpstreamEndpointFixtures(): ReadonlyArray<{ method: string; path: string; kind: UpstreamEndpointClass; label: string }> {
    return [
        ...ENDPOINT_RULES.map((rule) => ({ method: rule.method, path: rule.sample, kind: rule.kind, label: rule.label })),
        ...READ_SAMPLES.map((path) => ({ method: "GET", path, kind: "read" as UpstreamEndpointClass, label: "读取（取件/轮询/模型列表）" })),
    ];
}

/**
 * 模型名的比较键：**与客户端 `modelOptionName` 同一口径**。
 *
 * 客户端配置里的模型值是「渠道模型选项」，编码成 `渠道id::模型名`（分隔符见 use-config-store），
 * 建任务时记进 metadata 的是这个原始编码值，而发往上游的请求体里用的是解码后的模型名。
 * 所以比较键必须取第一个 `::` **之后**那一段 —— 取反了会把所有渠道模型判成不匹配，
 * 那等于给全部付费用户 403（2026-09-20 实现时踩到过一次，记录在此）。
 * Gemini 的路径模型名还会多一层 `models/` 前缀，一并削掉。
 */
function modelKey(model: unknown): string {
    if (typeof model !== "string") return "";
    const value = model.trim().toLowerCase();
    const index = value.indexOf("::");
    const decoded = index >= 0 ? value.slice(index + 2) : value;
    return decoded.replace(/^models\//, "").trim();
}

/**
 * 生成任务与上游请求的模型绑定。
 *
 * 任务号是生成类调用的通行证，但任务号本身不限制「打哪个模型」——
 * 一张图的积分买到的是「一条 running 任务」，若不管模型，攻击者可以拿它去打渠道里任意贵的模型。
 * 这里要求请求里的模型与任务记录里的模型「同族」：比较键相等，或一方是另一方的路径后缀
 * （Replicate 的 `owner/name` 与裸名、Gemini 的 `models/x` 与 `x` 都属于这类写法差异）。
 *
 * 偏容错是刻意的：误判成「不匹配」会 403 掉付费用户的正常生成，而放宽一点只是允许同一模型族的写法差异。
 * 任一侧取不到模型名时一律放行 —— 这一层只管「绑没绑住模型」，任务门闸本身不受影响。
 */
export function isModelBoundToJob(jobModel: unknown, requestModel: unknown): boolean {
    const job = modelKey(jobModel);
    const request = modelKey(requestModel);
    if (!job || !request) return true;
    return job === request || job.endsWith(`/${request}`) || request.endsWith(`/${job}`);
}

/** 从请求体里读模型名（JSON 信封用；form-data 走单独的入参） */
export function readModelFromBody(body: unknown): string {
    if (!body || typeof body !== "object") return "";
    const model = (body as { model?: unknown }).model;
    return typeof model === "string" ? model.trim() : "";
}

/** 模型写在路径里的两条链路的兜底：Gemini（models/{model}:action）与 Replicate（models/{owner}/{name}/predictions） */
export function readModelFromPathname(pathname: string): string {
    const gemini = pathname.match(/\/models\/([^/]+):(?:generateContent|streamGenerateContent)$/);
    if (gemini) return decodeURIComponent(gemini[1]);
    const replicate = pathname.match(/\/models\/([^/]+)\/([^/]+)\/predictions$/);
    if (replicate) return `${decodeURIComponent(replicate[1])}/${decodeURIComponent(replicate[2])}`;
    return "";
}

/**
 * 单条任务允许发起多少次生成类调用。
 *
 * 任务号能反复使用，所以「付一次钱、打 N 次上游」是可行攻击：
 * 必须给每条任务一个调用预算（见 upstream-call-budget.ts）。
 * 预算跟着任务上的张数走：Gemini 出图是一张一次调用（count 次 POST），
 * 多出的余量留给两条既有重试 —— 「上游按画幅拒收后换比例重投」与「编辑端点改道生成端点」。
 */
export function resolveJobCallBudget(kind: unknown, count: unknown): number {
    const normalizedKind = typeof kind === "string" ? kind.trim() : "";
    const normalizedCount = Math.max(1, Math.min(50, Math.floor(Number(count) || 1)));
    if (normalizedKind === "image") return normalizedCount + 2;
    return 3;
}

export type ProxyJobGate = { enabled: boolean };

type EnvLike = Record<string, string | undefined>;

/**
 * 生成类调用的任务门闸开关。**默认开着**，`PROXY_JOB_GATE=off` 可一键关掉。
 *
 * 为什么留这个开关：门闸要求「生成类调用必须带本人 running 的任务号」，
 * 一旦某条链路漏传任务号（视频/文本/音频的传参在 2026-09-20 才补齐），
 * 线上表现就是那条链路整条 403。出事时的处置要能是一条环境变量 + pm2 restart，
 * 而不是重新构建部署（与 SERVER_RUN_GENERATION 同一套取舍）。
 * 关掉它只放开任务/模型/预算三项要求，端点白名单与限速仍然生效。
 */
export function resolveProxyJobGate(env: EnvLike = process.env as unknown as EnvLike): ProxyJobGate {
    const raw = String(env.PROXY_JOB_GATE ?? "").trim();
    return { enabled: !/^(0|off|false|no)$/i.test(raw) };
}
