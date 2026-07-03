// POST /api/proxy — 通用 API 代理，解决 CORS 和 URL 构建问题
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, method = "POST", headers = {}, body, responseType } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
    }

    // 构建请求
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...headers,
      },
    };

    if (body) {
      if (typeof body === "string") {
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
        if (!headers["Content-Type"]) {
          (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
        }
      }
    }

    const response = await fetch(url, fetchOptions);

    // 流式响应（视频下载等）
    if (responseType === "blob") {
      const blob = await response.arrayBuffer();
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
          "Content-Length": String(blob.byteLength),
        },
      });
    }

    // JSON 响应
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "代理请求失败";
    console.error("[proxy]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
