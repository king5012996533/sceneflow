import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF 防护：校验目标 URL 是否允许代理访问。
 * 拦截：内网地址、保留地址（含 CGNAT/阿里云元数据段）、IPv4-mapped IPv6、localhost、认证信息。
 */
export async function assertAllowedProxyUrl(rawUrl: string) {
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

  try {
    const records = await lookup(target.hostname, { all: true, verbatim: true });
    if (records.some((record) => isPrivateAddress(record.address))) throw new Error("不允许代理内网或本机地址");
  } catch (error) {
    if (error instanceof Error && error.message.includes("不允许")) throw error;
    throw new Error("目标域名解析失败");
  }

  return target;
}

/**
 * 安全 fetch：手动跟随重定向，每一步重定向目标都重新走 assertAllowedProxyUrl 校验，
 * 防止「公网 URL 302 到内网地址」的重定向型 SSRF。
 */
export async function fetchSafely(targetUrl: string, init?: RequestInit, maxRedirects = 5): Promise<Response> {
  let current = targetUrl;
  for (let step = 0; step <= maxRedirects; step++) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    const status = response.status;
    if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = (await assertAllowedProxyUrl(new URL(location, current).toString())).toString();
      continue;
    }
    return response;
  }
  throw new Error("重定向次数过多");
}

export function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || isPrivateAddress(host);
}

export function isPrivateAddress(address: string) {
  if (address === "::1") return true;
  const version = isIP(address);

  // IPv4-mapped / IPv4-compatible IPv6（::ffff:x.x.x.x）先还原成 IPv4 再按 IPv4 规则判断
  const mappedMatch = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mappedMatch) return isPrivateAddress(mappedMatch[1]);

  if (version === 4) {
    const parts = address.split(".").map((item) => Number(item));
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
    const value = address.toLowerCase();
    return (
      value === "::" ||
      value.startsWith("::ffff:") || // IPv4-mapped（前面未匹配到合法 IPv4 文本的兜底）
      value.startsWith("fc") || // 唯一本地地址 fc00::/7
      value.startsWith("fd") ||
      value.startsWith("fe80:") || // 链路本地 fe80::/10
      value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") // fe80-fe9f
    );
  }

  return false;
}
