/**
 * 成品素材服务端副本（asset-cache）的单元测试。
 *
 * 起因：2026-09-18 线上事故 —— 上游已出图并计费（apimart 记费 $0.02925），前端经
 * /api/proxy/asset 取图却拿到 502，用户看到的是「后台已扣费出图，前端没有图」。
 * 那段链路有两个坑：CDN 域名解析出多个 IP 而个别 IP 在境内连不通（一次请求只钉第一个解析结果）；
 * 上游 24 小时后清理成品图。取过一次就留本地副本可以同时堵住这两个坑。
 *
 * 这里锁死四件事：
 *   1) 目录规则与 media-store 一致：只由主目录推导，绝不用 process.cwd()
 *      （生产 PM2 的 cwd 是 .next/standalone，next build 会把它整个删掉）；
 *   2) 副本只在「新鲜 + 元信息与 URL 对得上 + 字节数一致」时才算命中；
 *   3) 清理策略是「先过期、再最旧优先」，且超限判断只看仍新鲜的条目；
 *   4) 读写失败一律降级为「未命中」，绝不因为缓存出问题而让素材下载失败。
 *
 * 运行：npm run test:cache
 */
import assert from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
    ASSET_CACHE_TTL_MS,
    assetCacheKey,
    isAssetCacheFresh,
    pickAssetCacheEvictions,
    pruneAssetCache,
    readCachedAsset,
    resolveAssetCacheDir,
    writeCachedAsset,
} from "../src/lib/asset-cache.server.ts";

let passed = 0;
const failures = [];

async function check(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

const URL_A = "https://getapib.org/image/9998210271445204-f930a145-7be6-468f-b090-e2ca6b2e2d74-image_task_01M2T24ZRG958WW31JCYC84DG9_0.jpg";
const URL_B = "https://getapib.org/f/images/image-1f1b3515-61d2-66f0-94f9-3013eac5d418-0.jpg";

const tmpDirs = [];
async function makeDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "asset-cache-test-"));
    tmpDirs.push(dir);
    return dir;
}

// —— 1) 目录规则 ——
await check("默认目录在家目录下，且不在构建产物里", () => {
    const dir = resolveAssetCacheDir(null, path.join(path.sep, "home", "tester"));
    assert.strictEqual(dir, path.join(path.sep, "home", "tester", ".sceneflow", "asset-cache"));
    assert.ok(!dir.includes(`${path.sep}.next${path.sep}`), "缓存目录不允许落在 .next 构建产物内");
});

await check("相对路径配置按主目录展开（防止配成相对路径又写回构建产物）", () => {
    const dir = resolveAssetCacheDir("my-cache", path.join(path.sep, "home", "tester"));
    assert.strictEqual(dir, path.join(path.sep, "home", "tester", "my-cache"));
});

await check("绝对路径配置原样规范化", () => {
    const absolute = path.join(path.sep, "var", "tmp", "asset-cache");
    assert.strictEqual(resolveAssetCacheDir(absolute, path.join(path.sep, "home", "tester")), path.normalize(absolute));
});

// —— 2) 键 ——
await check("键是稳定的 32 位十六进制，不同 URL 不同键", () => {
    const key = assetCacheKey(URL_A);
    assert.match(key, /^[a-f0-9]{32}$/);
    assert.strictEqual(assetCacheKey(URL_A), key);
    assert.notStrictEqual(assetCacheKey(URL_B), key);
});

// —— 3) 新鲜度 ——
await check("保质期判定：期内新鲜、过期为旧、时间戳不合法按过期处理", () => {
    const now = 1_700_000_000_000;
    assert.strictEqual(isAssetCacheFresh(now - 1000, now), true);
    assert.strictEqual(isAssetCacheFresh(now - ASSET_CACHE_TTL_MS - 1, now), false);
    assert.strictEqual(isAssetCacheFresh(0, now), false);
    assert.strictEqual(isAssetCacheFresh(undefined, now), false);
    assert.strictEqual(isAssetCacheFresh(Number.NaN, now), false);
});

// —— 4) 清理策略 ——
await check("过期条目一律清理", () => {
    const now = 1_700_000_000_000;
    const evicted = pickAssetCacheEvictions(
        [
            { key: "a".repeat(32), bytes: 10, storedAt: now - ASSET_CACHE_TTL_MS - 1 },
            { key: "b".repeat(32), bytes: 10, storedAt: now },
        ],
        now,
    );
    assert.deepStrictEqual(evicted, ["a".repeat(32)]);
});

await check("超条数上限时按最旧优先清理", () => {
    const now = 1_700_000_000_000;
    const entries = [
        { key: "a".repeat(32), bytes: 1, storedAt: now - 3000 },
        { key: "b".repeat(32), bytes: 1, storedAt: now - 2000 },
        { key: "c".repeat(32), bytes: 1, storedAt: now - 1000 },
    ];
    const evicted = pickAssetCacheEvictions(entries, now, { maxEntries: 2 });
    assert.deepStrictEqual(evicted, ["a".repeat(32)]);
});

await check("超总量上限时按最旧优先清理（只统计仍新鲜的条目）", () => {
    const now = 1_700_000_000_000;
    const entries = [
        { key: "a".repeat(32), bytes: 100, storedAt: now - 3000 },
        { key: "b".repeat(32), bytes: 100, storedAt: now - 2000 },
        { key: "c".repeat(32), bytes: 100, storedAt: now - 1000 },
        // 已过期：本来就要删，不该再占配额把新鲜条目挤掉
        { key: "d".repeat(32), bytes: 100_000, storedAt: now - ASSET_CACHE_TTL_MS - 1 },
    ];
    const evicted = pickAssetCacheEvictions(entries, now, { maxBytes: 250 });
    assert.deepStrictEqual(evicted.sort(), ["a".repeat(32), "d".repeat(32)].sort());
});

// —— 5) 落盘读写 ——
await check("写入后读得到：字节与 MIME 一致", async () => {
    const dir = await makeDir();
    const body = Buffer.from("fake-jpeg-bytes-0123456789");
    await writeCachedAsset(URL_A, { body, contentType: "image/jpeg" }, { dir, now: 1_700_000_000_000 });
    const cached = await readCachedAsset(URL_A, { dir, now: 1_700_000_000_000 + 1000 });
    assert.ok(cached, "应该命中");
    assert.strictEqual(Buffer.compare(cached.body, body), 0);
    assert.strictEqual(cached.contentType, "image/jpeg");
});

await check("没写过的 URL 不命中", async () => {
    const dir = await makeDir();
    await writeCachedAsset(URL_A, { body: Buffer.from("x"), contentType: "image/jpeg" }, { dir });
    assert.strictEqual(await readCachedAsset(URL_B, { dir }), null);
});

await check("过期副本不命中（宁可回源）", async () => {
    const dir = await makeDir();
    await writeCachedAsset(URL_A, { body: Buffer.from("x"), contentType: "image/jpeg" }, { dir, now: 1_700_000_000_000 });
    assert.strictEqual(await readCachedAsset(URL_A, { dir, now: 1_700_000_000_000 + ASSET_CACHE_TTL_MS + 1 }), null);
});

await check("元信息与 URL 对不上（键撞了）不命中，避免把别人的图回给用户", async () => {
    const dir = await makeDir();
    await writeCachedAsset(URL_A, { body: Buffer.from("x"), contentType: "image/jpeg" }, { dir });
    const metaPath = path.join(dir, `${assetCacheKey(URL_A)}.json`);
    const meta = JSON.parse(await readFile(metaPath, "utf8"));
    meta.url = URL_B;
    await writeFile(metaPath, JSON.stringify(meta));
    assert.strictEqual(await readCachedAsset(URL_A, { dir }), null);
});

await check("副本被截断（字节数与元信息不符）不命中", async () => {
    const dir = await makeDir();
    await writeCachedAsset(URL_A, { body: Buffer.from("0123456789"), contentType: "image/jpeg" }, { dir });
    await writeFile(path.join(dir, `${assetCacheKey(URL_A)}.bin`), "0123");
    assert.strictEqual(await readCachedAsset(URL_A, { dir }), null);
});

await check("只剩元信息、没有副本文件时不命中", async () => {
    const dir = await makeDir();
    await writeCachedAsset(URL_A, { body: Buffer.from("x"), contentType: "image/jpeg" }, { dir });
    await rm(path.join(dir, `${assetCacheKey(URL_A)}.bin`), { force: true });
    assert.strictEqual(await readCachedAsset(URL_A, { dir }), null);
});

await check("目录不存在时读不炸、清理也不炸（降级为未命中）", async () => {
    const dir = path.join(os.tmpdir(), `asset-cache-missing-${Date.now()}`);
    assert.strictEqual(await readCachedAsset(URL_A, { dir }), null);
    assert.strictEqual(await pruneAssetCache({ dir }), 0);
});

// —— 6) 清理真的删文件 ——
await check("prune 删掉过期副本的体与元信息，保留新鲜的", async () => {
    const dir = await makeDir();
    const now = 1_700_000_000_000;
    await writeCachedAsset(URL_A, { body: Buffer.from("old"), contentType: "image/jpeg" }, { dir, now: now - ASSET_CACHE_TTL_MS - 1 });
    await writeCachedAsset(URL_B, { body: Buffer.from("new"), contentType: "image/png" }, { dir, now });

    const removed = await pruneAssetCache({ dir, now });
    assert.strictEqual(removed, 1);
    const keyA = assetCacheKey(URL_A);
    await assert.rejects(() => readFile(path.join(dir, `${keyA}.bin`)));
    await assert.rejects(() => readFile(path.join(dir, `${keyA}.json`)));
    const kept = await readCachedAsset(URL_B, { dir, now });
    assert.ok(kept, "新鲜副本应保留");
    assert.strictEqual(kept.contentType, "image/png");
});

// —— 7) 线上事故原样复现即判失败：目录不能由 cwd 推导 ——
await check("源码里不许用 process.cwd() 拼缓存目录（注释里说明事故可以，代码里不行）", () => {
    const source = readFileSync(new URL("../src/lib/asset-cache.server.ts", import.meta.url), "utf8");
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/process\.cwd\(\)/.test(codeOnly), "asset-cache.server.ts 不得使用 process.cwd()（生产 cwd 是被构建清空的 .next/standalone）");
});

for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true });

console.log(`\n素材缓存单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
