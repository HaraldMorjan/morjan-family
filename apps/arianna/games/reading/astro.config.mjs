import { defineConfig } from "astro/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/games/reading/",
  outDir: "dist",
  vite: {
    resolve: {
      alias: {
        "@shared": path.resolve(dirname, "../shared")
      }
    }
  }
});
