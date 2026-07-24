import assert from "node:assert/strict";
import test from "node:test";

import { handlePhotoUpload } from "./upload.js";

test("does not publish original bytes when web-copy conversion fails", async () => {
  const originalFetch = globalThis.fetch;
  let r2PutCalled = false;
  let databaseWriteCalled = false;

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl === "https://oauth2.googleapis.com/token") {
      return Response.json({ access_token: "drive-token", expires_in: 3600 });
    }

    if (requestUrl.startsWith("https://www.googleapis.com/drive/v3/files?")) {
      return Response.json({ files: [{ id: "trip-folder" }] });
    }

    if (requestUrl.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) {
      return new Response(null, {
        status: 200,
        headers: { Location: "https://drive-upload.example/session" }
      });
    }

    if (
      requestUrl === "https://drive-upload.example/session" &&
      options.method === "PUT"
    ) {
      return Response.json({ id: "drive-file", name: "photo.jpg" });
    }

    throw new Error(`Unexpected fetch: ${requestUrl}`);
  };

  const environment = {
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    GOOGLE_REFRESH_TOKEN: "refresh-token",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "media-folder",
    DB: {
      prepare(query) {
        if (query.includes("SELECT id FROM trips")) {
          return {
            bind() {
              return {
                async first() {
                  return { id: "family-trip" };
                }
              };
            }
          };
        }

        databaseWriteCalled = true;
        return {
          bind() {
            return { async run() {} };
          }
        };
      }
    },
    MEDIA: {
      async put() {
        r2PutCalled = true;
      }
    }
  };

  const formData = new FormData();
  formData.set(
    "file",
    new Blob([Uint8Array.from([0xff, 0xd8, 0xff])], {
      type: "image/jpeg"
    }),
    "photo.jpg"
  );

  try {
    const result = await handlePhotoUpload(
      new Request("https://api.morjan.family/trips/family-trip/photos", {
        method: "POST",
        body: formData
      }),
      environment,
      "family-trip"
    );

    assert.equal(result.statusCode, 502);
    assert.equal(result.payload.driveFileId, "drive-file");
    assert.match(result.payload.error, /Photo was not published/);
    assert.equal(r2PutCalled, false);
    assert.equal(databaseWriteCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
