import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDir, "..");
const repoRoot = resolve(webRoot, "..");
const sourceDir = resolve(repoRoot, "apps", "agentic-3d-director", "dist");
const targetDir = resolve(webRoot, "public", "director-desk");

await rm(targetDir, { force: true, recursive: true });
await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });

console.log(`Synced Director Desk static files to ${targetDir}`);
