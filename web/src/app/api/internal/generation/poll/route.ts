import { NextRequest, NextResponse } from "next/server";
import { pollReplicateJobs } from "@/lib/generation/replicate-poller.server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const result = await pollReplicateJobs();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
