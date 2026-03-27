import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const workspaceRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  root: __dirname,
  envDir: workspaceRoot,
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@convex": path.resolve(workspaceRoot, "convex"),
      "@shared": path.resolve(workspaceRoot, "packages/shared/src"),
      "@studio": path.resolve(__dirname, "src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    fs: {
      allow: [workspaceRoot]
    }
  },
  cacheDir: path.resolve(workspaceRoot, "node_modules/.vite/studio"),
  build: {
    outDir: path.resolve(workspaceRoot, "dist/studio/renderer"),
    emptyOutDir: true
  }
});
