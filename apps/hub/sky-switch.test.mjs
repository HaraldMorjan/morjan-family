import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("the sky switch initially selects only Auto", () => {
  const skyButtons = [...html.matchAll(/<button\b([^>]*)>/g)]
    .map(([, attributes]) => ({
      id: attributes.match(/\bid="([^"]+)"/)?.[1],
      pressed: attributes.match(/\baria-pressed="(true|false)"/)?.[1]
    }))
    .filter(({ id }) => id?.startsWith("sky"));

  assert.deepEqual(skyButtons, [
    { id: "skySunButton", pressed: "false" },
    { id: "skyMoonButton", pressed: "false" },
    { id: "skyAutoButton", pressed: "true" }
  ]);
});
