import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@scopeparity/core": new URL("../core/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
    },
  },
});
