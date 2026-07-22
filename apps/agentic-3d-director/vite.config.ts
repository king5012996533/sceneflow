import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const modelLibraryRoot = resolve(projectRoot, "../模型库");

export default defineConfig({
  base: "/",
  assetsInclude: ["**/*.fbx", "**/*.obj"],
  plugins: [react()],
  server: {
    proxy: {
      "/api/director-agent": "http://127.0.0.1:4319",
    },
    fs: {
      allow: [projectRoot, modelLibraryRoot],
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "agent-service/**/*.test.mjs"],
    globals: true,
    pool: "threads",
    maxWorkers: 1,
    setupFiles: "./src/test/setup.ts",
  },
});
