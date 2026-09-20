import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/ic-prisma";
import { isHostOrSubdomain } from "@/lib/url-safety";
import { ARK_IMAGE_MAX_OUTPUTS, isArkImageBaseUrl } from "@/lib/ark-image";
import type { CredentialCapabilities } from "@/lib/model-capability-spec";
import type { CredentialPricing, ModelPricing } from "@/lib/credit-pricing";
import { isCredentialCircuitOpen, nextHealthAfterSuccess } from "@/lib/credential-health";

/**
 * 平台统一管理的上游 API 密钥库。
 *
 * - 密钥以 AES-256-GCM 加密落库，加密密钥来自 env `PLATFORM_KEY_ENCRYPTION_SECRET`
 * - 本模块仅允许在服务端使用（.server.ts 后缀 + 不导出到客户端）
 * - 客户端永远拿不到明文 Key，代理层按目标地址匹配注入
 */

type CredentialRow = {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    keyEnc: string;
    models: string[];
    capabilities: CredentialCapabilities | null;
    pricing: CredentialPricing | null;
    enabled: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    // 渠道健康（熔断）：见 credential-health.ts。窗口未到期的凭证不参与解析。
    healthFailStreak?: number | null;
    healthLastStatus?: number | null;
    healthLastFailureAt?: Date | null;
    healthLastSuccessAt?: Date | null;
    healthDownUntil?: Date | null;
    healthNote?: string | null;
};

/** 匹配结果：返回解密后的 Key 与凭证信息 */
export type ResolvedCredential = {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
};

function getEncryptionKey(): Buffer {
    const secret = process.env.PLATFORM_KEY_ENCRYPTION_SECRET;
    if (!secret) throw new Error("PLATFORM_KEY_ENCRYPTION_SECRET 未配置，无法加解密平台密钥");
    return createHash("sha256").update(secret).digest(); // 32 字节 AES-256 key
}

export function encryptCredentialKey(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredentialKey(encoded: string): string {
    const raw = Buffer.from(encoded, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskKey(key: string): string {
    if (key.length <= 10) return `${key.slice(0, 2)}****`;
    return `${key.slice(0, 6)}****${key.slice(-4)}`;
}

function extractHost(urlOrHost: string): string {
    try {
        return new URL(urlOrHost).hostname.toLowerCase();
    } catch {
        return urlOrHost
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .split("/")[0]
            .split(":")[0];
    }
}

function hostMatches(credentialBaseUrl: string, targetUrl: string): boolean {
    if (!credentialBaseUrl) return false;
    const credHost = extractHost(credentialBaseUrl);
    const targetHost = extractHost(targetUrl);
    if (!credHost || !targetHost) return false;
    return isHostOrSubdomain(targetHost, credHost);
}

export function isCredentialTargetAllowed(credentialBaseUrl: string, targetUrl: string): boolean {
    try {
        const base = new URL(credentialBaseUrl);
        const target = new URL(targetUrl);
        if (base.protocol !== "https:" || target.protocol !== "https:") return false;
        // 只校验「同源」（scheme + host + 端口），不做路径前缀限制。
        // 各渠道端点拼接规则不同：minimaxApiUrl 剥掉 baseUrl 末尾 /v1 再拼 /v2/video_generation、
        // buildApiUrl 对无 /v1 的 baseUrl 会补 /v1、seedance 走 /api/plan/v3/...，
        // 路径前缀校验会误伤合法请求（H3 曾因此被 403）。host 与凭证精确同源即不构成 Key 泄露面。
        return target.origin === base.origin;
    } catch {
        return false;
    }
}

function modelMatches(models: string[], model?: string): boolean {
    if (!model || models.length === 0) return true;
    return models.some((m) => m === model || model.startsWith(`${m}::`) || m.startsWith(`${model}::`));
}

/**
 * 按模型取后台配置的积分定价。
 * 匹配与代理解析一致（enabled 凭证，priority desc → createdAt asc），返回最高优先级凭证中该模型的定价；
 * 未配置返回 null（调用方退回内置草案）。
 */
export async function resolveConfiguredPricing(model: string): Promise<ModelPricing | null> {
    if (!prisma || !model) return null;
    const credentials = (await prisma.providerCredential.findMany({
        where: { enabled: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })) as unknown as CredentialRow[];
    for (const credential of credentials) {
        if (modelMatches(credential.models, model)) {
            const pricing = (credential.pricing ?? {}) as CredentialPricing;
            return pricing[model] ?? null;
        }
    }
    return null;
}

/**
 * 按模型取后台标定的「单次最多出几张」（只认图片模型）。
 *
 * 张数是直接乘进扣费的（creditsCost × count），而 count 由客户端发上来。面板那边虽然按
 * maxCount 收着选，但拦不住「换个模型直接点生成、压根没打开参数面板」这条路径——
 * 画布节点的默认张数是 3，换成 recraft（固定出单张）就是按 3 张扣钱、只回 1 张。
 * 匹配与定价/代理同一套规则（enabled 凭证，priority desc → createdAt asc）。
 * 没标定、或标定不是图片模型时返回 null，调用方保持原样不做限制。
 */
export async function resolveConfiguredImageMaxCount(model: string): Promise<number | null> {
    if (!prisma || !model) return null;
    const credentials = (await prisma.providerCredential.findMany({
        where: { enabled: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })) as unknown as CredentialRow[];
    for (const credential of credentials) {
        if (!modelMatches(credential.models, model)) continue;
        const capability = ((credential.capabilities ?? {}) as CredentialCapabilities)[model] as { kind?: string; maxCount?: number } | undefined;
        // 只有图片模型才有「一次几张」这回事；视频/音频的 maxCount 不适用于这里的乘算
        if (!capability || capability.kind !== "image") return null;
        // 方舟（豆包 Seedream）图片通道一次只回一张：请求体里根本不发张数（它没这个参数，
        // 组图是 sequential_image_generation，pro 不支持、本轮也没接）。所以不管后台把
        // maxCount 标成几，这里都得夹到 1 —— 标成 4 就是「按 4 张扣钱、只回 1 张」。
        // 哪天接上组图，把这一行去掉即可（口径见 lib/ark-image.ts 的 ARK_IMAGE_MAX_OUTPUTS）。
        if (isArkImageBaseUrl(credential.baseUrl)) return ARK_IMAGE_MAX_OUTPUTS;
        const maxCount = Math.floor(Number(capability.maxCount));
        return Number.isFinite(maxCount) && maxCount >= 1 ? maxCount : null;
    }
    return null;
}

/**
 * 按目标地址匹配平台凭证。
 * 匹配策略：先按 host 匹配；多个候选时用 provider 提示消歧，再用 model 过滤；
 * 都不满足时回退到 host 匹配的最高优先级凭证。找不到返回 null。
 *
 * 2026-09-20 起：熔断窗口内的凭证不参与匹配（见 credential-health.ts）。要区分
 * 「没有这个渠道」和「渠道正在维护」的调用方用 resolvePlatformCredentialDetailed ——
 * 前者是配置缺失，后者要给用户「稍后重试/换模型」的可行动提示。
 */
export async function resolvePlatformCredential(options: { targetUrl?: string; provider?: string; model?: string }): Promise<ResolvedCredential | null> {
    const result = await resolvePlatformCredentialDetailed(options);
    return result.ok ? result.credential : null;
}

export type PlatformCredentialResolution = { ok: true; credential: ResolvedCredential } | { ok: false; reason: "none" | "maintenance"; /** 熔断中的渠道名（提供给告警文案与排障） */ downNames: string[] };

export async function resolvePlatformCredentialDetailed(options: { targetUrl?: string; provider?: string; model?: string }): Promise<PlatformCredentialResolution> {
    if (!prisma) return { ok: false, reason: "none", downNames: [] };
    const { targetUrl, provider, model } = options;

    const all = (await prisma.providerCredential.findMany({
        where: { enabled: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })) as unknown as CredentialRow[];

    const usable = all.filter((credential) => !isCredentialCircuitOpen(credential));
    const down = all.filter((credential) => isCredentialCircuitOpen(credential));

    const pick = (credentials: CredentialRow[]): CredentialRow | null => {
        const hostMatched = targetUrl ? credentials.filter((credential) => hostMatches(credential.baseUrl, targetUrl)) : [];
        const providerMatched = !hostMatched.length && provider ? credentials.filter((credential) => credential.provider === provider) : [];
        const matched = hostMatched.length ? hostMatched : providerMatched;
        if (!matched.length) return null;

        // provider 提示消歧（提示与凭证标签不一致时忽略提示，不硬过滤）
        let candidates = matched;
        if (provider) {
            const withProvider = matched.filter((credential) => credential.provider === provider);
            if (withProvider.length) candidates = withProvider;
        }

        // model 过滤（凭证绑定了模型列表时才生效）
        const withModel = candidates.filter((credential) => modelMatches(credential.models, model));
        if (withModel.length) candidates = withModel;

        return candidates[0] ?? null;
    };

    const best = pick(usable);
    if (!best) {
        // 被熔断的那张本来就是这次要用的 → 报「维护中」，让调用方给出可行动提示而不是「凭证不可用」
        const downMatch = pick(down);
        return downMatch ? { ok: false, reason: "maintenance", downNames: [downMatch.name] } : { ok: false, reason: "none", downNames: [] };
    }
    try {
        return {
            ok: true,
            credential: {
                id: best.id,
                name: best.name,
                provider: best.provider,
                baseUrl: best.baseUrl,
                apiKey: decryptCredentialKey(best.keyEnc),
            },
        };
    } catch (error) {
        console.error(`[credential-store] 解密平台密钥失败（id=${best.id}）:`, (error as Error).message);
        return { ok: false, reason: "none", downNames: [] };
    }
}

/**
 * 把平台密钥写成上游要求的鉴权头。
 *
 * 各家中转站的要求不一样（Gemini 用 x-goog-api-key，aigccc 网关用 apikey，其余 Bearer），
 * 而用同一把密钥的地方有两处：代理路由（用户在浏览器里发起的请求）和超时补取件
 * （服务端自己去问上游「那个任务到底出了没有」）。规则只留这一份，
 * 免得某一处漏改之后另一边「明明配了密钥却报 Token 无效」。
 */
export function platformAuthHeaders(credential: Pick<ResolvedCredential, "provider" | "apiKey">, targetUrl: string): Record<string, string> {
    if (!credential.apiKey) return {};
    let hostname = "";
    try {
        hostname = new URL(targetUrl).hostname;
    } catch {
        hostname = "";
    }
    if (credential.provider === "gemini") return { "x-goog-api-key": credential.apiKey };
    // aigccc 网关用 ApiKey 头（非 Bearer）：按目标 host 判断，避免供应商标签漏配时误发 Bearer 导致 7002 Token 无效
    if (credential.provider === "aigccc" || isHostOrSubdomain(hostname, "aigccc666.com")) return { apikey: credential.apiKey };
    return { authorization: `Bearer ${credential.apiKey}` };
}

// —— admin CRUD（明文 Key 只在创建/更新时接收，落库前加密） ——

export type CredentialInput = {
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    models?: string[];
    /** 逐模型能力标定；空对象 = 该凭证所有模型都不做能力限制（前端退回内置默认） */
    capabilities?: CredentialCapabilities;
    /** 逐模型积分定价（图片每张 / 视频每条 / 音频每次 / 文本每次）；缺省 = 全局默认 → 内置草案 */
    pricing?: CredentialPricing;
    enabled?: boolean;
    priority?: number;
};

export async function listPlatformCredentials(): Promise<Array<Omit<CredentialRow, "keyEnc"> & { apiKeyMasked: string }>> {
    if (!prisma) return [];
    const rows = (await prisma.providerCredential.findMany({
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })) as unknown as CredentialRow[];
    return rows.map((row) => {
        const { keyEnc, ...rest } = row;
        let apiKeyMasked = "****";
        try {
            apiKeyMasked = maskKey(decryptCredentialKey(keyEnc));
        } catch {
            apiKeyMasked = "<解密失败>";
        }
        return { ...rest, apiKeyMasked };
    });
}

/**
 * 按 id 取单条凭证（含解密后的 Key），仅供服务端自己发起的出站调用使用（如「拉取上游模型名」）。
 * 不要把这个返回值直接丢进任何 HTTP 响应体。
 */
export async function getPlatformCredentialSecret(id: string): Promise<ResolvedCredential | null> {
    if (!prisma || !id) return null;
    const row = (await prisma.providerCredential.findUnique({ where: { id } })) as unknown as CredentialRow | null;
    if (!row) return null;
    try {
        return { id: row.id, name: row.name, provider: row.provider, baseUrl: row.baseUrl, apiKey: decryptCredentialKey(row.keyEnc) };
    } catch (error) {
        console.error(`[credential-store] 解密平台密钥失败（id=${id}）:`, (error as Error).message);
        return null;
    }
}

export async function createPlatformCredential(input: CredentialInput) {
    if (!prisma) throw new Error("数据库不可用");
    if (!input.apiKey.trim()) throw new Error("API Key 不能为空");
    return prisma.providerCredential.create({
        data: {
            name: input.name.trim(),
            provider: input.provider.trim(),
            baseUrl: input.baseUrl.trim(),
            keyEnc: encryptCredentialKey(input.apiKey.trim()),
            models: input.models ?? [],
            capabilities: input.capabilities ?? {},
            pricing: input.pricing ?? {},
            enabled: input.enabled ?? true,
            priority: input.priority ?? 0,
        },
    });
}

export async function updatePlatformCredential(id: string, patch: Partial<Omit<CredentialInput, "apiKey">> & { apiKey?: string }) {
    if (!prisma) throw new Error("数据库不可用");
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name.trim();
    if (patch.provider !== undefined) data.provider = patch.provider.trim();
    if (patch.baseUrl !== undefined) data.baseUrl = patch.baseUrl.trim();
    if (patch.models !== undefined) data.models = patch.models;
    if (patch.capabilities !== undefined) data.capabilities = patch.capabilities ?? {};
    if (patch.pricing !== undefined) data.pricing = patch.pricing ?? {};
    if (patch.enabled !== undefined) data.enabled = patch.enabled;
    if (patch.priority !== undefined) data.priority = patch.priority;
    if (patch.apiKey !== undefined && patch.apiKey.trim()) {
        data.keyEnc = encryptCredentialKey(patch.apiKey.trim());
        // 换了钥匙就立刻解除熔断：管理员来改 Key 正是因为上一把坏了，而熔断窗口最长半小时；
        // 不在这里清，他改完还得盯着一行「已熔断」等窗口到点（或者去点「立即重试」）。
        // 清空后由下一次真实调用判定成败——真实流量即探针。
        Object.assign(data, nextHealthAfterSuccess({}));
    }
    if (Object.keys(data).length === 0) return prisma.providerCredential.findUniqueOrThrow({ where: { id } });
    return prisma.providerCredential.update({ where: { id }, data });
}

export async function deletePlatformCredential(id: string) {
    if (!prisma) throw new Error("数据库不可用");
    return prisma.providerCredential.delete({ where: { id } });
}
