// 部分上游（GenVideo/字节系 TOS 等）会返回 http:// 媒体直链；https 页面下属于
// mixed content 会被浏览器拦截，站点 CSP 的 media-src/img-src 也只放行 https。
// 上游签名 URL 不含协议（实测 v16-dola.dola.com 同 URL 换 https 可用），
// 统一在媒体消费点把公网 http 升级为 https；本地/内网地址保持原样。
export function upgradeInsecureMediaUrl(url: string | undefined | null): string {
    const trimmed = (url || "").trim();
    if (!/^http:\/\//i.test(trimmed)) return trimmed;
    try {
        const host = new URL(trimmed).hostname;
        // 本地/内网地址保持 http（本地开发网关通常无法提供 https）
        if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return trimmed;
    } catch {
        return trimmed;
    }
    return trimmed.replace(/^http:\/\//i, "https://");
}
