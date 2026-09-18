import { NextRequest, NextResponse } from "next/server";

import { inflightJobCount, inflightJobIds } from "@/lib/generation/upstream-inflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 在飞登记簿的诊断入口（内部，worker 密钥）。
 *
 * 为什么需要它：登记簿是进程内状态，而 Next 的服务端构建给每个路由各打一份 bundle ——
 * 「代理路由写进去的登记，补发路由读不读得到」只能从**另一个路由**去问。
 * 2026-09-19 那次「补发与服务端执行撞车、上游多收一次钱」就是靠这个视角定位的。
 * 正常返回形如 `{"count":1,"jobs":["cmu..."]}`。
 */
export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });
    return NextResponse.json({ count: inflightJobCount(), jobs: inflightJobIds() }, { headers: { "Cache-Control": "no-store" } });
}
