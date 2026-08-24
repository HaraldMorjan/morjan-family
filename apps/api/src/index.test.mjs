import assert from "node:assert/strict";
import test from "node:test";

import { createTrip } from "./index.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });

test("createTrip resumes a row left incomplete by Drive failure", async () => {
  const originalFetch = globalThis.fetch;
  const lookedUpTripIds = [];
  const updates = [];

  const incompleteTrip = {
    id: "summer-trip",
    title: "Summer Trip",
    driveFolderId: null
  };

  const environment = {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder",
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              async first() {
                if (
                  sql.includes("FROM trips") &&
                  sql.includes("drive_folder_id AS driveFolderId")
                ) {
                  lookedUpTripIds.push(bindings[0]);
                  return incompleteTrip;
                }
                throw new Error(`Unexpected first() query: ${sql}`);
              },
              async run() {
                updates.push(bindings);
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  globalThis.fetch = async (url) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return jsonResponse({
        access_token: "access-token",
        expires_in: 3600
      });
    }

    if (String(url).includes("/drive/v3/files?q=")) {
      return jsonResponse({
        files: [{ id: "trip-folder", name: "summer-trip" }]
      });
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await createTrip(environment, "Summer Trip");

    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.trip.id, "summer-trip");
    assert.deepEqual(lookedUpTripIds, [
      "summer-trip",
      "summer-trip",
      "summer-trip"
    ]);
    assert.deepEqual(updates, [["trip-folder", "summer-trip", ""]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createTrip does not overwrite a folder cached by a concurrent upload", async () => {
  const originalFetch = globalThis.fetch;
  const updates = [];
  let driveFolderId = null;

  const environment = {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder",
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              async first() {
                if (sql.includes("SELECT id, title, drive_folder_id")) {
                  return {
                    id: "summer-trip",
                    title: "Summer Trip",
                    driveFolderId: null
                  };
                }
                if (sql.includes("SELECT drive_folder_id AS driveFolderId")) {
                  return { driveFolderId };
                }
                throw new Error(`Unexpected first() query: ${sql}`);
              },
              async run() {
                if (!sql.includes("COALESCE(drive_folder_id, '') = ?")) {
                  throw new Error(`Unexpected run() query: ${sql}`);
                }

                updates.push(bindings);

                // The upload request wins the null -> folder compare-and-swap
                // immediately before this createTrip cache attempt.
                driveFolderId = "upload-folder";
                const [nextFolderId, , previousFolderId] = bindings;
                if ((driveFolderId || "") === previousFolderId) {
                  driveFolderId = nextFolderId;
                }
                return { success: true };
              }
            };
          }
        };
      }
    }
  };

  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return jsonResponse({
        access_token: "access-token",
        expires_in: 3600
      });
    }

    if (String(url).includes("/drive/v3/files?q=")) {
      return jsonResponse({ files: [] });
    }

    if (
      String(url) ===
        "https://www.googleapis.com/drive/v3/files?fields=id,name" &&
      options.method === "POST"
    ) {
      return jsonResponse({ id: "retry-folder", name: "summer-trip" });
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await createTrip(environment, "Summer Trip");

    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.trip.driveFolderId, "upload-folder");
    assert.equal(driveFolderId, "upload-folder");
    assert.deepEqual(updates, [["retry-folder", "summer-trip", ""]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
