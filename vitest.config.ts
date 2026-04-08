import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@convex": path.resolve(rootDir, "convex"),
      "@shared": path.resolve(rootDir, "packages/shared/src"),
      "@site": path.resolve(rootDir, "apps/site/src"),
      "@studio": path.resolve(rootDir, "apps/studio/src")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "convex/_generated/**",
        "dist/**",
        "node_modules/**",
        "release/**",
        "scripts/**",
        "tests/**",
        "**/*.d.ts",
        "**/vite.config.ts",
        "tailwind.config.ts"
      ]
    }
  }
});
