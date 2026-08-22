import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "/games/counting/",
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
