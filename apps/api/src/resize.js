/**
 * Web-copy resize via Cloudflare Images binding.
 * Falls back to the original bytes if Images is unavailable or fails
 * (Drive original is already safe by then).
 */

const MAX_EDGE_PIXELS = 2048;
const OUTPUT_QUALITY = 80;

export const createWebCopy = async (environment, originalBytes, contentType) => {
  if (!environment.IMAGES) {
    return {
      bytes: originalBytes,
      contentType,
      extension: extensionForContentType(contentType),
      width: null,
      height: null,
      resized: false,
      note: "IMAGES binding missing; stored original as web copy."
    };
  }

  try {
    let width = null;
    let height = null;

    try {
      const imageInfo = await environment.IMAGES.info(originalBytes);
      width = imageInfo.width ?? null;
      height = imageInfo.height ?? null;
    } catch (infoError) {
      // info() is optional; continue to transform
      width = null;
      height = null;
    }

    const transformed = await environment.IMAGES.input(originalBytes)
      .transform({
        width: MAX_EDGE_PIXELS,
        height: MAX_EDGE_PIXELS,
        fit: "scale-down"
      })
      .output({
        format: "image/jpeg",
        quality: OUTPUT_QUALITY
      });

    const webResponse = transformed.response();
    const webBytes = await webResponse.arrayBuffer();

    return {
      bytes: webBytes,
      contentType: "image/jpeg",
      extension: "jpg",
      width,
      height,
      resized: true,
      note: null
    };
  } catch (resizeError) {
    return {
      bytes: originalBytes,
      contentType,
      extension: extensionForContentType(contentType),
      width: null,
      height: null,
      resized: false,
      note: `Resize failed, stored original as web copy: ${String(resizeError)}`
    };
  }
};

const extensionForContentType = (contentType) => {
  const normalizedType = (contentType || "").toLowerCase();
  if (normalizedType.includes("png")) return "png";
  if (normalizedType.includes("webp")) return "webp";
  if (normalizedType.includes("heic") || normalizedType.includes("heif")) {
    return "heic";
  }
  return "jpg";
};
