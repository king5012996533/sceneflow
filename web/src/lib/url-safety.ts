import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import ipaddr from "ipaddr.js";

/**
 * SSRF 防护：校验目标 URL 是否允许代理访问，并在连接时固定已校验的 IP（防 DNS 重绑定）。
 * 拦截：内网地址、保留地址（含 CGNAT/云元数据段、IPv4-mapped / IPv4-compatible IPv6、
 *       NAT64(64:ff9b)/6to4 内嵌 IPv4、ULA/链路本地/组播/文档前缀）、localhost、认证信息。
 */

type PinnedTarget = { url: URL; ip: string; family: number };

/** URL.hostname 对 IPv6 字面量返回 [::1]（带方括号），这里去掉括号与小写化 */
function bareHostname(hostname: string): string {
    const lower = hostname.toLowerCase();
    return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;
}

/** 去掉 IPv6 zone 标识（fe80::1%eth0 → fe80::1），zone 无法经 DNS/连接复用 */
function stripZone(address: string): string {
    const idx = address.indexOf("%");
    return idx === -1 ? address : address.slice(0, idx);
}

/** 从 IPv6 中提取内嵌的 IPv4（mapped/compatible/NAT64/6to4），非内嵌形态返回 null */
function embeddedIpv4(address: string): string | null {
    let addr: ipaddr.IPv6;
    try {
        addr = ipaddr.parse(address) as ipaddr.IPv6;
    } catch {
        return null;
    }
    if (addr.isIPv4MappedAddress()) return addr.toIPv4Address().toString();

    const b = addr.toByteArray();
    // NAT64：64:ff9b::/96（well-known）与 64:ff9b:1::/48（local-use），IPv4 在最后 32 位
    if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) {
        const localUse = b[4] === 0x00 && b[5] === 0x01 && b[6] === 0x00 && b[7] === 0x00;
        const wellKnown = b[4] === 0x00 && b[5] === 0x00 && b[6] === 0x00 && b[7] === 0x00;
        if ((localUse || wellKnown) && b[8] === 0x00 && b[9] === 0x00 && b[10] === 0x00 && b[11] === 0x00) {
            return `${b[12]}.${b[13]}.${b[14]}.${b[15]}`;
        }
    }
    // 6to4：2002::/16，IPv4 在 bytes[2..5]
    if (b[0] === 0x20 && b[1] === 0x02) {
        return `${b[2]}.${b[3]}.${b[4]}.${b[5]}`;
    }
    // IPv4-compatible：前 96 位全零（已废弃，但仍有解析器接受 ::127.0.0.1）
    if (b.slice(0, 12).every((byte) => byte === 0)) {
        return `${b[12]}.${b[13]}.${b[14]}.${b[15]}`;
    }
    return null;
}

export function isPrivateAddress(address: string): boolean {
    const cleaned = stripZone(String(address).trim().toLowerCase());
    if (cleaned === "::1") return true;

    const version = isIP(cleaned);
    if (version === 4) {
        const parts = cleaned.split(".").map((item) => Number(item));
        const [a, b] = parts;
        return (
            a === 0 || // 0.0.0.0/8
            a === 10 || // 私网 10/8
            a === 127 || // 回环 127/8
            (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64/10（含阿里云元数据 100.100.100.100）
            (a === 169 && b === 254) || // 链路本地 169.254/16（云元数据）
            (a === 172 && b >= 16 && b <= 31) || // 私网 172.16/12
            (a === 192 && b === 168) || // 私网 192.168/16
            (a === 192 && b === 0 && parts[2] === 0) || // 192.0.0.0/24
            (a === 192 && b === 0 && parts[2] === 2) || // TEST-NET-1 192.0.2.0/24
            (a === 198 && b >= 18 && b <= 19) || // 基准测试 198.18/15
            (a === 198 && b === 51 && parts[2] === 100) || // TEST-NET-2 198.51.100.0/24
            (a === 203 && b === 0 && parts[2] === 113) || // TEST-NET-3 203.0.113.0/24
            a >= 224 // 组播/保留 224/4 及以上
        );
    }

    if (version === 6) {
        // 内嵌 IPv4 的形态先还原成 IPv4 再按 IPv4 规则判断
        const embedded = embeddedIpv4(cleaned);
        if (embedded) return isPrivateAddress(embedded);

        let bytes: number[];
        try {
            bytes = (ipaddr.parse(cleaned) as ipaddr.IPv6).toByteArray();
        } catch {
            return true; // 无法解析的 IPv6 一律按内网拦截
        }
        const allZero = bytes.every((byte) => byte === 0); // ::（未指定）
        return (
            allZero ||
            (bytes[0] & 0xfe) === 0xfc || // ULA fc00::/7
            (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) || // 链路本地 fe80::/10
            bytes[0] === 0xff || // 组播 ff00::/8
            (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) || // 文档 2001:db8::/32
            (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) || // Teredo 2001::/32
            (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x02) // 基准 2001:2::/48
        );
    }

    return false; // 非 IP 字面量（主机名）不在此判断
}

export function isPrivateHostname(hostname: string) {
    const host = hostname.toLowerCase();
    return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || isPrivateAddress(bareHostname(host));
}

/**
 * 域名边界匹配：host 必须等于 base 或是 base 的子域。
 * 禁止反向后缀（base 是 host 的子域）——那是 H-1「平台 Key 外泄」的根源。
 */
export function isHostOrSubdomain(hostname: string, baseDomain: string): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    const base = baseDomain.toLowerCase().replace(/\.$/, "");
    if (!host || !base) return false;
    return host === base || host.endsWith(`.${base}`);
}

/** 校验 + DNS 固定解析：解析目标全部地址、逐一校验为公网后，返回可安全连接的钉死 IP。 */
async function resolvePinnedTarget(rawUrl: string): Promise<PinnedTarget> {
    if (!rawUrl) throw new Error("缺少 url 参数");

    let target: URL;
    try {
        target = new URL(rawUrl);
    } catch {
        throw new Error("非法 URL");
    }

    if (!["https:", "http:"].includes(target.protocol)) throw new Error("不允许代理非 HTTP 地址");
    if (target.username || target.password) throw new Error("不允许 URL 携带认证信息");
    if (isPrivateHostname(target.hostname)) throw new Error("不允许代理内网或本机地址");

    const bare = bareHostname(target.hostname);
    if (isIP(bare) !== 0) {
        // IP 字面量（v4/v6）：不解析 DNS，直接校验字面量
        if (isPrivateAddress(bare)) throw new Error("不允许代理内网或本机地址");
        return { url: target, ip: bare, family: isIP(bare) };
    }

    // 域名：全量解析并逐一校验，随后把连接钉在首个公网地址上（防 DNS 重绑定）
    const records = await lookup(target.hostname, { all: true, verbatim: true }).catch(() => null);
    if (!records || records.length === 0) throw new Error("目标域名解析失败");
    if (records.some((record) => isPrivateAddress(record.address))) throw new Error("不允许代理内网或本机地址");

    return { url: target, ip: records[0].address, family: records[0].family };
}

/** 校验目标 URL 是否允许代理访问；返回规范化后的 URL（含内网/保留地址/重绑定拦截）。 */
export async function assertAllowedProxyUrl(rawUrl: string): Promise<URL> {
    return (await resolvePinnedTarget(rawUrl)).url;
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (!headers) return out;
    if (headers instanceof Headers) {
        headers.forEach((value, key) => {
            out[key] = value;
        });
    } else {
        for (const [key, value] of Object.entries(headers)) {
            out[key] = String(value);
        }
    }
    return out;
}

/** 用 node:http/https 直连钉死的 IP，返回标准 Response（后续代理层逻辑无需改动）。 */
function pinnedFetch(target: URL, ip: string, family: number, init?: RequestInit): Promise<Response> {
    const isHttps = target.protocol === "https:";
    const headers = { Host: target.host, ...headersToRecord(init?.headers) };

    return new Promise<Response>((resolve, reject) => {
        const options = {
            protocol: target.protocol,
            hostname: ip, // 钉死的 IP，不做二次 DNS
            family,
            port: target.port || (isHttps ? 443 : 80),
            method: String(init?.method || "GET"),
            path: target.pathname + target.search,
            headers,
            // SNI 仍用原始域名，保证 TLS 证书校验针对真实域名而非 IP
            servername: isHttps ? target.hostname : undefined,
        };
        const req = (isHttps ? httpsRequest : httpRequest)(options, (res) => {
            const body = Readable.toWeb(res) as unknown as BodyInit;
            resolve(new Response(body, { status: res.statusCode, statusText: res.statusMessage, headers: res.headers as unknown as HeadersInit }));
        });
        req.on("error", reject);

        const signal = init?.signal;
        const onAbort = () => req.destroy(new Error("aborted"));
        if (signal) {
            if (signal.aborted) onAbort();
            else signal.addEventListener("abort", onAbort, { once: true });
        }

        const body = init?.body;
        if (body != null) {
            if (typeof body === "string") req.write(body);
            else if (body instanceof Uint8Array) req.write(Buffer.from(body));
            else req.write(Buffer.from(body as ArrayBuffer));
        }
        req.end();
    });
}

/**
 * 安全 fetch：DNS 固定解析 + 手动跟随重定向。
 * 每一步：校验 URL → 全量解析 → 逐一校验为公网 → 钉死 IP 连接；
 * 防止「公网 URL 302 到内网地址」的重定向型 SSRF 与「两次解析返回不同结果」的 DNS 重绑定。
 */
export async function fetchSafely(targetUrl: string, init?: RequestInit, maxRedirects = 5): Promise<Response> {
    let current = targetUrl;
    for (let step = 0; step <= maxRedirects; step++) {
        const { url, ip, family } = await resolvePinnedTarget(current);
        const response = await pinnedFetch(url, ip, family, init);
        const status = response.status;
        if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
            const location = response.headers.get("location");
            if (!location) return response;
            current = new URL(location, url).toString();
            continue;
        }
        return response;
    }
    throw new Error("重定向次数过多");
}
