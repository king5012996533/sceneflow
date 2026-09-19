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
 * 2026-09-19 二次补丁：尺寸的接受区间**逐模型不同**（实测 lite 拒收 3686400 像素以下、pro 拒收
 * 4624220 像素以上，两家都认档位标签），于是 arkImageUpstreamSize 改成按模型算 —— 这一块用自己的
 * 用例钉住：2K 的 16:9（2048x1152）与 4K，正是「照原样发就 400」的两个代表性尺寸。
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
} from "../src/lib/ark-image.ts";

/** 上游两个模型的 id（pro 的 id 里带 `pro`，lite 的 id 不带 —— 尺寸边界就是按这个认的） */
const PRO = "doubao-seedream-5-0-pro-260628";
const LITE = "doubao-seedream-5-0-260128";
const LITE_ALIAS = "doubao-seedream-5-0-lite-260128";

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

check("显式要链接（4K 的 base64 能顶到 32MB 代理信封上限）", () => {
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

check("output_format 每次都在请求体里（上游默认是 jpeg，靠这一行才是 png）", () => {
    assert.equal("output_format" in buildArkImageBody({ model: PRO, prompt: "p" }), true);
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p" }).output_format, "png");
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p", outputFormat: "webp" }).output_format, "png");
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p", outputFormat: "jpeg" }).output_format, "jpeg");
});

console.log("arkImageUpstreamSize（尺寸边界逐模型不同）");

check("pro：0.92–4.62MP 的像素串原样发（用户选的就是它，提示词里的数字也对得上）", () => {
    for (const size of ["1024x1024", "1248x832", "1360x768", "1824x1024", "2048x1152", "2048x2048", "2368x1776", "2496x1664", "3136x1344"]) {
        assert.equal(arkImageUpstreamSize(size, PRO), size, size);
    }
});

check("pro：超过 4624220 像素（4K 8.29MP）改发档位标签，不发一个必被拒的像素值", () => {
    assert.equal(arkImageUpstreamSize("3840x2160", PRO), "2K", "4K 超出 pro 上限 → 收敛到它支持的最高档");
    assert.equal(arkImageUpstreamSize("2160x3840", PRO), "2K");
    assert.equal(arkImageUpstreamSize("2880x2880", PRO), "2K");
    assert.equal(arkImageUpstreamSize("2368x2000", PRO), "2K", "4.74MP 超上限");
});

check("lite：低于 3686400 像素改发档位标签（2K 的 16:9 = 2048x1152 正好落在下限之下）", () => {
    assert.equal(arkImageUpstreamSize("1824x1024", LITE), "2K", "实测 lite 收到它回 400：image size must be at least 3686400 pixels");
    assert.equal(arkImageUpstreamSize("1024x1024", LITE), "2K", "lite 没有 1K 档 → 收敛到它支持的最低档");
    assert.equal(arkImageUpstreamSize("2048x1152", LITE), "2K", "2.36MP 在下限之下");
    assert.equal(arkImageUpstreamSize("1152x2048", LITE), "2K");
});

check("lite：够到下限就照原样发（4K 也在它的接受区间里，别拿档位换掉用户选的像素）", () => {
    assert.equal(arkImageUpstreamSize("2048x2048", LITE), "2048x2048");
    assert.equal(arkImageUpstreamSize("2496x1664", LITE), "2496x1664");
    assert.equal(arkImageUpstreamSize("3840x2160", LITE), "3840x2160", "实测 lite 收到 3840x2160 能出图");
    assert.equal(arkImageUpstreamSize("4096x4096", LITE), "4096x4096");
});

check("lite 的别名（doubao-seedream-5-0-lite-260128）与主 id 同一套边界", () => {
    assert.equal(arkImageUpstreamSize("1024x1024", LITE_ALIAS), "2K");
    assert.equal(arkImageUpstreamSize("3840x2160", LITE_ALIAS), "3840x2160");
});

check("认不出模型时只走两家都认的安全带（宁可小一点，也不要发必被拒的尺寸）", () => {
    assert.equal(arkImageUpstreamSize("2048x2048", "some-seedream-clone"), "2048x2048", "4.19MP 两家都收");
    assert.equal(arkImageUpstreamSize("3840x2160", "some-seedream-clone"), "2K");
    assert.equal(arkImageUpstreamSize("1024x1024", "some-seedream-clone"), "2K");
    assert.equal(arkImageUpstreamSize("2048x2048"), "2048x2048", "没给模型名也走同一套交集");
    assert.equal(arkImageUpstreamSize("1024x1024"), "2K");
});

check("宽高比越界（文档的第二个条件）也换标签", () => {
    assert.equal(arkImageUpstreamSize("10000x100", PRO), "1K", "宽高比 100 超过 1/16..16");
    assert.equal(arkImageUpstreamSize("512x512", PRO), "1K", "低于 pro 的下限");
});

check("显式给来的档位标签：收敛到该模型支持的档；比例串 / auto / 空不发 size", () => {
    assert.equal(arkImageUpstreamSize("2K", PRO), "2K");
    assert.equal(arkImageUpstreamSize("1.5k", PRO), "1.5K");
    assert.equal(arkImageUpstreamSize("4K", PRO), "2K", "pro 不认 4K → 收敛到它支持的最高档");
    assert.equal(arkImageUpstreamSize("1K", LITE), "2K", "lite 不认 1K");
    assert.equal(arkImageUpstreamSize("3k", LITE), "3K");
    assert.equal(arkImageUpstreamSize("4K", LITE), "4K");
    assert.equal(arkImageUpstreamSize("16:9", PRO), undefined, "方舟的 size 不认比例串（比例靠 prompt 描述）");
    assert.equal(arkImageUpstreamSize("auto"), undefined);
    assert.equal(arkImageUpstreamSize(""), undefined);
    assert.equal(arkImageUpstreamSize(undefined), undefined);
});

check("size 落到 body 里：按 body 里那个 model 算（同一个尺寸，两个模型可能发得不一样）", () => {
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p", size: "2048x2048" }).size, "2048x2048");
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p", size: "2048x1152" }).size, "2048x1152");
    assert.equal(buildArkImageBody({ model: LITE, prompt: "p", size: "2048x1152" }).size, "2K", "同一个尺寸，lite 要换标签");
    assert.equal(buildArkImageBody({ model: LITE, prompt: "p", size: "3840x2160" }).size, "3840x2160");
    assert.equal(buildArkImageBody({ model: PRO, prompt: "p", size: "3840x2160" }).size, "2K");
    assert.equal("size" in buildArkImageBody({ model: PRO, prompt: "p" }), false);
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
