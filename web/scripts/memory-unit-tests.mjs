/**
 * 工程记忆（记忆层）单元测试。
 *
 * 这段逻辑是整个记忆层最容易出错、又最难在界面上一眼看出来的部分：
 * 模型写进来的东西形状不可控、资产要按名字去重、列表要保留最新而不是最早的。
 * Node 24 能直接剥离类型导入 .ts，所以这里不引入任何测试框架，直接跑真实模块。
 *
 * 运行：npm run test:memory
 */
import assert from "node:assert";

import {
    createEmptyMemory,
    describeMemoryForPrompt,
    isEmptyMemory,
    mergeMemory,
    normalizeMemory,
    summarizeMemory,
} from "../src/app/(user)/canvas/engine/memory/project-memory.ts";

let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  ok  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}: ${error.message}`);
        process.exitCode = 1;
    }
}

check("空记忆判定", () => {
    assert.strictEqual(isEmptyMemory(createEmptyMemory()), true);
    assert.strictEqual(describeMemoryForPrompt(createEmptyMemory()), "");
    assert.strictEqual(summarizeMemory(createEmptyMemory()), "工程记忆为空。");
});

check("脏数据规整：非法形状不会抛错，也不会漏进结果", () => {
    assert.deepStrictEqual(normalizeMemory(null).assets, []);
    assert.deepStrictEqual(normalizeMemory("乱七八糟").assets, []);
    assert.deepStrictEqual(normalizeMemory([]).assets, []);
    const messy = normalizeMemory({
        brief: 42,
        style: "不是对象",
        assets: [null, 7, { name: "" }, { name: "林默", kind: "不认识的类型", nodeIds: "不是数组" }, { kind: "character", name: "  苏晚  " }],
        continuity: "不是数组",
        decisions: [1, true, "统一 2K"],
    });
    assert.strictEqual(messy.brief, "42");
    assert.strictEqual(messy.style, undefined);
    assert.strictEqual(messy.assets.length, 2, "只有两条合法资产应保留");
    assert.strictEqual(messy.assets[0].kind, "other", "未知 kind 应归到 other");
    assert.deepStrictEqual(messy.assets[0].nodeIds, []);
    assert.strictEqual(messy.assets[1].name.trim(), "苏晚", "资产名应去除首尾空格");
    assert.deepStrictEqual(messy.continuity, []);
    assert.deepStrictEqual(messy.decisions, ["1", "true", "统一 2K"]);
});

check("增量合并：同名同类型资产是更新而不是新增", () => {
    let memory = mergeMemory(createEmptyMemory(), {
        brief: "雨夜剑客觉醒",
        assets: [{ kind: "character", name: "林默", anchor: "左脸刀疤", nodeIds: ["n1"] }],
    });
    memory = mergeMemory(memory, { assets: [{ kind: "character", name: "林默", nodeIds: ["n2"] }] });
    assert.strictEqual(memory.assets.length, 1, "同名角色不应重复建档");
    assert.deepStrictEqual(memory.assets[0].nodeIds, ["n1", "n2"], "节点引用应合并");
    assert.strictEqual(memory.assets[0].anchor, "左脸刀疤", "模型漏写锚点时旧锚点不能被抹掉");
    assert.strictEqual(memory.brief, "雨夜剑客觉醒", "未提供 brief 时保留旧值");
});

check("增量合并：大小写不同视为同一资产", () => {
    let memory = mergeMemory(createEmptyMemory(), { assets: [{ kind: "character", name: "Lin Mo" }] });
    memory = mergeMemory(memory, { assets: [{ kind: "character", name: "lin mo", notes: "第二版" }] });
    assert.strictEqual(memory.assets.length, 1);
    assert.strictEqual(memory.assets[0].notes, "第二版");
});

check("同类型不同名 / 不同类型同名都各自建档", () => {
    const memory = mergeMemory(createEmptyMemory(), {
        assets: [{ kind: "character", name: "林默" }, { kind: "scene", name: "林默" }, { kind: "character", name: "苏晚" }],
    });
    assert.strictEqual(memory.assets.length, 3);
});

check("列表追加去重，且只保留最新的 N 条", () => {
    let memory = createEmptyMemory();
    memory = mergeMemory(memory, { continuity: ["A", "B", "A"] });
    assert.deepStrictEqual(memory.continuity, ["A", "B"], "重复项应折叠");
    memory = mergeMemory(memory, { continuity: ["B", "C"] });
    assert.deepStrictEqual(memory.continuity, ["A", "B", "C"]);
    const many = Array.from({ length: 60 }, (_, index) => `约束${index}`);
    const capped = mergeMemory(memory, { continuity: many });
    assert.strictEqual(capped.continuity.length, 40, "连续性约束应被裁剪到 40 条");
    assert.strictEqual(capped.continuity.at(-1), "约束59", "应保留最新的一条");
});

check("风格锁：逐字段合并，未提供则沿用", () => {
    let memory = mergeMemory(createEmptyMemory(), { style: { positive: "水墨", negative: "模糊" } });
    memory = mergeMemory(memory, { style: { notes: "统一冷色调" } });
    assert.strictEqual(memory.style.positive, "水墨");
    assert.strictEqual(memory.style.negative, "模糊");
    assert.strictEqual(memory.style.notes, "统一冷色调");
});

check("提示词渲染：摘要版有条目上限，全文版给全", () => {
    const assets = Array.from({ length: 30 }, (_, index) => ({ kind: "character", name: `角色${index}`, anchor: `锚点${index}` }));
    const memory = mergeMemory(createEmptyMemory(), { brief: "测试工程", assets, continuity: ["C1"], decisions: ["D1"] });
    const brief = describeMemoryForPrompt(memory);
    const full = describeMemoryForPrompt(memory, true);
    assert.ok(brief.includes("【工程记忆】"));
    assert.ok(brief.includes("角色29"), "摘要应包含最近的资产");
    assert.ok(!brief.includes("角色0"), "摘要不应包含最早被挤掉的资产");
    assert.ok(full.includes("角色0"), "全文版应包含最早建立的资产");
    assert.ok(full.length > brief.length);
});

check("合并后不修改传入对象（纯函数）", () => {
    const original = mergeMemory(createEmptyMemory(), { assets: [{ kind: "character", name: "林默" }] });
    const snapshot = JSON.stringify(original);
    mergeMemory(original, { assets: [{ kind: "character", name: "林默", nodeIds: ["x"] }], continuity: ["新约束"] });
    assert.strictEqual(JSON.stringify(original), snapshot, "原记忆对象不应被就地修改");
});

console.log(`\n${passed} 项通过${process.exitCode ? "，存在失败项" : "，全部通过"}`);
