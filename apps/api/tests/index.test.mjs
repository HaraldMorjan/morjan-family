import assert from "node:assert/strict";
import test from "node:test";

import worker, { canonicalizeTripId } from "../src/index.js";

test("canonicalizeTripId normalizes mixed-case identifiers", () => {
  assert.equal(
    canonicalizeTripId("Guatemala-Highlands-2024"),
    "guatemala-highlands-2024"
  );
});

test("catalog reads require the upload token", async () => {
  const environment = { UPLOAD_TOKEN: "test-token" };
  const catalogPaths = [
    "https://api.morjan.family/trips",
    "https://api.morjan.family/trips/guatemala-highlands-2024/photos",
    "https://api.morjan.family/trips/guatemala-highlands-2024/albums"
  ];

  for (const url of catalogPaths) {
    const response = await worker.fetch(new Request(url), environment);
    const payload = await response.json();
    assert.equal(response.status, 401, url);
    assert.equal(payload.error, "Unauthorized.");
  }
});

test("health stays public without a token", async () => {
  const response = await worker.fetch(
    new Request("https://api.morjan.family/health"),
    {}
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
});

test("CORS preflight stays public without a token", async () => {
  const response = await worker.fetch(
    new Request("https://api.morjan.family/trips", { method: "OPTIONS" }),
    { UPLOAD_TOKEN: "test-token" }
  );

  assert.equal(response.status, 204);
});

test("photo routes query and return the canonical trip identifier", async () => {
  let boundTripId;
  const environment = {
    UPLOAD_TOKEN: "test-token",
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
      "https://api.morjan.family/trips/Guatemala-Highlands-2024/photos",
      { headers: { "x-upload-token": "test-token" } }
    ),
    environment
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(boundTripId, "guatemala-highlands-2024");
  assert.equal(payload.tripId, "guatemala-highlands-2024");
});

test("photo list omits Drive identifiers even if the query row includes them", async () => {
  const environment = {
    UPLOAD_TOKEN: "test-token",
    DB: {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                return {
                  results: [
                    {
                      id: "photo-1",
                      tripId: "guatemala-highlands-2024",
                      albumId: "album-1",
                      albumSlug: "unsorted",
                      albumName: "Unsorted",
                      mediaUrl: "https://media.morjan.family/example.jpg",
                      driveFileId: "should-not-leak",
                      r2Key: "should-not-leak",
                      width: 100,
                      height: 80,
                      bytes: 12,
                      createdAt: "2026-01-01T00:00:00.000Z"
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
      "https://api.morjan.family/trips/guatemala-highlands-2024/photos",
      { headers: { "x-upload-token": "test-token" } }
    ),
    environment
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.photos.length, 1);
  assert.equal(
    payload.photos[0].mediaUrl,
    "https://media.morjan.family/example.jpg"
  );
  assert.equal("driveFileId" in payload.photos[0], false);
  assert.equal("r2Key" in payload.photos[0], false);
});

test("album list omits Drive folder identifiers even if the query row includes them", async () => {
  const environment = {
    UPLOAD_TOKEN: "test-token",
    DB: {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                return {
                  results: [
                    {
                      id: "album-1",
                      tripId: "guatemala-highlands-2024",
                      slug: "unsorted",
                      name: "Unsorted",
                      driveFolderId: "should-not-leak",
                      createdAt: "2026-01-01T00:00:00.000Z",
                      photoCount: 1
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
      "https://api.morjan.family/trips/guatemala-highlands-2024/albums",
      { headers: { "x-upload-token": "test-token" } }
    ),
    environment
  );
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.albums.length, 1);
  assert.equal(payload.albums[0].slug, "unsorted");
  assert.equal("driveFolderId" in payload.albums[0], false);
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
