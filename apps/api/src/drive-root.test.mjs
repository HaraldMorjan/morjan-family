import assert from "node:assert/strict";
import test from "node:test";

import { ensureTripFolder } from "./drive.js";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });

test("reuses a legacy trip folder when both Drive roots exist", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });

    const requestUrl = new URL(url);
    const query = requestUrl.searchParams.get("q");

    if (query?.includes("name = 'trips'") && !query.includes("in parents")) {
      return jsonResponse({ files: [{ id: "trips-root", name: "trips" }] });
    }
    if (
      query?.includes("name = 'legacy-trip'") &&
      query.includes("'trips-root' in parents")
    ) {
      return jsonResponse({ files: [] });
    }
    if (query?.includes("name = 'media'") && !query.includes("in parents")) {
      return jsonResponse({ files: [{ id: "media-root", name: "media" }] });
    }
    if (
      query?.includes("name = 'legacy-trip'") &&
      query.includes("'media-root' in parents")
    ) {
      return jsonResponse({
        files: [{ id: "legacy-trip-folder", name: "legacy-trip" }]
      });
    }

    throw new Error(`Unexpected Drive request: ${url}`);
  };

  try {
    const result = await ensureTripFolder(
      "access-token",
      "legacy-trip",
      {},
      null
    );

    assert.deepEqual(result, {
      rootFolderId: "media-root",
      tripFolderId: "legacy-trip-folder"
    });
    assert.equal(calls.some(({ method }) => method === "POST"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reuses a legacy trip folder outside the configured Drive root", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });

    const requestUrl = new URL(url);
    const query = requestUrl.searchParams.get("q");

    if (
      query?.includes("name = 'legacy-trip'") &&
      query.includes("'configured-root' in parents")
    ) {
      return jsonResponse({ files: [] });
    }
    if (query?.includes("name = 'trips'") && !query.includes("in parents")) {
      return jsonResponse({ files: [{ id: "trips-root", name: "trips" }] });
    }
    if (
      query?.includes("name = 'legacy-trip'") &&
      query.includes("'trips-root' in parents")
    ) {
      return jsonResponse({ files: [] });
    }
    if (query?.includes("name = 'media'") && !query.includes("in parents")) {
      return jsonResponse({ files: [{ id: "media-root", name: "media" }] });
    }
    if (
      query?.includes("name = 'legacy-trip'") &&
      query.includes("'media-root' in parents")
    ) {
      return jsonResponse({
        files: [{ id: "legacy-trip-folder", name: "legacy-trip" }]
      });
    }

    throw new Error(`Unexpected Drive request: ${url}`);
  };

  try {
    const result = await ensureTripFolder(
      "access-token",
      "legacy-trip",
      { GOOGLE_DRIVE_ROOT_FOLDER_ID: "configured-root" },
      null
    );

    assert.deepEqual(result, {
      rootFolderId: "media-root",
      tripFolderId: "legacy-trip-folder"
    });
    assert.equal(calls.some(({ method }) => method === "POST"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
