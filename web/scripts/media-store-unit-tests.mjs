/**
 * 中转素材目录的单元测试。
 *
 * 线上事故（2026-09-16）：GenVideo 报「素材地址无法访问，请更换地址后重试」。
 * 根因是中转素材目录用了 `process.cwd()/.media-store`，而生产 PM2 的 cwd 是
 * `.next/standalone` —— Next 构建默认 cleanDistDir，会把整个 `.next` 删掉重来，
 * 于是每次部署都清空已上传的参考图，上游随后拉取就只有 404。
 *
 * 这里锁死三条约束：
 *   1) 目录只由主目录推导，与进程 cwd 无关（cwd 在生产就是构建产物内部）；
 *   2) 解析结果永远不在构建产物（.next）里面，相对路径的配置也不行；
 *   3) 源码里不许再出现「用 process.cwd() 拼中转目录」的写法（事故原样复现即判失败）。
 *
 * 用例同时跑在 Windows（开发）与 Linux（生产）上，因此路径一律用 node:path 拼，
 * 不写死分隔符。
 *
 * 运行：npm run test:media
 */
import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MEDIA_FILE_ID_PATTERN, MEDIA_FILE_TTL_DAYS, MEDIA_FILE_TTL_MS, resolveMediaStoreDir } from "../src/lib/media-store.server.ts";

// 生产 PM2 的真实 exec cwd（pm2 describe sceneflow → /root/infinite-canvas/web/.next/standalone）
const ROOT = path.parse(process.cwd()).root;
const PROD_HOME = path.join(ROOT, "root");
const PROD_CWD = path.join(PROD_HOME, "infinite-canvas", "web", ".next", "standalone");
const DEFAULT_DIR = path.join(PROD_HOME, ".sceneflow", "media-store");

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

function assertOutsideBuildOutput(dir) {
    assert.ok(!path.normalize(dir).split(path.sep).includes(".next"), `目录落在构建产物里了（部署会被清空）：${dir}`);
}

console.log("中转素材目录");

check("线上事故回归：生产环境（cwd = .next/standalone）下目录仍在构建产物之外", () => {
    const dir = resolveMediaStoreDir(undefined, PROD_HOME);
    assert.equal(dir, DEFAULT_DIR);
    assertOutsideBuildOutput(dir);
    assert.ok(!dir.startsWith(PROD_CWD), `目录不该从 cwd 派生：${dir}`);
});

check("默认目录只由主目录决定，与进程 cwd 无关", () => {
    const otherHome = path.join(ROOT, "home", "deploy");
    assert.equal(resolveMediaStoreDir(undefined, otherHome), path.join(otherHome, ".sceneflow", "media-store"));
});

check("MEDIA_STORE_DIR 绝对路径按原样生效", () => {
    const configured = path.join(ROOT, "var", "lib", "sceneflow", "media");
    assert.equal(resolveMediaStoreDir(configured, PROD_HOME), configured);
});

check("MEDIA_STORE_DIR 相对路径按主目录展开，不会落回构建产物", () => {
    const dir = resolveMediaStoreDir(".media-store", PROD_HOME);
    assert.equal(dir, path.join(PROD_HOME, ".media-store"));
    assertOutsideBuildOutput(dir);
});

check("空串 / 空白按未配置处理；绝对路径的配置即使指向构建产物也照配置走", () => {
    assert.equal(resolveMediaStoreDir("", PROD_HOME), DEFAULT_DIR);
    assert.equal(resolveMediaStoreDir("   ", PROD_HOME), DEFAULT_DIR);
    assert.equal(resolveMediaStoreDir(`  ${path.join(PROD_CWD, ".media-store")}  `, PROD_HOME), path.join(PROD_CWD, ".media-store"));
});

console.log("事故根因的源码级约束");

check("解析逻辑不再用 process.cwd()（否则部署时 next build 会清空素材）", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/lib/media-store.server.ts", import.meta.url)), "utf8");
    const body = source.slice(source.indexOf("export function resolveMediaStoreDir"));
    assert.ok(!body.includes("process.cwd()"), "resolveMediaStoreDir 里又出现了 process.cwd()");
    assert.ok(body.includes("os.homedir()"), "默认目录应以 os.homedir() 为基准");
});

console.log("中转素材清理周期");

check("保留 7 天（用户隔天在同一个画布里重试仍能取到素材）", () => {
    assert.equal(MEDIA_FILE_TTL_DAYS, 7);
    assert.equal(MEDIA_FILE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
});

console.log("中转素材 id 校验");

check("32 位十六进制 + 白名单扩展名才认，路径穿越一律不认", () => {
    assert.equal(MEDIA_FILE_ID_PATTERN.test("827231aceb7a4e199ae8e682e34070b4.jpg"), true);
    assert.equal(MEDIA_FILE_ID_PATTERN.test("../../etc/passwd"), false);
    assert.equal(MEDIA_FILE_ID_PATTERN.test("827231aceb7a4e199ae8e682e34070b4.svg"), false);
    assert.equal(MEDIA_FILE_ID_PATTERN.test("827231aceb7a4e199ae8e682e34070b4"), false);
});

if (process.exitCode) console.error(`\n${passed} 项通过，存在失败`);
else console.log(`\n${passed} 项通过，全部通过`);
