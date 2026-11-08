/**
 * Web-copy resize via Cloudflare Images binding.
 * Always re-encodes to JPEG with EXIF stripped. Never returns original
 * camera bytes — those stay in Drive only.
 */

const MAX_EDGE_PIXELS = 2048;
const OUTPUT_QUALITY = 80;

const streamFromBytes = (bytes) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    }
  });

export const createWebCopy = async (environment, originalBytes) => {
  if (!environment.IMAGES) {
    throw new Error(
      "IMAGES binding missing; refusing to publish original photo bytes."
    );
  }

  let width = null;
  let height = null;

  try {
    const imageInfo = await environment.IMAGES.info(
      streamFromBytes(originalBytes)
    );
    width = imageInfo.width ?? null;
    height = imageInfo.height ?? null;
  } catch (infoError) {
    // info() is optional; continue to transform
    width = null;
    height = null;
  }

  let transformed;
  try {
    transformed = await environment.IMAGES.input(
      streamFromBytes(originalBytes)
    )
      .transform({
        width: MAX_EDGE_PIXELS,
        height: MAX_EDGE_PIXELS,
        fit: "scale-down",
        metadata: "none"
      })
      .output({
        format: "image/jpeg",
        quality: OUTPUT_QUALITY
      });
  } catch (resizeError) {
    throw new Error(
      `Web-copy resize failed; original was not published. ${String(resizeError)}`
    );
  }

  const webResponse = transformed.response();
  const webBytes = await webResponse.arrayBuffer();
  if (!webBytes || webBytes.byteLength === 0) {
    throw new Error("Images transform returned an empty web copy.");
  }

  return {
    bytes: webBytes,
    contentType: "image/jpeg",
    extension: "jpg",
    width,
    height,
    resized: true,
    note: null
  };
};
