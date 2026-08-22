import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  base: "/games/english/",
  resolve: {
    alias: {
      "@shared": path.resolve(dirname, "../shared")
    }
  },
  server: {
    fs: {
      allow: [path.resolve(dirname, "..")]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
