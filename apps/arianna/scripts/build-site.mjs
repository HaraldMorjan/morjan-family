import {
  cpSync,
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readdirSync,
  unlinkSync
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const ariannaRoot = join(rootDirectory, "..");
const distDirectory = join(ariannaRoot, "dist");

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

const copyIfExists = (fromPath, toPath) => {
  if (!existsSync(fromPath)) {
    throw new Error(`Missing path: ${fromPath}`);
  }
  cpSync(fromPath, toPath, { recursive: true });
};

console.log("Installing game dependencies…");
["counting", "reading", "english"].forEach((gameName) => {
  run("npm", ["install"], join(ariannaRoot, "games", gameName));
});

console.log("Building games…");
["counting", "reading", "english"].forEach((gameName) => {
  run("npm", ["run", "build"], join(ariannaRoot, "games", gameName));
});

console.log("Assembling dist…");
if (existsSync(distDirectory)) {
  rmSync(distDirectory, { recursive: true, force: true });
}
mkdirSync(distDirectory, { recursive: true });

[
  "index.html",
  "styles.css",
  "app.js",
  "confetti.html",
  "confetti.css",
  "confetti.js"
].forEach((fileName) => {
  copyIfExists(join(ariannaRoot, fileName), join(distDirectory, fileName));
});

mkdirSync(join(distDirectory, "games"), { recursive: true });
copyIfExists(
  join(ariannaRoot, "games", "index.html"),
  join(distDirectory, "games", "index.html")
);
copyIfExists(
  join(ariannaRoot, "games", "hub.js"),
  join(distDirectory, "games", "hub.js")
);
copyIfExists(
  join(ariannaRoot, "games", "hub.css"),
  join(distDirectory, "games", "hub.css")
);
copyIfExists(
  join(ariannaRoot, "games", "shared"),
  join(distDirectory, "games", "shared")
);
readdirSync(join(distDirectory, "games", "shared")).forEach((fileName) => {
  if (fileName.endsWith(".test.mjs")) {
    unlinkSync(join(distDirectory, "games", "shared", fileName));
  }
});
copyIfExists(
  join(ariannaRoot, "games", "qr"),
  join(distDirectory, "games", "qr")
);

copyIfExists(
  join(ariannaRoot, "games", "counting", "dist"),
  join(distDirectory, "games", "counting")
);
copyIfExists(
  join(ariannaRoot, "games", "reading", "dist"),
  join(distDirectory, "games", "reading")
);
copyIfExists(
  join(ariannaRoot, "games", "english", "dist"),
  join(distDirectory, "games", "english")
);

writeFileSync(
  join(distDirectory, "_headers"),
  `/*
  Cache-Control: public, max-age=0, must-revalidate
`
);

console.log("Build complete → apps/arianna/dist");
