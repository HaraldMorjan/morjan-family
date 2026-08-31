import assert from "node:assert/strict";
import test from "node:test";

import worker, { canonicalizeTripId } from "../src/index.js";

test("canonicalizeTripId normalizes mixed-case identifiers", () => {
  assert.equal(
    canonicalizeTripId("Guatemala-Highlands-2024"),
    "guatemala-highlands-2024"
  );
});

test("photo routes query and return the canonical trip identifier", async () => {
  let boundTripId;
  let preparedSql;
  const environment = {
    DB: {
      prepare(sql) {
        preparedSql = sql;
        return {
          bind(tripId) {
            boundTripId = tripId;
            return {
              async all() {
                return {
                  results: [
                    {
                      id: "legacy-photo",
                      tripId: "Guatemala-Highlands-2024"
                    }
                  ]
                };
              }
            };
          }
        };
      }
    }
  };

  const response = await worker.fetch(
    new Request(
      "https://api.morjan.family/trips/Guatemala-Highlands-2024/photos"
    ),
    environment
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(boundTripId, "guatemala-highlands-2024");
  assert.equal(payload.tripId, "guatemala-highlands-2024");
  assert.equal(payload.photos[0].id, "legacy-photo");
  assert.match(preparedSql, /trip_photos\.trip_id = \? COLLATE NOCASE/);
});

test("album routes can read a legacy mixed-case trip partition", async () => {
  let boundTripId;
  let preparedSql;
  const environment = {
    DB: {
      prepare(sql) {
        preparedSql = sql;
        return {
          bind(tripId) {
            boundTripId = tripId;
            return {
              async all() {
                return {
                  results: [
                    {
                      id: "legacy-album",
                      tripId: "Guatemala-Highlands-2024"
                    }
                  ]
                };
              }
            };
          }
        };
      }
    }
  };

  const response = await worker.fetch(
    new Request(
      "https://api.morjan.family/trips/guatemala-highlands-2024/albums"
    ),
    environment
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(boundTripId, "guatemala-highlands-2024");
  assert.equal(payload.albums[0].id, "legacy-album");
  assert.match(preparedSql, /albums\.trip_id = \? COLLATE NOCASE/);
});

test("photo uploads reuse the persisted casing of a legacy trip", async () => {
  let tripLookupId;
  let albumLookupTripId;
  let tripLookupSql;
  const environment = {
    UPLOAD_TOKEN: "test-token",
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              async first() {
                if (sql.includes("FROM trips")) {
                  tripLookupSql = sql;
                  tripLookupId = bindings[0];
                  return {
                    id: "Guatemala-Highlands-2024",
                    title: "Guatemala-Highlands-2024",
                    driveFolderId: null
                  };
                }
                if (sql.includes("FROM albums")) {
                  albumLookupTripId = bindings[0];
                  return {
                    id: "legacy-album",
                    slug: "unsorted",
                    name: "Unsorted",
                    driveFolderId: null
                  };
                }
                throw new Error(`Unexpected query: ${sql}`);
              }
            };
          }
        };
      }
    }
  };
  const formData = new FormData();
  formData.set(
    "file",
    new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg"
    }),
    "photo.jpg"
  );

  const response = await worker.fetch(
    new Request(
      "https://api.morjan.family/trips/Guatemala-Highlands-2024/photos",
      {
        method: "POST",
        headers: { "x-upload-token": "test-token" },
        body: formData
      }
    ),
    environment
  );

  assert.equal(response.status, 503);
  assert.equal(tripLookupId, "guatemala-highlands-2024");
  assert.match(tripLookupSql, /WHERE id = \? COLLATE NOCASE/);
  assert.equal(albumLookupTripId, "Guatemala-Highlands-2024");
});
