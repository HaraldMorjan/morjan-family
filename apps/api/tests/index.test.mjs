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
  const environment = {
    DB: {
      prepare() {
        return {
          bind(tripId) {
            boundTripId = tripId;
            return {
              async all() {
                return { results: [] };
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
});

test("photo uploads use the canonical trip identifier before storage", async () => {
  let boundTripId;
  const environment = {
    UPLOAD_TOKEN: "test-token",
    DB: {
      prepare() {
        return {
          bind(tripId) {
            boundTripId = tripId;
            return {
              async first() {
                return { id: tripId };
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
  assert.equal(boundTripId, "guatemala-highlands-2024");
});
