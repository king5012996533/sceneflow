/**
 * 交互编辑标记语言的单测（纯逻辑，2026-09-20）。
 *
 * 起因：方舟 Seedream 5.0 pro 的交互编辑没有新参数 —— 位置全靠**我们自己**把像素换算成
 * 归一化坐标、写成 `<point>`/`<bbox>` 嵌进提示词。换算写歪一位不会报错，只会安静地改错地方
 * （用户框了 A 区域、图里改的是 B 区域，还照样扣一次钱），所以口径必须钉死：
 *   1. 归一化到 1000×1000 网格、取值 [0,999]、左上为 0,0（官方口径）；
 *   2. 框选两个角要能反着拖（右下往左上），四个值算完再排序；
 *   3. 退化成线/点的框直接丢，别让用户以为"框住了"；
 *   4. 三种静默失败（无参考图 / 标记前没编号 / 编号超出范围）必须能被体检出来；
 *   5. 图片编号词汇是注入的 —— 换 `@图片 N` ↔ `图N` 只改注入处，本模块行为不变。
 *
 * 运行：npm run test:marker
 */
import assert from "node:assert";

import {
    MARKER_GRID,
    MARKER_MAX_VALUE,
    MARKER_MIN_DRAG_PX,
    MARKER_ISSUE_HINT,
    formatImageMarker,
    formatImageMarkers,
    hasImageMarkers,
    isDragTooSmall,
    markerFromBox,
    markerFromPoint,
    normalizeMarkerCoordinate,
    validateMarkerReferences,
} from "../src/lib/image-marker.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

// 我们这边的编号词汇（与 src/lib/image-reference-prompt.ts 一致），以及官方文档那套，用来证明词汇是注入的
const repoLabel = (index) => `@图片 ${index + 1}`;
const REPO_TOKEN = String.raw`@图片\s*(\d+)`;
const docLabel = (index) => `图${index + 1}`;
const DOC_TOKEN = String.raw`图\s*(\d+)`;

const SIZE = { width: 2000, height: 1000 };

// ---------- 坐标换算 ----------

check("归一化：四角与中点落点精确（1000×1000 网格，左上 0,0 / 右下 999,999）", () => {
    assert.strictEqual(MARKER_GRID, 1000);
    assert.strictEqual(MARKER_MAX_VALUE, 999);
    assert.strictEqual(normalizeMarkerCoordinate(0, 2000), 0);
    assert.strictEqual(normalizeMarkerCoordinate(2000, 2000), 999); // 右下角夹到 999，不是 1000
    assert.strictEqual(normalizeMarkerCoordinate(1000, 2000), 500); // 水平中点
    assert.strictEqual(normalizeMarkerCoordinate(500, 1000), 500); // 垂直中点
    // 官方换算 x = round(x_px / 宽 * 1000)
    assert.strictEqual(normalizeMarkerCoordinate(250, 2000), 125);
    assert.strictEqual(normalizeMarkerCoordinate(249, 2000), 125); // 124.5 → 125（四舍五入）
    assert.strictEqual(normalizeMarkerCoordinate(149, 2000), 75); // 74.5 → 75
});

check("归一化：越界与脏尺寸不产生 NaN（宁可夹住，也不要写出 <point>NaN NaN</point>）", () => {
    assert.strictEqual(normalizeMarkerCoordinate(-50, 2000), 0);
    assert.strictEqual(normalizeMarkerCoordinate(99999, 2000), 999);
    assert.strictEqual(normalizeMarkerCoordinate(Number.NaN, 2000), 0);
    assert.strictEqual(normalizeMarkerCoordinate(100, 0), 0);
    assert.strictEqual(normalizeMarkerCoordinate(100, -1), 0);
    assert.strictEqual(normalizeMarkerCoordinate(100, Number.NaN), 0);
});

// ---------- 点选 ----------

check("点选：像素点 → <point> 标记（坐标为归一化整数）", () => {
    assert.deepStrictEqual(markerFromPoint(0, { x: 1000, y: 250 }, SIZE), { kind: "point", imageIndex: 0, x: 500, y: 250 });
    assert.deepStrictEqual(markerFromPoint(1, { x: 0, y: 0 }, SIZE), { kind: "point", imageIndex: 1, x: 0, y: 0 });
    assert.deepStrictEqual(markerFromPoint(2, { x: 2000, y: 1000 }, SIZE), { kind: "point", imageIndex: 2, x: 999, y: 999 });
});

check("点选：脏输入返回 null（不生成半截标记）", () => {
    assert.strictEqual(markerFromPoint(0, { x: Number.NaN, y: 10 }, SIZE), null);
    assert.strictEqual(markerFromPoint(0, { x: 10, y: 10 }, { width: 0, height: 1000 }), null);
});

// ---------- 框选 ----------

check("框选：正着拖 / 反着拖都得到同一对有序坐标（x1<=x2、y1<=y2）", () => {
    const forward = markerFromBox(0, { x1: 200, y1: 200, x2: 1400, y2: 800 }, SIZE);
    const backward = markerFromBox(0, { x1: 1400, y1: 800, x2: 200, y2: 200 }, SIZE);
    assert.deepStrictEqual(forward, { kind: "bbox", imageIndex: 0, x1: 100, y1: 200, x2: 700, y2: 800 });
    assert.deepStrictEqual(backward, forward);
    // 混合方向（右下 → 左上再往下）：x、y 各自排序，不能只交换一次
    assert.deepStrictEqual(markerFromBox(0, { x1: 1400, y1: 200, x2: 200, y2: 800 }, SIZE), forward);
});

check("框选：贴边夹住（右下角 999、左上角 0），不写出 1000", () => {
    const box = markerFromBox(0, { x1: -100, y1: -100, x2: 99999, y2: 99999 }, SIZE);
    assert.deepStrictEqual(box, { kind: "bbox", imageIndex: 0, x1: 0, y1: 0, x2: 999, y2: 999 });
});

check("框选：退化成一个点/一条线的框直接丢（上游理解不了，用户却以为框住了）", () => {
    assert.strictEqual(markerFromBox(0, { x1: 500, y1: 500, x2: 500, y2: 500 }, SIZE), null);
    assert.strictEqual(markerFromBox(0, { x1: 500, y1: 100, x2: 500, y2: 900 }, SIZE), null); // 零宽
    assert.strictEqual(markerFromBox(0, { x1: 100, y1: 500, x2: 900, y2: 500 }, SIZE), null); // 零高
    // 小于 1 个归一化单位的拖拽：两角在网格上重合 → 同样丢掉（面板上还有 4px 误触过滤兜底）
    assert.strictEqual(markerFromBox(0, { x1: 1, y1: 1, x2: 2, y2: 2 }, SIZE), null);
    assert.strictEqual(markerFromBox(0, { x1: 10, y1: 10, x2: 20, y2: 20 }, { width: 0, height: 0 }), null);
});

check("误触判定：两个方向都不到 4px 才算误触（一个方向拉得够长就是真的在框）", () => {
    assert.strictEqual(MARKER_MIN_DRAG_PX, 4);
    assert.strictEqual(isDragTooSmall({ x: 10, y: 10 }, { x: 12, y: 12 }), true);
    assert.strictEqual(isDragTooSmall({ x: 10, y: 10 }, { x: 10, y: 10 }), true);
    assert.strictEqual(isDragTooSmall({ x: 10, y: 10 }, { x: 15, y: 10 }), false);
    assert.strictEqual(isDragTooSmall({ x: 10, y: 10 }, { x: 10, y: 60 }), false);
    assert.strictEqual(isDragTooSmall({ x: 10, y: 10 }, { x: 13, y: 900 }), false);
});

// ---------- 标记文字 ----------

check("标记文字：点选/框选按官方写法输出，图片编号写在标记前面", () => {
    assert.strictEqual(formatImageMarker({ kind: "point", imageIndex: 0, x: 500, y: 250 }, repoLabel), "@图片 1 <point>500 250</point>");
    assert.strictEqual(formatImageMarker({ kind: "bbox", imageIndex: 1, x1: 120, y1: 180, x2: 640, y2: 760 }, repoLabel), "@图片 2 <bbox>120 180 640 760</bbox>");
    // 官方文档那套词汇：换注入的 label，本模块一个字都不用改
    assert.strictEqual(formatImageMarker({ kind: "bbox", imageIndex: 0, x1: 120, y1: 180, x2: 640, y2: 760 }, docLabel), "图1 <bbox>120 180 640 760</bbox>");
});

check("标记文字：「保持不变」写在标记后面（官方要求不变的对象也要框出来并标注）", () => {
    assert.strictEqual(formatImageMarker({ kind: "bbox", imageIndex: 0, x1: 1, y1: 2, x2: 3, y2: 4, keepUnchanged: true }, repoLabel), "@图片 1 <bbox>1 2 3 4</bbox> 保持不变");
    assert.strictEqual(formatImageMarker({ kind: "point", imageIndex: 2, x: 5, y: 6, keepUnchanged: true }, repoLabel), "@图片 3 <point>5 6</point> 保持不变");
});

check("多标记拼接：按选择先后顺序串起来，点选与框选可以混用", () => {
    const text = formatImageMarkers(
        [
            { kind: "bbox", imageIndex: 0, x1: 120, y1: 180, x2: 640, y2: 760 },
            { kind: "point", imageIndex: 1, x: 500, y: 250 },
            { kind: "bbox", imageIndex: 1, x1: 10, y1: 20, x2: 30, y2: 40, keepUnchanged: true },
        ],
        repoLabel,
    );
    assert.strictEqual(text, "@图片 1 <bbox>120 180 640 760</bbox> @图片 2 <point>500 250</point> @图片 2 <bbox>10 20 30 40</bbox> 保持不变");
});

// ---------- 提交前体检 ----------

check("体检：干净的提示词不报问题（含没有标记的普通提示词）", () => {
    assert.deepStrictEqual(validateMarkerReferences("把 @图片 1 <bbox>120 180 640 760</bbox> 区域换成花园", { referenceCount: 1, tokenSource: REPO_TOKEN }), []);
    assert.deepStrictEqual(validateMarkerReferences("把背景换成花园", { referenceCount: 1, tokenSource: REPO_TOKEN }), []);
    assert.deepStrictEqual(validateMarkerReferences("", { referenceCount: 0, tokenSource: REPO_TOKEN }), []);
    // 跨图一句里两张：都在范围内就没问题
    assert.deepStrictEqual(validateMarkerReferences("把 @图片 1 <bbox>1 2 3 4</bbox> 的主体放到 @图片 2 <point>5 6</point>", { referenceCount: 2, tokenSource: REPO_TOKEN }), []);
});

check("体检：标记前没有图片编号 → noImageToken（模型不知道该改哪张图）", () => {
    const issues = validateMarkerReferences("<bbox>120 180 640 760</bbox> 区域换成花园", { referenceCount: 1, tokenSource: REPO_TOKEN });
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].reason, "noImageToken");
    assert.ok(MARKER_ISSUE_HINT.noImageToken.length > 0);
});

check("体检：编号越界 → outOfRange（删过参考图之后最容易出现）", () => {
    const cases = ["把 @图片 2 <bbox>1 2 3 4</bbox> 换掉", "把 @图片 0 <point>5 6</point> 换掉", "把 @图片 99 <bbox>1 2 3 4</bbox> 换掉"];
    cases.forEach((text) => {
        const issues = validateMarkerReferences(text, { referenceCount: 1, tokenSource: REPO_TOKEN });
        assert.strictEqual(issues.length, 1, text);
        assert.strictEqual(issues[0].reason, "outOfRange", text);
    });
    // 挂了 2 张时编号 2 是合法的
    assert.deepStrictEqual(validateMarkerReferences("把 @图片 2 <point>5 6</point> 换掉", { referenceCount: 2, tokenSource: REPO_TOKEN }), []);
});

check("体检：有标记但一张参考图都没有 → noReferences（上游无从下手）", () => {
    const issues = validateMarkerReferences("把 @图片 1 <bbox>1 2 3 4</bbox> 换成花园", { referenceCount: 0, tokenSource: REPO_TOKEN });
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].reason, "noReferences");
    assert.ok(MARKER_ISSUE_HINT.noReferences.length > 0);
});

check("体检：一处坏标记报一条，好标记不受牵连；词汇换成官方那套同样成立", () => {
    const text = "把 @图片 3 <bbox>1 2 3 4</bbox> 和 @图片 1 <point>5 6</point> 都处理掉";
    const issues = validateMarkerReferences(text, { referenceCount: 2, tokenSource: REPO_TOKEN });
    assert.strictEqual(issues.length, 1);
    assert.strictEqual(issues[0].imageIndex, 3);
    // 官方词汇：同一段文字用「图3」编号
    assert.deepStrictEqual(validateMarkerReferences("把 图1 <bbox>120 180 640 760</bbox> 区域替换成花园", { referenceCount: 1, tokenSource: DOC_TOKEN }), []);
    assert.strictEqual(validateMarkerReferences("把 图2 <bbox>120 180 640 760</bbox> 区域替换成花园", { referenceCount: 1, tokenSource: DOC_TOKEN }).length, 1);
});

check("体检：只认完整的标记对（半截的 <bbox> 不当标记，别对用户乱报错）", () => {
    assert.strictEqual(hasImageMarkers("把 @图片 1 <bbox>120 180 640 760</bbox> 换掉"), true);
    assert.strictEqual(hasImageMarkers("把 @图片 1 <bbox>120 180 640 760 换掉"), false);
    assert.strictEqual(hasImageMarkers("写了个小于号 < 和大于号 >"), false);
    assert.strictEqual(hasImageMarkers(""), false);
    assert.deepStrictEqual(validateMarkerReferences("把 @图片 1 <bbox>120 180 640 760 换掉", { referenceCount: 1, tokenSource: REPO_TOKEN }), []);
});

console.log(`\n交互编辑标记单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
