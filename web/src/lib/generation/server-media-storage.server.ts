import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.env.GENERATION_MEDIA_DIR || join(process.cwd(), ".data", "generation-media");

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
