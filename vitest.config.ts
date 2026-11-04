import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

function loadEnvTest(): Record<string, string> {
  const envTestPath = path.resolve(__dirname, ".env.test");
  const envMap: Record<string, string> = {};

  if (fs.existsSync(envTestPath)) {
    const content = fs.readFileSync(envTestPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      envMap[key] = val;
      process.env[key] = val;
    }
  }

  return envMap;
}

const testEnv = loadEnvTest();

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    env: testEnv,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

