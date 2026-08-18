import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/ic-prisma";
import { isHostOrSubdomain } from "@/lib/url-safety";
import type { CredentialCapabilities } from "@/lib/model-capability-spec";
import type { CredentialPricing, ModelPricing } from "@/lib/credit-pricing";

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
    // 只允许「同域或目标域是凭证域的子域」；禁止反向后缀匹配（凭证域是目标域的子域），
    // 防止攻击者用父域/更短后缀骗取平台 Key（H-1）。
    return isHostOrSubdomain(targetHost, credHost);
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
 * 按目标地址匹配平台凭证。
 * 匹配策略：先按 host 匹配；多个候选时用 provider 提示消歧，再用 model 过滤；
 * 都不满足时回退到 host 匹配的最高优先级凭证。找不到返回 null。
 */
export async function resolvePlatformCredential(options: { targetUrl: string; provider?: string; model?: string }): Promise<ResolvedCredential | null> {
    if (!prisma) return null;
    const { targetUrl, provider, model } = options;

    const credentials = (await prisma.providerCredential.findMany({
        where: { enabled: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    })) as unknown as CredentialRow[];

    const hostMatched = credentials.filter((credential) => hostMatches(credential.baseUrl, targetUrl));
    if (!hostMatched.length) return null;

    // provider 提示消歧（提示与凭证标签不一致时忽略提示，不硬过滤）
    let candidates = hostMatched;
    if (provider) {
        const withProvider = hostMatched.filter((credential) => credential.provider === provider);
        if (withProvider.length) candidates = withProvider;
    }

    // model 过滤（凭证绑定了模型列表时才生效）
    const withModel = candidates.filter((credential) => modelMatches(credential.models, model));
    if (withModel.length) candidates = withModel;

    const best = candidates[0];
    try {
        return {
            id: best.id,
            name: best.name,
            provider: best.provider,
            baseUrl: best.baseUrl,
            apiKey: decryptCredentialKey(best.keyEnc),
        };
    } catch (error) {
        console.error(`[credential-store] 解密平台密钥失败（id=${best.id}）:`, (error as Error).message);
        return null;
    }
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
    if (patch.apiKey !== undefined && patch.apiKey.trim()) data.keyEnc = encryptCredentialKey(patch.apiKey.trim());
    if (Object.keys(data).length === 0) return prisma.providerCredential.findUniqueOrThrow({ where: { id } });
    return prisma.providerCredential.update({ where: { id }, data });
}

export async function deletePlatformCredential(id: string) {
    if (!prisma) throw new Error("数据库不可用");
    return prisma.providerCredential.delete({ where: { id } });
}
