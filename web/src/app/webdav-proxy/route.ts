import { NextRequest } from "next/server";
import { assertAllowedProxyUrl } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBDAV_PROXY_TIMEOUT_MS = 120000;

export async function POST(request: NextRequest) {
    const target = request.headers.get("x-webdav-target") || "";
    const method = (request.headers.get("x-webdav-method") || "GET").toUpperCase();
    if (!target) return new Response("Missing x-webdav-target", { status: 400 });

    // SSRF 防护：拒绝内网/本机/保留地址
    let url: URL;
    try {
        url = await assertAllowedProxyUrl(target);
    } catch (error) {
        return new Response(error instanceof Error ? error.message : "Invalid x-webdav-target", { status: 400 });
    }

    const headers = new Headers();
    copyHeader(request, headers, "x-webdav-authorization", "Authorization");
    copyHeader(request, headers, "x-webdav-depth", "Depth");
    copyHeader(request, headers, "x-webdav-destination", "Destination");
    copyHeader(request, headers, "x-webdav-overwrite", "Overwrite");
    copyHeader(request, headers, "x-webdav-content-type", "Content-Type");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBDAV_PROXY_TIMEOUT_MS);
    try {
        const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
        console.log(`[webdav-proxy] ${method} ${url.href} ${body?.byteLength || 0}B`);
        const response = await fetch(url, { method, headers, body: body?.byteLength ? body : undefined, signal: controller.signal });
        console.log(`[webdav-proxy] ${method} ${url.href} -> ${response.status}`);
        return new Response(method === "HEAD" ? null : response.body, {
            status: response.status,
            headers: responseHeaders(response.headers),
        });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return new Response("WebDAV proxy timeout", { status: 504 });
        return new Response(error instanceof Error ? error.message : "WebDAV proxy error", { status: 502 });
    } finally {
        clearTimeout(timer);
    }
}

function copyHeader(request: NextRequest, headers: Headers, from: string, to: string) {
    const value = request.headers.get(from);
    if (value) headers.set(to, value);
}

function responseHeaders(headers: Headers) {
    const result = new Headers();
    ["content-type", "etag", "last-modified", "dav"].forEach((key) => {
        const value = headers.get(key);
        if (value) result.set(key, value);
    });
    return result;
}
