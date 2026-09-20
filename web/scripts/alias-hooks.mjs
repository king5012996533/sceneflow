/**
 * 让「纯逻辑单测」能直接 import 带 `@/` 路径别名的业务模块（2026-09-20）。
 *
 * 背景：单测用 `node scripts/xxx-unit-tests.mjs` 跑（Node 24 自带 TS 类型擦除，不需要编译），
 * 但 `@/lib/foo` 是 Next/tsconfig 的路径别名，Node 自己不认识 —— 于是计费这类
 * 「纯函数在 lib、但引了同层别的 lib」的模块就没法直接被单测引用。
 * 过去的绕法是只测零依赖的小文件，代价是计费逻辑只能靠端到端验证，纯算错的地方测不出来。
 *
 * 这里用 Node 内置的同步模块钩子把 `@/x` 映射到 `src/x`（按 ts / tsx / index.ts / index.js 顺序试），
 * 不引第三方 loader、不改构建配置。用法：`node --import ./scripts/alias-hooks.mjs scripts/xxx.mjs`。
 *
 * 「先试文件、再认目录」是刻意的：`@/generated/ic-prisma` 是一个**目录**（Prisma 生成的客户端，
 * main 是 index.js），先判目录的话返回的是目录 URL，ESM 加载目录会直接 EISDIR —— 于是
 * `@/lib/ic-prisma.ts` 这条链整个引不进来（2026-09-20 跑计费端到端核对时踩到）。
 * 于是带 JS 的 index（生成的客户端是 JS，不是 TS）也要在候选里。
 *
 * ⚠️ 只做映射，不做类型擦除之外的任何转译 —— 与 Node 原生 TS 支持完全一致，
 * 所以「单测里能 import 的模块」和「运行时能跑的模块」是同一套限制（纯模块才行）。
 */
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATES = [".ts", ".tsx", ".mts", "/index.ts", "/index.tsx", "/index.js", "/index.mjs"];

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
        const base = join(projectRoot, "src", specifier.slice(2));
        const hit =
            CANDIDATES.map((ext) => `${base}${ext}`).find((candidate) => existsSync(candidate)) ??
            (existsSync(base) && statSync(base).isFile() ? base : undefined);
        if (!hit) {
            throw new Error(`别名 ${specifier} 未找到对应文件（基线 ${base}）——单测的 import 路径写错了？`);
        }
        return { url: pathToFileURL(hit).href, shortCircuit: true };
    },
});
