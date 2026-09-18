/**
 * 生成成品上报/归档的纯逻辑单测：地址归一、MIME 兜底、多份合并。
 *
 * 起因：2026-09-18 线上 nginx 显示上游 99% 是 200，但任务成功率只有 55%。
 * 钱花在上游成功了，结果丢在我们自己的交付环节（下载/上传/回报全在用户标签页里）。
 * 修法是客户端一拿到地址就上报、服务端先认领再归档，这里钉住三件事：
 *   1) 地址归一：只收 http(s) 直链（data: 形态由浏览器自己带着字节），去空白、限量限长；
 *   2) 合并规则：已归档的本地键不得被后来的 CDN 直链「倒推」回去（否则用户过几天就打不开了）；
 *   3) 常量边界：上限不许被顺手调大（100MB / 8 份），否则一次上报就能拖垮归档。
 *
 * 运行：npm run test:result
 */
import assert from "node:assert";

import { MAX_RESULT_BYTES, MAX_RESULT_URL_LENGTH, MAX_RESULT_URLS, RESULT_FETCH_TIMEOUT_MS, guessMimeType, isArchivedResultItem, mergeResultItems, normalizeResultUrls, resultMediaPath } from "../src/lib/generation/generation-result.ts";

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

check("常量边界：单份 100MB、单次 8 份、地址 1000 字符、下载时限 2 分钟", () => {
    assert.strictEqual(MAX_RESULT_BYTES, 100 * 1024 * 1024);
    assert.strictEqual(MAX_RESULT_URLS, 8);
    assert.strictEqual(MAX_RESULT_URL_LENGTH, 1000);
    assert.strictEqual(RESULT_FETCH_TIMEOUT_MS, 120_000);
});

check("MIME 兜底：按扩展名判断，且能穿过查询串", () => {
    assert.strictEqual(guessMimeType("https://cdn.example.com/a/b.png"), "image/png");
    assert.strictEqual(guessMimeType("https://cdn.example.com/a/b.PNG?x=1&y=2"), "image/png");
    assert.strictEqual(guessMimeType("https://cdn.example.com/x.jpeg"), "image/jpeg");
    assert.strictEqual(guessMimeType("https://cdn.example.com/v.mp4?auth=abc"), "video/mp4");
    assert.strictEqual(guessMimeType("https://cdn.example.com/v.mov"), "video/quicktime");
});

check("MIME 兜底：认不出来时给 octet-stream，不许猜成图片", () => {
    assert.strictEqual(guessMimeType("https://cdn.example.com/task_result"), "application/octet-stream");
    assert.strictEqual(guessMimeType(""), "application/octet-stream");
});

check("地址归一：非数组 / 空值 -> 空数组（路由据此判 400）", () => {
    for (const bad of [undefined, null, "https://a.com/x.png", 42, {}]) {
        assert.deepStrictEqual(normalizeResultUrls(bad), [], `input=${String(bad)}`);
    }
    assert.deepStrictEqual(normalizeResultUrls([]), []);
});

check("地址归一：只收 http(s) 直链，data:/ftp:/相对地址一律不要", () => {
    assert.deepStrictEqual(normalizeResultUrls(["data:image/png;base64,AAAA"]), []);
    assert.deepStrictEqual(normalizeResultUrls(["ftp://cdn.example.com/a.png"]), []);
    assert.deepStrictEqual(normalizeResultUrls(["/api/generation/jobs/x/media/0"]), []);
    assert.deepStrictEqual(normalizeResultUrls(["https://cdn.example.com/a.png"]), ["https://cdn.example.com/a.png"]);
    assert.deepStrictEqual(normalizeResultUrls(["http://cdn.example.com/a.png"]), ["http://cdn.example.com/a.png"]);
});

check("地址归一：去空白、丢超长、限量 8 份且保序", () => {
    assert.deepStrictEqual(normalizeResultUrls(["  https://cdn.example.com/a.png  "]), ["https://cdn.example.com/a.png"]);
    assert.deepStrictEqual(normalizeResultUrls([`https://cdn.example.com/${"a".repeat(MAX_RESULT_URL_LENGTH)}`]), []);
    const many = Array.from({ length: 12 }, (_, index) => `https://cdn.example.com/${index}.png`);
    assert.deepStrictEqual(normalizeResultUrls(many), many.slice(0, MAX_RESULT_URLS));
});

check("合并：没有旧记录时直接落新记录", () => {
    const items = [{ archiveKey: "job/0", mimeType: "image/png", bytes: 10 }];
    assert.deepStrictEqual(mergeResultItems(null, items), items);
    assert.deepStrictEqual(mergeResultItems({}, items), items);
});

check("合并：新归档覆盖旧的裸地址（同一份成品这次真的下下来了）", () => {
    const merged = mergeResultItems([{ url: "https://cdn.example.com/a.png" }], [{ archiveKey: "job/0", mimeType: "image/png", bytes: 10 }]);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(merged[0].archiveKey, "job/0");
});

check("关键反向用例：已归档的本地键不得被后来的 CDN 直链倒推回去", () => {
    const merged = mergeResultItems([{ archiveKey: "job/0", mimeType: "image/png", bytes: 10 }], [{ url: "https://cdn.example.com/a.png" }]);
    assert.deepStrictEqual(merged[0], { archiveKey: "job/0", mimeType: "image/png", bytes: 10 });
});

check("合并：按下标对齐，长度取两边最大（先认领后归档的两步写不会互相抹掉）", () => {
    const previous = [{ url: "https://cdn.example.com/0.png" }, { url: "https://cdn.example.com/1.png" }];
    const incoming = [{ archiveKey: "job/0", mimeType: "image/png", bytes: 10 }];
    const merged = mergeResultItems(previous, incoming);
    assert.strictEqual(merged.length, 2);
    assert.strictEqual(merged[0].archiveKey, "job/0");
    assert.deepStrictEqual(merged[1], { url: "https://cdn.example.com/1.png" });
});

check("isArchivedResultItem：只有带 archiveKey 的才算已归档", () => {
    assert.strictEqual(isArchivedResultItem({ archiveKey: "job/0", mimeType: "image/png", bytes: 1 }), true);
    assert.strictEqual(isArchivedResultItem({ url: "https://cdn.example.com/a.png" }), false);
    assert.strictEqual(isArchivedResultItem(null), false);
    assert.strictEqual(isArchivedResultItem({ archiveKey: 7 }), false);
});

check("取件地址：与客户端 archivedMediaUrls 同一形状（相对路径，不带 /canvas 前缀）", () => {
    assert.strictEqual(resultMediaPath("job-1", 0), "/api/generation/jobs/job-1/media/0");
    assert.strictEqual(resultMediaPath("a b/c", 3), "/api/generation/jobs/a%20b%2Fc/media/3");
});

console.log(`\n成品归档单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
