import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, isAbsolute, normalize } from "node:path";
import os from "node:os";

/**
 * 生成成品归档目录（服务端专用）。
 *
 * 这个目录必须在 `next build` 的清理范围之外：Next 默认 cleanDistDir，构建时递归删掉整个
 * `.next`；而生产 PM2 进程的 cwd 恰好就是 `.next/standalone`。早先这里用
 * `process.cwd()/.data/generation-media`，等于**每部署一次就把用户已归档的成品全部删掉**
 * —— 表现是「上游已出图计费、用户回头却打不开」。与 media-store / asset-cache 同一条规则：
 * 目录只由用户主目录推导，绝不用 cwd。
 */
export function resolveGenerationMediaDir(configured?: string | null, home: string = os.homedir()) {
    const raw = (configured || "").trim();
    if (!raw) return join(home, ".sceneflow", "generation-media");
    return isAbsolute(raw) ? normalize(raw) : join(home, raw);
}

const root = resolveGenerationMediaDir(process.env.GENERATION_MEDIA_DIR);

function safeKey(key: string) {
    const normalized = key.replace(/\\/g, "/");
    if (!/^[a-zA-Z0-9/_-]+$/.test(normalized) || normalized.includes("..")) throw new Error("非法媒体归档键");
    return normalized;
}

export async function archiveGenerationMedia(key: string, body: ArrayBuffer) {
    const file = join(root, safeKey(key));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(body));
    return { key, bytes: body.byteLength };
}

export async function readGenerationMedia(key: string) {
    return readFile(join(root, safeKey(key)));
}
