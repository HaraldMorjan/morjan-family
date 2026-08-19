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
    assert.deepEqual(lookedUpTripIds, ["summer-trip", "summer-trip"]);
    assert.deepEqual(updates, [["trip-folder", "summer-trip"]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
