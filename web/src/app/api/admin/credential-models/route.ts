import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { getPlatformCredentialSecret, isCredentialTargetAllowed, platformAuthHeaders } from "@/lib/credential-store.server";
import { fetchSafely } from "@/lib/url-safety";

/**
 * 「拉取上游模型」——用配置好的 Key 去问上游「你到底支持哪些模型 id」，供后台一键加入「绑定模型」。
 *
 * 为什么要有这个接口（2026-09-19）：
 *   有凭证把「展示名」当模型名填进了绑定模型（DeepSeek-V4.1-Flash），请求原样转发上游后
 *   上游直接 400：`The supported API model names are deepseek-flash, deepseek-v4-pro, but you passed ...`。
 *   模型名是上游的机器标识、不是给人看的标签，手写必错；这里把上游自己给出的 id 列出来点选，
 *   从流程上消掉「手填模型名」这一步。
 *
 * 安全边界：只允许打到该凭证 Base URL 的同源地址（isCredentialTargetAllowed），出站走 fetchSafely。
 */

type ModelEntry = { id: string; label?: string };

/** 上游 /models 的返回形状各家不一，这里把能认出来的都捞出来（OpenAI 的 data[]、裸数组、models[]） */
function collectModelIds(payload: unknown): string[] {
    const ids = new Set<string>();
    const pushFromList = (list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
            if (typeof item === "string") {
                const value = item.trim();
                if (value) ids.add(value);
                continue;
            }
            if (item && typeof item === "object") {
                const record = item as Record<string, unknown>;
                // Replicate 这类上游把仓库拆成 owner + name 两个字段（没有 id）。
                // 只取 name 会得到 "flux-schnell" 这种半截名字，粘进模型列表后请求必然 404，
                // 所以这里拼回 owner/name；有 id 的上游照旧以 id 为准。
                const owner = typeof record.owner === "string" ? record.owner.trim() : "";
                const repo = typeof record.name === "string" ? record.name.trim() : "";
                const raw = record.id ?? record.model ?? record.slug ?? (owner && repo ? `${owner}/${repo}` : repo);
                const value = typeof raw === "string" ? raw.trim() : "";
                if (value) ids.add(value);
            }
        }
    };

    if (Array.isArray(payload)) {
        pushFromList(payload);
    } else if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        pushFromList(record.data);
        // Replicate 的列表信封是 { results: [...], next, previous }，不是 data
        pushFromList(record.results);
        pushFromList(record.models);
        pushFromList(record.model_list);
        // 有些网关按类型分组：{ data: { chat: [...], image: [...] } }
        if (record.data && !Array.isArray(record.data) && typeof record.data === "object") {
            for (const value of Object.values(record.data as Record<string, unknown>)) pushFromList(value);
        }
    }
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

/** 候选端点：Base URL 已经带路径就先用它，再兜 /v1/models 与 /models */
function candidateEndpoints(baseUrl: string): string[] {
    const parsed = new URL(baseUrl);
    const path = parsed.pathname.replace(/\/+$/, "");
    const candidates = [path ? `${parsed.origin}${path}/models` : "", `${parsed.origin}/v1/models`, `${parsed.origin}/models`].filter(Boolean);
    return Array.from(new Set(candidates));
}

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const id = String(body.id || "").trim();

        // 两种用法：编辑已有凭证（用库里那把 Key）或还没保存（用表单里刚填的）
        let baseUrl = String(body.baseUrl || "").trim();
        let apiKey = String(body.apiKey || "").trim();
        let provider = String(body.provider || "").trim();
        let credentialId: string | null = null;

        if (id) {
            const credential = await getPlatformCredentialSecret(id);
            if (!credential) return NextResponse.json({ error: "找不到该凭证或密钥解密失败" }, { status: 404 });
            baseUrl = credential.baseUrl;
            apiKey = credential.apiKey;
            provider = credential.provider;
            credentialId = credential.id;
        }

        if (!baseUrl || !apiKey) return NextResponse.json({ error: "需要 Base URL 与 API Key（编辑已有凭证时请先保存 Key）" }, { status: 400 });

        let endpoints: string[];
        try {
            endpoints = candidateEndpoints(baseUrl);
        } catch {
            return NextResponse.json({ error: "Base URL 不是合法 URL" }, { status: 400 });
        }
        if (!endpoints.every((endpoint) => isCredentialTargetAllowed(baseUrl, endpoint))) {
            return NextResponse.json({ error: "只支持 https 的 Base URL（且只允许请求其同源地址）" }, { status: 400 });
        }

        const failures: string[] = [];
        for (const endpoint of endpoints) {
            let response: Response;
            try {
                response = await fetchSafely(endpoint, {
                    method: "GET",
                    headers: { ...platformAuthHeaders({ provider, apiKey }, endpoint), accept: "application/json" },
                    cache: "no-store",
                    signal: AbortSignal.timeout(20000),
                });
            } catch (error) {
                failures.push(`${endpoint} → ${(error as Error).message}`);
                continue;
            }
            if (!response.ok) {
                failures.push(`${endpoint} → HTTP ${response.status}`);
                continue;
            }
            let payload: unknown;
            try {
                payload = await response.json();
            } catch {
                failures.push(`${endpoint} → 返回的不是 JSON`);
                continue;
            }
            const models: ModelEntry[] = collectModelIds(payload).map((modelId) => ({ id: modelId }));
            if (!models.length) {
                failures.push(`${endpoint} → 未解析到任何模型 id`);
                continue;
            }
            return NextResponse.json({ models, endpoint, credentialId, provider });
        }

        return NextResponse.json({ error: "上游没有返回模型列表", detail: failures.join("；"), tried: endpoints }, { status: 502 });
    } catch (error) {
        console.error("[admin/credential-models:post]", error);
        return NextResponse.json({ error: "拉取上游模型失败" }, { status: 500 });
    }
}
