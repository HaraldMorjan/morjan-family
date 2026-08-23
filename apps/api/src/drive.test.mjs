import assert from "node:assert/strict";
import test from "node:test";

import { ensureAlbumFolder, ensureTripFolder } from "./drive.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });

test("ensureTripFolder recreates a missing cached folder", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url).includes("/files/stale-trip?")) {
      return jsonResponse({ error: "not found" }, 404);
    }

    if (String(url).includes("/drive/v3/files?q=")) {
      return jsonResponse({ files: [] });
    }

    if (options.method === "POST") {
      return jsonResponse({ id: "replacement-trip", name: "summer-trip" });
    }

    throw new Error(`Unexpected Drive request: ${url}`);
  };

  try {
    const result = await ensureTripFolder(
      "access-token",
      "summer-trip",
      { GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder" },
      "stale-trip"
    );

    assert.equal(result.tripFolderId, "replacement-trip");
    assert.equal(
      calls.filter(({ options }) => options.method === "POST").length,
      1
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ensureAlbumFolder rejects a cached folder outside the trip", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));

    if (String(url).includes("/files/stale-album?")) {
      return jsonResponse({
        id: "stale-album",
        mimeType: "application/vnd.google-apps.folder",
        parents: ["different-trip"],
        trashed: false
      });
    }

    if (String(url).includes("/drive/v3/files?q=")) {
      return jsonResponse({
        files: [{ id: "correct-album", name: "unsorted" }]
      });
    }

    throw new Error(`Unexpected Drive request: ${url}`);
  };

  try {
    const albumFolderId = await ensureAlbumFolder(
      "access-token",
      "expected-trip",
      "unsorted",
      "stale-album"
    );

    assert.equal(albumFolderId, "correct-album");
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
