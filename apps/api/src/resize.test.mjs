import assert from "node:assert/strict";
import test from "node:test";

import { createWebCopy } from "./resize.js";

const readStream = async (stream) =>
  new Uint8Array(await new Response(stream).arrayBuffer());

test("passes fresh ReadableStreams to the Images binding", async () => {
  const original = Uint8Array.from([1, 2, 3, 4]);
  const transformed = Uint8Array.from([5, 6]);
  let infoStream;
  let inputStream;

  const environment = {
    IMAGES: {
      async info(stream) {
        infoStream = stream;
        assert.ok(stream instanceof ReadableStream);
        assert.deepEqual(await readStream(stream), original);
        return { width: 4032, height: 3024 };
      },
      input(stream) {
        inputStream = stream;
        assert.ok(stream instanceof ReadableStream);
        return {
          transform(options) {
            assert.deepEqual(options, {
              width: 2048,
              height: 2048,
              fit: "scale-down",
              metadata: "none"
            });
            return this;
          },
          async output(options) {
            assert.deepEqual(options, {
              format: "image/jpeg",
              quality: 80
            });
            assert.deepEqual(await readStream(stream), original);
            return {
              response: () =>
                new Response(transformed, {
                  headers: { "content-type": "image/jpeg" }
                })
            };
          }
        };
      }
    }
  };

  const result = await createWebCopy(environment, original.buffer);

  assert.notEqual(infoStream, inputStream);
  assert.deepEqual(new Uint8Array(result.bytes), transformed);
  assert.equal(result.contentType, "image/jpeg");
  assert.equal(result.extension, "jpg");
  assert.equal(result.width, 4032);
  assert.equal(result.height, 3024);
  assert.equal(result.resized, true);
});

test("refuses to publish original bytes when the Images binding is missing", async () => {
  await assert.rejects(
    () => createWebCopy({}, new Uint8Array([1, 2, 3]).buffer),
    /IMAGES binding missing/
  );
});

test("refuses to publish original bytes when transform fails", async () => {
  const environment = {
    IMAGES: {
      async info() {
        return { width: 100, height: 80 };
      },
      input() {
        return {
          transform() {
            return this;
          },
          async output() {
            throw new Error("too large");
          }
        };
      }
    }
  };

  await assert.rejects(
    () => createWebCopy(environment, new Uint8Array([1, 2, 3]).buffer),
    /Web-copy resize failed/
  );
});
