/**
 * 方舟（豆包 Seedream）图片通道入参整形的单测（纯逻辑）。
 *
 * 起因（2026-09-19）：接 Seedream 5.0 pro / lite。方舟的图片接口长着 OpenAI 的形状，参数表却不一样，
 * 照我们通用请求体发过去会被拒收，而且**错的方式有好几种，只有一种是会报错的**：
 *   1. 参考图字段名（image vs image_urls）发错 → 上游静默忽略，照样出图照样计费，成图与参考图无关
 *      （recraft 踩过同款，见 lib/model-reference-support.ts）；
 *   2. n / quality 是我们恒定发的字段，方舟没有 → 400；
 *   3. watermark 不显式关掉 → 输出图多一个「AI生成」角标（比别的渠道多）；
 *   4. 没有 /images/edits 端点 → 参考图只能走生成端点。
 * 这几条各自都能悄悄毁掉一次生成（或一次收费），所以钉在这里。
 *
 * 运行：npm run test:ark
 */
import assert from "node:assert";

import {
    ARK_IMAGE_MAX_OUTPUTS,
    ARK_IMAGE_MAX_REFERENCES,
    ARK_IMAGE_PATH,
    ARK_IMAGE_REFERENCE_FIELD,
    ARK_IMAGE_WATERMARK,
    arkImageOutputFormat,
    arkImageUpstreamSize,
    arkReferenceCountError,
    arkReferenceImagesPayload,
    buildArkImageBody,
    isArkImageBaseUrl,
    isArkImageChannel,
    isArkPixelSizeAcceptable,
} from "../src/lib/ark-image.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push({ name, error });
        console.log(`  FAIL ${name}: ${error.message}`);
    }
}

console.log("isArkImageBaseUrl / isArkImageChannel");

check("方舟图片端点认得出来（含其它 region 的 volces / bytepluses 域名）", () => {
    assert.equal(isArkImageBaseUrl("https://ark.cn-beijing.volces.com/api/v3"), true);
    assert.equal(isArkImageBaseUrl("https://ARK.CN-BEIJING.VOLCES.COM/api/v3"), true);
    assert.equal(isArkImageBaseUrl("https://ark.ap-southeast.bytepluses.com/api/v3"), true);
});

check("Seedance 视频通道（/api/plan/v3，同一个 host）不算图片通道", () => {
    assert.equal(isArkImageBaseUrl("https://ark.cn-beijing.volces.com/api/plan/v3"), false);
    assert.equal(isArkImageChannel({ apiFormat: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/plan/v3" }), false);
});

check("中转站/其它渠道一律不算（同名 seedream 走的是 image_urls 那条路）", () => {
    assert.equal(isArkImageBaseUrl("https://api.apimart.ai/v1"), false);
    assert.equal(isArkImageBaseUrl("https://www.ggwk1.online/v1"), false);
    assert.equal(isArkImageBaseUrl(""), false);
    assert.equal(isArkImageBaseUrl(undefined), false);
});

check("显式标成别的调用格式的渠道不按方舟整形（供应商格式优先）", () => {
    for (const apiFormat of ["gemini", "replicate", "minimax", "aigccc", "genvideo"]) {
        assert.equal(isArkImageChannel({ apiFormat, baseUrl: "https://ark.cn-beijing.volces.com/api/v3" }), false, `${apiFormat} 不该按方舟整形`);
    }
    assert.equal(isArkImageChannel({ apiFormat: "openai", baseUrl: "https://ark.cn-beijing.volces.com/api/v3" }), true);
});

console.log("buildArkImageBody（请求体形状）");

const baseBody = buildArkImageBody({ model: "doubao-seedream-5-0-pro-260628", prompt: "一只猫" });

check("文生图：只有 model / prompt / size / output_format / watermark / response_format", () => {
    assert.deepEqual(Object.keys(baseBody).sort(), ["model", "output_format", "prompt", "response_format", "watermark"].sort());
    assert.equal(baseBody.model, "doubao-seedream-5-0-pro-260628");
    assert.equal(baseBody.prompt, "一只猫");
});

check("不发 n、不发 quality（方舟没有这两个参数，发了就是 400）", () => {
    const body = buildArkImageBody({ model: "m", prompt: "p", size: "2048x2048", images: ["data:image/png;base64,AAA"] });
    assert.equal("n" in body, false, "不该出现 n");
    assert.equal("quality" in body, false, "不该出现 quality");
});

check("显式关水印（与其它渠道的出图口径一致，别多一个「AI生成」角标）", () => {
    assert.equal(baseBody.watermark, false);
    assert.equal(ARK_IMAGE_WATERMARK, false);
});

check("显式要链接（不写就按上游默认走，默认若是 base64 会塞爆 32MB 信封）", () => {
    assert.equal(baseBody.response_format, "url");
});

check("参考图字段名是 image（不是 image_urls）", () => {
    assert.equal(ARK_IMAGE_REFERENCE_FIELD, "image");
    const single = buildArkImageBody({ model: "m", prompt: "p", images: ["https://x/a.png"] });
    assert.equal("image_urls" in single, false, "方舟不认 image_urls，发过去会被静默忽略");
    assert.equal(single.image, "https://x/a.png");
});

check("单张参考图给字符串、多张给数组（官方示例两种写法都支持）", () => {
    assert.equal(arkReferenceImagesPayload(["a"]).image, "a");
    assert.deepEqual(arkReferenceImagesPayload(["a", "b", "c"]).image, ["a", "b", "c"]);
    // 空项要滤掉，否则会往上游发一个空字符串（当作第 N 张图）
    assert.deepEqual(arkReferenceImagesPayload([" a ", "", "  ", "b"]).image, ["a", "b"]);
    // 顺序即 image 数组顺序，不去重
    assert.deepEqual(arkReferenceImagesPayload(["a", "a"]).image, ["a", "a"]);
});

check("没有参考图时整字段不发（文生图不该出现 image）", () => {
    assert.equal("image" in arkReferenceImagesPayload([]), false);
    assert.equal("image" in arkReferenceImagesPayload(undefined), false);
    assert.equal("image" in buildArkImageBody({ model: "m", prompt: "p" }), false);
});

check("出图格式只认 png / jpeg（方舟没有 webp，认不出来回 png）", () => {
    assert.equal(arkImageOutputFormat("jpeg"), "jpeg");
    assert.equal(arkImageOutputFormat("JPEG"), "jpeg");
    assert.equal(arkImageOutputFormat("png"), "png");
    assert.equal(arkImageOutputFormat("webp"), "png", "方舟没有 webp，发过去会被拒");
    assert.equal(arkImageOutputFormat(undefined), "png");
    assert.equal(arkImageOutputFormat("乱填"), "png");
});

console.log("arkImageUpstreamSize（画幅写法）");

check("区间内的像素串原样发（用户选的就是它，提示词里的数字也对得上）", () => {
    assert.equal(arkImageUpstreamSize("1024x1024"), "1024x1024");
    assert.equal(arkImageUpstreamSize("1280x720"), "1280x720");
    assert.equal(arkImageUpstreamSize("1824x1024"), "1824x1024");
    assert.equal(arkImageUpstreamSize("2048x2048"), "2048x2048");
    assert.equal(arkImageUpstreamSize("2048x1152"), "2048x1152");
    assert.equal(arkImageUpstreamSize("3136x1344"), "3136x1344");
});

check("超出像素区间（4K 的 3840x2160 = 8.29MP）改发档位标签，而不是发一个必被拒的值", () => {
    assert.equal(arkImageUpstreamSize("3840x2160"), "4K");
    assert.equal(arkImageUpstreamSize("2160x3840"), "4K");
    assert.equal(arkImageUpstreamSize("4096x4096"), "4K");
});

check("像素不够 / 宽高比越界也走档位标签（发过去只会 400）", () => {
    assert.equal(arkImageUpstreamSize("512x512"), "1K", "总像素低于下限");
    assert.equal(arkImageUpstreamSize("10000x100"), "1K", "宽高比 100 超过 1/16..16");
    assert.equal(arkImageUpstreamSize("2368x1776"), "2368x1776", "4.2MP 在区间内，照原样发（别拿档位换掉用户选的像素）");
    assert.equal(arkImageUpstreamSize("2368x2000"), "2K", "4.74MP 超上限 → 换成它所在的档");
    assert.equal(arkImageUpstreamSize("2560x2560"), "4K", "6.55MP 超上限 → 换成它所在的档");
});

check("档位标签原样给上游；比例串 / auto / 空不发 size", () => {
    assert.equal(arkImageUpstreamSize("2K"), "2K");
    assert.equal(arkImageUpstreamSize("1.5k"), "1.5K");
    assert.equal(arkImageUpstreamSize("16:9"), undefined, "方舟的 size 不认比例串（比例靠 prompt 描述）");
    assert.equal(arkImageUpstreamSize("auto"), undefined);
    assert.equal(arkImageUpstreamSize(""), undefined);
    assert.equal(arkImageUpstreamSize(undefined), undefined);
});

check("isArkPixelSizeAcceptable 的两个条件都要满足", () => {
    assert.equal(isArkPixelSizeAcceptable(2048, 2048), true);
    assert.equal(isArkPixelSizeAcceptable(2048, 1152), true);
    assert.equal(isArkPixelSizeAcceptable(4096, 4096), false, "总像素超上限");
    assert.equal(isArkPixelSizeAcceptable(512, 512), false, "总像素低于下限");
    assert.equal(isArkPixelSizeAcceptable(20000, 100), false, "宽高比越界");
    assert.equal(isArkPixelSizeAcceptable(0, 0), false);
});

check("size 落到 body 里（档位标签与像素串都走同一条路）", () => {
    assert.equal(buildArkImageBody({ model: "m", prompt: "p", size: "2048x1152" }).size, "2048x1152");
    assert.equal(buildArkImageBody({ model: "m", prompt: "p", size: "3840x2160" }).size, "4K");
    assert.equal("size" in buildArkImageBody({ model: "m", prompt: "p" }), false);
});

console.log("使用限制与计费口径");

check("参考图超过 10 张要报错（官方限制：最多 10 张）", () => {
    assert.equal(ARK_IMAGE_MAX_REFERENCES, 10);
    assert.equal(arkReferenceCountError(Array.from({ length: 10 }, (_, i) => `u${i}`)), "");
    assert.ok(arkReferenceCountError(Array.from({ length: 11 }, (_, i) => `u${i}`)).includes("10 张"));
    assert.equal(arkReferenceCountError([]), "");
});

check("一次只出一张（请求体里没有张数，扣费那边必须跟着夹到 1）", () => {
    assert.equal(ARK_IMAGE_MAX_OUTPUTS, 1);
    assert.equal("n" in baseBody, false);
    assert.equal(ARK_IMAGE_PATH, "/images/generations", "方舟没有 /images/edits，参考图也走生成端点");
});

if (failures.length) {
    console.error(`\n${failures.length} 项失败 / 共 ${passed + failures.length} 项`);
    process.exit(1);
}
console.log(`\n全部通过（${passed} 项）`);
