/**
 * 素材体积档位与媒体类型判定（纯函数，便于单测）。
 *
 * 这两条判断连着挂过两次线上：
 * 1. 只有图片走了素材代理时，音视频节点仍直连 CDN —— 被 Referer 防盗链 403；
 * 2. 代理只按上游 content-type 判档时，字节系 CDN（v16-dola.dola.com 等）把成品 mp4
 *    标成 binary/octet-stream，43MB 的视频被按图片档（25MB）拒掉 —— 413。
 *
 * 所以档位判定必须综合「调用方声明的 kind → 上游 content-type → URL 线索」，
 * 且上游给通用二进制类型时要能补回准确的媒体类型（blob 落库的 MIME 决定时长/尺寸元数据）。
 */

export type AssetKind = "image" | "video" | "audio";

/** 图片等普通素材的体积上限 */
export const IMAGE_ASSET_LIMIT_BYTES = 25 * 1024 * 1024;
/** 音视频上限：与主代理的 blob 透传一致 */
export const MEDIA_ASSET_LIMIT_BYTES = 200 * 1024 * 1024;
/** 缓冲阈值：超过它改为流式透传，整段 Buffer 会顶到 PM2 的重启线 */
export const ASSET_BUFFER_BYTES = 25 * 1024 * 1024;

const ASSET_KINDS = new Set<string>(["image", "video", "audio"]);

export function normalizeAssetKind(value: string | null | undefined): AssetKind | null {
    return value && ASSET_KINDS.has(value) ? (value as AssetKind) : null;
}

/** URL 里的媒体线索：字节系 CDN 的 mime_type 参数，或常见的音视频扩展名 */
const MEDIA_URL_HINT = /[?&]mime_type=(?:video|audio)_|\.(?:mp4|m4v|mov|webm|mkv|mp3|m4a|wav|aac|flac|ogg|opus)(?:[?#]|$)/i;

/** 更精确的类型线索（只在需要补 MIME 时用，顺序即优先级） */
const MEDIA_TYPE_HINTS: Array<[RegExp, string]> = [
    // 字节系 CDN 的 mime_type 查询参数后面通常还跟着别的参数，不能锚死结尾
    [/[?&]mime_type=video_mp4(?:[&#]|$)/i, "video/mp4"],
    [/[?&]mime_type=audio_mp3(?:[&#]|$)/i, "audio/mpeg"],
    [/\.(?:mp4|m4v)(?:[?#]|$)/i, "video/mp4"],
    [/\.mov(?:[?#]|$)/i, "video/quicktime"],
    [/\.webm(?:[?#]|$)/i, "video/webm"],
    [/\.mkv(?:[?#]|$)/i, "video/x-matroska"],
    [/\.mp3(?:[?#]|$)/i, "audio/mpeg"],
    [/\.m4a(?:[?#]|$)/i, "audio/mp4"],
    [/\.wav(?:[?#]|$)/i, "audio/wav"],
    [/\.aac(?:[?#]|$)/i, "audio/aac"],
    [/\.flac(?:[?#]|$)/i, "audio/flac"],
    [/\.(?:ogg|opus)(?:[?#]|$)/i, "audio/ogg"],
];

export type AssetDescriptor = { kind?: AssetKind | null; contentType?: string; url: string };

/** 是否按音视频档位放行（任一信号命中即算，宁可放宽也不要把成品视频拒掉） */
export function isMediaAsset({ kind, contentType = "", url }: AssetDescriptor): boolean {
    if (kind === "video" || kind === "audio") return true;
    if (kind === "image") return false;
    return /^(video|audio)\//i.test(contentType) || MEDIA_URL_HINT.test(url);
}

/** 该素材的体积上限（字节） */
export function assetLimitBytes(descriptor: AssetDescriptor): number {
    return isMediaAsset(descriptor) ? MEDIA_ASSET_LIMIT_BYTES : IMAGE_ASSET_LIMIT_BYTES;
}

/**
 * 回给浏览器/落库用的媒体类型：上游给了明确的 video/audio 就照用，
 * 否则按 URL 线索补，线索也没有但调用方明确声明了类型时给一个通用默认值。
 */
export function mediaContentType({ kind, contentType = "", url }: AssetDescriptor): string {
    const upstream = contentType || "application/octet-stream";
    if (/^(video|audio)\//i.test(upstream)) return upstream;
    for (const [pattern, type] of MEDIA_TYPE_HINTS) if (pattern.test(url)) return type;
    if (kind === "video") return "video/mp4";
    if (kind === "audio") return "audio/mpeg";
    return upstream;
}
