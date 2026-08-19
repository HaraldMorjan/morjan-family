import assert from "node:assert/strict";
import test from "node:test";

import { cacheAlbumFolderId } from "./upload.js";

test("cacheAlbumFolderId replaces the observed stale cache value", async () => {
  let updateBindings = null;

  const environment = {
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              async first() {
                return { driveFolderId: "replacement-folder" };
              },
              async run() {
                updateBindings = bindings;
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const folderId = await cacheAlbumFolderId(
    environment,
    "album-id",
    "replacement-folder",
    "stale-folder"
  );

  assert.equal(folderId, "replacement-folder");
  assert.deepEqual(updateBindings, [
    "replacement-folder",
    "album-id",
    "stale-folder"
  ]);
});
