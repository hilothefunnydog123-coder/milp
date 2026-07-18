import { defineConfig } from "vitest/config";

export default defineConfig({
  // Inline (empty) PostCSS config so vitest never walks up the directory
  // tree looking for one — this is a pure-TS library with no CSS.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
  },
});
