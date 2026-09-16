/**
 * 素材体积档位与媒体类型判定的单元测试。
 *
 * 这两条判断连着挂过两次线上（防盗链 403、octet-stream 视频被判成图片档 413），
 * 而且失败都发生在真实 URL 的细节上（参数后面还跟着别的参数、上游 MIME 不可信），
 * 所以这里直接拿线上出事故的那两条真实 URL 当用例。
 *
 * 运行：npm run test:asset
 */
import assert from "node:assert";

import { assetLimitBytes, IMAGE_ASSET_LIMIT_BYTES, isMediaAsset, MEDIA_ASSET_LIMIT_BYTES, mediaContentType, normalizeAssetKind } from "../src/lib/asset-tier.ts";

// 线上事故原样 URL：43MB 的成品 mp4，上游响应头是 binary/octet-stream
const DOLA_VIDEO =
    "https://v16-dola.dola.com/06576745fa337efe71394d62a62004be/6aaadb91/video/tos/mya/tos-mya-v-50851/o4DKAEvAaEhqWF9qaYYfCoJpIYAfBNwtqqEoxF/?a=489823&ch=0&cr=4&dr=0&er=0&mime_type=video_mp4&qs=13&rc=amdqPHE5cjg7ZGYzcDY5NEBpamdqPHE5cjg7ZGYzcDY5NEBjbF5vMmRrYWlhLS1kXjVzYSNjbF5vMmRrYWlhLS1kXjVzcw%3D%3D&dy_q=1789560595&l=20260916200955A145435D490FB40FF0ED";
const ZJCDN_VIDEO = "https://v3-dy-o.zjcdn.com/2b9b5dd6e5994ed7b1a27654b6bd921c/6aaa86dd/video/tos/cn/tos-cn-v-9ecd54/6ceec7117410472b8fabc69a53d0e2fe/?a=0&lr=unwatermarked&mime_type=video_mp4&qs=13&btag=c0000e00010000&req_cdn_type=";
const OCTET = "binary/octet-stream";

let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

console.log("素材档位判定");

check("dola 直链 + octet-stream：必须按媒体档放行（43MB 不再 413）", () => {
    const d = { kind: null, contentType: OCTET, url: DOLA_VIDEO };
    assert.equal(isMediaAsset(d), true);
    assert.equal(assetLimitBytes(d), MEDIA_ASSET_LIMIT_BYTES);
});

check("dola 直链 + octet-stream：按 URL 线索补回 video/mp4（不能锚死 URL 结尾）", () => {
    assert.equal(mediaContentType({ kind: null, contentType: OCTET, url: DOLA_VIDEO }), "video/mp4");
});

check("zjcdn 直链（mime_type 后面还有别的参数）同样按媒体档", () => {
    const d = { kind: null, contentType: OCTET, url: ZJCDN_VIDEO };
    assert.equal(isMediaAsset(d), true);
    assert.equal(mediaContentType(d), "video/mp4");
});

check("调用方声明 kind=video 时，任何 URL 都按媒体档", () => {
    const d = { kind: "video", contentType: OCTET, url: "https://cdn.example.com/opaque/abc123" };
    assert.equal(isMediaAsset(d), true);
    assert.equal(assetLimitBytes(d), MEDIA_ASSET_LIMIT_BYTES);
    assert.equal(mediaContentType(d), "video/mp4");
});

check("调用方声明 kind=image 时，图片档优先（不因 URL 里有 mp4 字样放宽）", () => {
    const d = { kind: "image", contentType: "image/png", url: "https://cdn.example.com/a.mp4.png" };
    assert.equal(isMediaAsset(d), false);
    assert.equal(assetLimitBytes(d), IMAGE_ASSET_LIMIT_BYTES);
    assert.equal(mediaContentType(d), "image/png");
});

check("上游给了明确类型就照用（不要把 webm 改写成 mp4）", () => {
    assert.equal(mediaContentType({ kind: "video", contentType: "video/webm", url: "https://cdn.example.com/a.webm" }), "video/webm");
    assert.equal(mediaContentType({ kind: null, contentType: "audio/wav", url: "https://cdn.example.com/a" }), "audio/wav");
});

check("普通图片 URL 仍走图片档", () => {
    const d = { kind: null, contentType: "image/jpeg", url: "https://cdn.example.com/photo.jpg" };
    assert.equal(isMediaAsset(d), false);
    assert.equal(assetLimitBytes(d), IMAGE_ASSET_LIMIT_BYTES);
    assert.equal(mediaContentType(d), "image/jpeg");
});

check("扩展名线索：.mp4/.mov/.webm/.mp3 都要认得，且允许带查询串", () => {
    assert.equal(mediaContentType({ kind: null, contentType: OCTET, url: "https://cdn.example.com/clip.mp4?token=1" }), "video/mp4");
    assert.equal(mediaContentType({ kind: null, contentType: OCTET, url: "https://cdn.example.com/clip.mov" }), "video/quicktime");
    assert.equal(mediaContentType({ kind: null, contentType: OCTET, url: "https://cdn.example.com/clip.webm#t=1" }), "video/webm");
    assert.equal(mediaContentType({ kind: null, contentType: OCTET, url: "https://cdn.example.com/song.mp3" }), "audio/mpeg");
});

check("路径中段出现扩展名不算（只有结尾/查询串前才认）", () => {
    const d = { kind: null, contentType: OCTET, url: "https://cdn.example.com/clip.mp4/thumbnail" };
    assert.equal(isMediaAsset(d), false);
    assert.equal(assetLimitBytes(d), IMAGE_ASSET_LIMIT_BYTES);
});

check("音频声明 + 无线索 → audio/mpeg", () => {
    const d = { kind: "audio", contentType: OCTET, url: "https://cdn.example.com/opaque/xyz" };
    assert.equal(isMediaAsset(d), true);
    assert.equal(mediaContentType(d), "audio/mpeg");
});

check("kind 参数只认白名单取值", () => {
    assert.equal(normalizeAssetKind("video"), "video");
    assert.equal(normalizeAssetKind("image"), "image");
    assert.equal(normalizeAssetKind("audio"), "audio");
    assert.equal(normalizeAssetKind("bogus"), null);
    assert.equal(normalizeAssetKind(null), null);
});

if (process.exitCode) console.error(`\n${passed} 项通过，存在失败`);
else console.log(`\n${passed} 项通过，全部通过`);
