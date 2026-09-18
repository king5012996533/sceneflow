import { lookup } from "node:dns/promises";
import { connect as netConnect, isIP, type Socket } from "node:net";
import { Agent as HttpAgent, request as httpRequest, type ClientRequest, type IncomingMessage } from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { Readable, type Duplex } from "node:stream";
import ipaddr from "ipaddr.js";

/**
 * SSRF 防护：校验目标 URL 是否允许代理访问，并在连接时固定已校验的 IP（防 DNS 重绑定）。
 * 拦截：内网地址、保留地址（含 CGNAT/云元数据段、IPv4-mapped / IPv4-compatible IPv6、
 *       NAT64(64:ff9b)/6to4 内嵌 IPv4、ULA/链路本地/组播/文档前缀）、localhost、认证信息。
 */

type PinnedTarget = { url: URL; ip: string; family: number; proxy: URL | null };

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

/**
 * 出站代理（可选开关，默认关闭）。
 *
 * 存在意义：个别上游域名在服务器所在网络里被 DNS 污染 + SNI 阻断，直连必然 ETIMEDOUT
 * （apimart 即如此，见 /api/proxy 返回的 connect ETIMEDOUT）。此时由运维在服务器上起一个
 * 本地 HTTP CONNECT 代理（或 SSH 反向隧道指到别处的代理），再用环境变量告诉应用「哪些域名走它」：
 *   OUTBOUND_PROXY_URL=http://127.0.0.1:18080
 *   OUTBOUND_PROXY_HOSTS=api.apimart.ai,other.example.com
 *
 * 安全边界（与直连路径同等严格）：
 *   1. 只有白名单内的主机才走代理，且必须是「精确相等或其子域」（复用 isHostOrSubdomain，禁止子串匹配）；
 *   2. 白名单命中时不做本地 DNS——本地那份解析在当前网络下就是被污染的结果，真正的解析发生在代理侧；
 *      连接对象是运维配置的代理，不是用户可控的地址；
 *   3. 未配置 OUTBOUND_PROXY_URL / OUTBOUND_PROXY_HOSTS 时，本模块行为与不启用代理时完全一致。
 */
function outboundProxyFor(hostname: string): URL | null {
    const rawUrl = (process.env.OUTBOUND_PROXY_URL || "").trim();
    const rawHosts = (process.env.OUTBOUND_PROXY_HOSTS || "").trim();
    if (!rawUrl || !rawHosts) return null;

    const host = hostname.toLowerCase().replace(/\.$/, "");
    const allowList = rawHosts
        .split(",")
        .map((item) => item.trim().toLowerCase().replace(/\.$/, ""))
        .filter(Boolean);
    if (!allowList.some((base) => isHostOrSubdomain(host, base))) return null;

    let proxy: URL;
    try {
        proxy = new URL(rawUrl);
    } catch {
        throw new Error("出站代理配置非法：OUTBOUND_PROXY_URL 不是合法 URL");
    }
    // 只支持 HTTP CONNECT 隧道（本机代理 / SSH 反向隧道都是这个形态）；
    // 到上游的 TLS 仍由隧道内的 servername 保证，代理看不到明文。
    if (proxy.protocol !== "http:") throw new Error("出站代理配置非法：OUTBOUND_PROXY_URL 仅支持 http://（CONNECT 隧道）");
    return proxy;
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
    const proxy = outboundProxyFor(bare);
    if (isIP(bare) !== 0) {
        // IP 字面量（v4/v6）：不解析 DNS，直接校验字面量
        if (isPrivateAddress(bare)) throw new Error("不允许代理内网或本机地址");
        return { url: target, ip: bare, family: isIP(bare), proxy };
    }

    // 走已配置的出站代理时不做本地 DNS 固定：本地解析在当前网络下就是被污染的那一份，
    // 而连接对象是代理（运维配置），不是目标站点本身。
    if (proxy) return { url: target, ip: "", family: 0, proxy };

    // 域名：全量解析并逐一校验，随后把连接钉在首个公网地址上（防 DNS 重绑定）
    const records = await lookup(target.hostname, { all: true, verbatim: true }).catch(() => null);
    if (!records || records.length === 0) throw new Error("目标域名解析失败");
    if (records.some((record) => isPrivateAddress(record.address))) throw new Error("不允许代理内网或本机地址");

    return { url: target, ip: records[0].address, family: records[0].family, proxy };
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

/** 把上游响应包成标准 Response（直连与走代理两条路径共用）。 */
function toWebResponse(res: IncomingMessage): Response {
    const body = Readable.toWeb(res) as unknown as BodyInit;
    return new Response(body, { status: res.statusCode, statusText: res.statusMessage, headers: res.headers as unknown as HeadersInit });
}

/** 写请求体、挂中止信号、收尾（直连与走代理两条路径共用）。 */
function finishRequest(req: ClientRequest, init: RequestInit | undefined, reject: (error: Error) => void) {
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
        const req = (isHttps ? httpsRequest : httpRequest)(options, (res) => resolve(toWebResponse(res)));
        finishRequest(req, init, reject);
    });
}

/** CONNECT 响应头最大字节数：本地代理回一个状态行就够，超了说明对面不是代理。 */
const PROXY_CONNECT_MAX_HEADER_BYTES = 8 * 1024;

/**
 * 经出站代理建立连接。
 * https 目标：CONNECT 建隧道，再在隧道内做 TLS——SNI 用真实域名、证书照常校验，代理只看到密文。
 * http 目标：直接连代理，由调用方用绝对形式请求行让代理转发（见 proxiedFetch）。
 */
function createProxiedConnection(proxy: URL, target: URL): Promise<Socket | TLSSocket> {
    const isHttps = target.protocol === "https:";
    const targetPort = target.port || (isHttps ? 443 : 80);

    return new Promise<Socket | TLSSocket>((resolve, reject) => {
        const socket = netConnect({ host: proxy.hostname, port: Number(proxy.port || 80) });
        // 连接建立后仍保留这个 handler：隧道中途断开时交给上层 request，避免 unhandled 'error'
        socket.on("error", (error: Error) => {
            socket.destroy();
            reject(error);
        });
        socket.once("connect", () => {
            // http 目标：代理语义是「转发」，请求行用绝对形式 URI（见 proxiedFetch），不需要 CONNECT
            if (!isHttps) {
                resolve(socket);
                return;
            }

            const credentials = proxy.username || proxy.password ? `Proxy-Authorization: Basic ${Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString("base64")}\r\n` : "";
            socket.write(`CONNECT ${target.hostname}:${targetPort} HTTP/1.1\r\nHost: ${target.hostname}:${targetPort}\r\n${credentials}\r\n`);

            let received = Buffer.alloc(0);
            const onData = (chunk: Buffer) => {
                received = Buffer.concat([received, chunk]);
                const headerEnd = received.indexOf("\r\n\r\n");
                if (headerEnd === -1) {
                    if (received.length > PROXY_CONNECT_MAX_HEADER_BYTES) socket.destroy(new Error("出站代理响应头异常"));
                    return;
                }
                socket.off("data", onData);

                const status = Number(
                    (received
                        .subarray(0, headerEnd)
                        .toString("latin1")
                        .match(/^HTTP\/1\.[01] (\d{3})/) || [])[1] || 0,
                );
                if (status !== 200) {
                    socket.destroy(new Error(`出站代理拒绝隧道（HTTP ${status || "?"}）`));
                    return;
                }

                // CONNECT 之后的隧道是透明字节流：代理若已提前带过来上游字节，要留在缓冲里交给 TLS 层
                const rest = received.subarray(headerEnd + 4);
                if (rest.length > 0) socket.unshift(rest);

                const tlsSocket = tlsConnect({ socket, servername: target.hostname });
                tlsSocket.once("secureConnect", () => resolve(tlsSocket));
                tlsSocket.once("error", reject);
            };
            socket.on("data", onData);
        });
    });
}

/** 经隧道建立连接（两个 Agent 子类共用）：Agent 支持异步 createConnection，返回 undefined 后回调给出 socket。 */
function tunnelConnection(proxy: URL, target: URL, callback: (error: Error | null, stream: Duplex) => void): undefined {
    createProxiedConnection(proxy, target).then(
        (socket) => callback(null, socket),
        // 失败分支没有 stream；node 的 Agent 只看第一个参数
        (error: Error) => callback(error, undefined as unknown as Duplex),
    );
    return undefined;
}

/** 把每个请求的连接换成「经出站代理建好的隧道」，其余交给 node 标准 Agent 处理。keepAlive 关闭，隧道不复用。 */
class TunnelAgent extends HttpAgent {
    private readonly proxy: URL;
    private readonly target: URL;

    constructor(proxy: URL, target: URL) {
        super({ keepAlive: false, maxSockets: 1 });
        this.proxy = proxy;
        this.target = target;
    }

    createConnection(_options: unknown, callback?: (error: Error | null, stream: Duplex) => void): undefined {
        if (!callback) return undefined;
        return tunnelConnection(this.proxy, this.target, callback);
    }
}

/** https 目标：createConnection 返回的已经是隧道内完成握手的 TLSSocket，Agent 不再自己套 TLS。 */
class TunnelHttpsAgent extends HttpsAgent {
    private readonly proxy: URL;
    private readonly target: URL;

    constructor(proxy: URL, target: URL) {
        super({ keepAlive: false, maxSockets: 1 });
        this.proxy = proxy;
        this.target = target;
    }

    createConnection(_options: unknown, callback?: (error: Error | null, stream: Duplex) => void): undefined {
        if (!callback) return undefined;
        return tunnelConnection(this.proxy, this.target, callback);
    }
}

/**
 * 经出站代理请求（仅白名单域名会走到这里）。
 * https：CONNECT 隧道 + 隧道内 TLS；http：CONNECT 隧道 + 绝对形式请求行。
 * 与直连路径一样返回标准 Response，调用方（/api/proxy 等）无需感知差别。
 */
function proxiedFetch(target: URL, proxy: URL, init?: RequestInit): Promise<Response> {
    const isHttps = target.protocol === "https:";
    const headers = { Host: target.host, ...headersToRecord(init?.headers) };
    const agent = isHttps ? new TunnelHttpsAgent(proxy, target) : new TunnelAgent(proxy, target);

    return new Promise<Response>((resolve, reject) => {
        const options = {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            method: String(init?.method || "GET"),
            // 走代理时 http 目标用绝对形式 URI（CONNECT 之外的标准代理语义）；https 走隧道内相对路径
            path: isHttps ? target.pathname + target.search : target.toString(),
            headers,
            agent,
        };
        const req = (isHttps ? httpsRequest : httpRequest)(options, (res) => resolve(toWebResponse(res)));
        finishRequest(req, init, reject);
    });
}

/**
 * 安全 fetch：DNS 固定解析 + 手动跟随重定向。
 * 每一步：校验 URL → 全量解析 → 逐一校验为公网 → 钉死 IP 连接；
 * 防止「公网 URL 302 到内网地址」的重定向型 SSRF 与「两次解析返回不同结果」的 DNS 重绑定。
 * 白名单域名改走出站代理（见 outboundProxyFor），每一步同样重新过白名单，重定向到未白名单域名会退回直连。
 */
export async function fetchSafely(targetUrl: string, init?: RequestInit, maxRedirects = 5): Promise<Response> {
    let current = targetUrl;
    for (let step = 0; step <= maxRedirects; step++) {
        const { url, ip, family, proxy } = await resolvePinnedTarget(current);
        const response = proxy ? await proxiedFetch(url, proxy, init) : await pinnedFetch(url, ip, family, init);
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
