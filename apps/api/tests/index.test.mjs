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
