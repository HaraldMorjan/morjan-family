import assert from "node:assert/strict";
import test from "node:test";

import {
  cacheAlbumFolderId,
  ensureAlbumRow,
  ensureTripRow
} from "./upload.js";

test("ensureTripRow tolerates a concurrent insert for the same id", async () => {
  let selectCount = 0;
  let insertSql = "";

  const winningTrip = {
    id: "summer-trip",
    title: "summer-trip",
    driveFolderId: "trip-folder"
  };

  const environment = {
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              async first() {
                selectCount += 1;
                return selectCount === 1 ? null : winningTrip;
              },
              async run() {
                insertSql = sql;
                return { success: true, meta: { changes: 0 } };
              }
            };
          }
        };
      }
    }
  };

  const result = await ensureTripRow(environment, "summer-trip");

  assert.match(insertSql, /ON CONFLICT \(id\) DO NOTHING/);
  assert.deepEqual(result, {
    created: false,
    tripId: "summer-trip",
    title: "summer-trip",
    driveFolderId: "trip-folder"
  });
});

test("ensureAlbumRow tolerates a concurrent insert for the same slug", async () => {
  let selectCount = 0;
  let insertSql = "";

  const existingAlbum = {
    id: "winning-album",
    slug: "unsorted",
    name: "Unsorted",
    driveFolderId: null
  };

  const environment = {
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              async first() {
                selectCount += 1;
                return selectCount === 1 ? null : existingAlbum;
              },
              async run() {
                insertSql = sql;
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  const result = await ensureAlbumRow(environment, "summer-trip", "Unsorted");

  assert.match(insertSql, /ON CONFLICT \(trip_id, slug\) DO NOTHING/);
  assert.deepEqual(result, {
    created: false,
    albumId: "winning-album",
    slug: "unsorted",
    name: "Unsorted",
    driveFolderId: null
  });
});

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
