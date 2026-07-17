import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  splitting: false,
  noExternal: [/.*/],
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      "@scopeparity/core": new URL("../core/src/index.ts", import.meta.url).pathname,
    };
  },
});
