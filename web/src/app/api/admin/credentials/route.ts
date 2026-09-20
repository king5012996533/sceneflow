import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { clearCredentialCircuit } from "@/lib/credential-health.server";
import { createPlatformCredential, deletePlatformCredential, listPlatformCredentials, updatePlatformCredential } from "@/lib/credential-store.server";
import { sanitizeCapabilities, sanitizePricing } from "@/lib/model-capability-spec";

// admin 平台密钥管理（ProviderCredential）
// GET  → 列表（Key 脱敏，含渠道健康字段）
// POST → 新增
// PATCH → 更新（apiKey 可选，留空不换；换 Key 会自动解除熔断）
//         { id, resetHealth: true } = 「立即重试」，手动解除熔断不等窗口到期
// DELETE → 删除

export async function GET(req: NextRequest) {
    try {
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const credentials = await listPlatformCredentials();
        return NextResponse.json({ credentials });
    } catch (error) {
        console.error("[admin/credentials:get]", error);
        return NextResponse.json({ error: "获取平台密钥失败" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const name = String(body.name || "").trim();
        const provider = String(body.provider || "").trim();
        const baseUrl = String(body.baseUrl || "").trim();
        const apiKey = String(body.apiKey || "").trim();
        const models = Array.isArray(body.models) ? body.models.map((m: unknown) => String(m).trim()).filter(Boolean) : [];
        const capabilities = sanitizeCapabilities(body.capabilities) ?? {};
        const pricing = sanitizePricing(body.pricing) ?? {};
        const enabled = body.enabled !== false;
        const priority = Number.isFinite(Number(body.priority)) ? Math.max(0, Math.floor(Number(body.priority))) : 0;

        if (!name || !provider || !baseUrl || !apiKey) {
            return NextResponse.json({ error: "名称、供应商、Base URL、API Key 均为必填" }, { status: 400 });
        }
        try {
            new URL(baseUrl);
        } catch {
            return NextResponse.json({ error: "Base URL 不是合法 URL" }, { status: 400 });
        }

        const credential = await createPlatformCredential({ name, provider, baseUrl, apiKey, models, capabilities, pricing, enabled, priority });
        return NextResponse.json({ credential: { ...credential, keyEnc: undefined } });
    } catch (error) {
        console.error("[admin/credentials:post]", error);
        return NextResponse.json({ error: "新增平台密钥失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

        // 「立即重试」：把熔断窗口收掉，不等它自然到期。
        // 换好 Key 之后立刻放行一次真实调用，成则清零、败则重新开窗（判定在 credential-health.server.ts）。
        if (body.resetHealth === true) {
            if (!prisma) return NextResponse.json({ error: "数据库暂不可用" }, { status: 503 });
            await clearCredentialCircuit(id);
            const credential = await prisma.providerCredential.findUniqueOrThrow({ where: { id } });
            return NextResponse.json({ credential: { ...credential, keyEnc: undefined } });
        }

        const patch: Parameters<typeof updatePlatformCredential>[1] = {};
        if (body.name !== undefined) patch.name = String(body.name);
        if (body.provider !== undefined) patch.provider = String(body.provider);
        if (body.baseUrl !== undefined) patch.baseUrl = String(body.baseUrl);
        if (body.apiKey !== undefined) patch.apiKey = String(body.apiKey);
        if (body.models !== undefined) patch.models = Array.isArray(body.models) ? body.models.map((m: unknown) => String(m).trim()).filter(Boolean) : [];
        if (body.capabilities !== undefined) patch.capabilities = sanitizeCapabilities(body.capabilities) ?? {};
        if (body.pricing !== undefined) patch.pricing = sanitizePricing(body.pricing) ?? {};
        if (body.enabled !== undefined) patch.enabled = body.enabled !== false;
        if (body.priority !== undefined) patch.priority = Math.max(0, Math.floor(Number(body.priority)));

        const credential = await updatePlatformCredential(id, patch);
        return NextResponse.json({ credential: { ...credential, keyEnc: undefined } });
    } catch (error) {
        console.error("[admin/credentials:patch]", error);
        const status = error instanceof Error && error.message.includes("Record to update not found") ? 404 : 500;
        return NextResponse.json({ error: "更新平台密钥失败" }, { status });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const id = url.searchParams.get("id") || "";
        if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

        await deletePlatformCredential(id);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[admin/credentials:delete]", error);
        const status = error instanceof Error && error.message.includes("Record to delete does not exist") ? 404 : 500;
        return NextResponse.json({ error: "删除平台密钥失败" }, { status });
    }
}
