/**
 * 默认画质的解析口径（纯函数，无网络无数据库）。
 *
 * 起因（2026-09-23）：上游不同画质档价格差 20 倍（实测同模型：auto ¥1.78/张、low ¥0.09/张）。
 * 以前默认写死 auto —— 用户随手点一下就是最贵那档；而面板显示的价格与发出去的档位必须是同一个值，
 * 所以解析收口成一个函数。这里钉住三件事：
 *   1. 用户选过的值永远优先（包括显式选 auto）；
 *   2. 没选过（空串）才用模型标定的默认档；
 *   3. 标定的默认档必须在标定允许的档位里，否则当没标（免得标了低、上游却不认低）。
 *
 * 运行：npm run test:imgquality
 */
import assert from "node:assert";

const { resolveImageQuality } = await import("../src/lib/model-capability-spec.ts");

let passed = 0;
let failed = 0;
const check = (name, fn) => {
    try {
        fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`  FAIL ${name} — ${error instanceof Error ? error.message : error}`);
    }
};

const imageCapability = (over = {}) => ({ kind: "image", qualities: ["low", "medium", "high", "auto"], aspects: ["1:1"], resolutions: ["1k"], maxCount: 4, ...over });

console.log("== 用户选过的值优先 ==");
check("选了 high 就是 high", () => assert.equal(resolveImageQuality("high", imageCapability({ defaultQuality: "low" })), "high"));
check("显式选了 auto 也是 auto（不被默认档顶掉）", () => assert.equal(resolveImageQuality("auto", imageCapability({ defaultQuality: "low" })), "auto"));
check("大小写与空格无关", () => assert.equal(resolveImageQuality("  LOW  ", imageCapability()), "low"));

console.log("== 没选过时用模型标定的默认档 ==");
check("空串 + 标了低 → low", () => assert.equal(resolveImageQuality("", imageCapability({ defaultQuality: "low" })), "low"));
check("undefined + 标了低 → low", () => assert.equal(resolveImageQuality(undefined, imageCapability({ defaultQuality: "low" })), "low"));
check("空串 + 没标 → auto（与改动前一致）", () => assert.equal(resolveImageQuality("", imageCapability()), "auto"));
check("没有能力标定 → auto", () => assert.equal(resolveImageQuality("", undefined), "auto"));
check("非字符串输入按「没选过」处理 → 落到模型默认档", () => assert.equal(resolveImageQuality(42, imageCapability({ defaultQuality: "low" })), "low"));

console.log("== 标定里的非法默认值一律当没标 ==");
check("默认档不在允许档位里 → auto", () => assert.equal(resolveImageQuality("", imageCapability({ qualities: ["high", "auto"], defaultQuality: "low" })), "auto"));
check("默认档不是合法画质词 → auto", () => assert.equal(resolveImageQuality("", imageCapability({ defaultQuality: "ultra" })), "auto"));
check("视频能力标定上的 defaultQuality 不参与图片解析", () => assert.equal(resolveImageQuality("", { kind: "video", clarity: ["720"], sizes: ["1280x720"], seconds: [5], defaultQuality: "low" }), "auto"));
check("模型标了低、用户没选过 → 与显式选低同值（价格与请求体同源）", () => {
    const cap = imageCapability({ defaultQuality: "low" });
    assert.equal(resolveImageQuality("", cap), resolveImageQuality("low", cap));
});

console.log(failed ? `\n${failed} 项失败（通过 ${passed}）` : `\n全部通过（${passed} 项）`);
process.exit(failed ? 1 : 0);
