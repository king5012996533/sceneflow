import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF 防护：校验目标 URL 是否允许代理访问。
 * 拦截：内网地址、保留地址、localhost、认证信息。
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

export function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || isPrivateAddress(host);
}

export function isPrivateAddress(address: string) {
  if (address === "::1") return true;
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map((item) => Number(item));
    const [a, b] = parts;
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
  }
  if (version === 6) {
    const value = address.toLowerCase();
    return value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }
  return false;
}
