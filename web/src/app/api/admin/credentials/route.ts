import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { createPlatformCredential, deletePlatformCredential, listPlatformCredentials, updatePlatformCredential } from "@/lib/credential-store.server";

// admin 平台密钥管理（ProviderCredential）
// GET  → 列表（Key 脱敏）
// POST → 新增
// PATCH → 更新（apiKey 可选，留空不换）
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

        const credential = await createPlatformCredential({ name, provider, baseUrl, apiKey, models, enabled, priority });
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

        const patch: Parameters<typeof updatePlatformCredential>[1] = {};
        if (body.name !== undefined) patch.name = String(body.name);
        if (body.provider !== undefined) patch.provider = String(body.provider);
        if (body.baseUrl !== undefined) patch.baseUrl = String(body.baseUrl);
        if (body.apiKey !== undefined) patch.apiKey = String(body.apiKey);
        if (body.models !== undefined) patch.models = Array.isArray(body.models) ? body.models.map((m: unknown) => String(m).trim()).filter(Boolean) : [];
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
