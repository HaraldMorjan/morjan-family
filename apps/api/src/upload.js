/**
 * POST /trips/:tripId/photos pipeline:
 * validate → Drive original → web copy → R2 → D1 → { mediaUrl, photoId }
 */

import {
  ensureTripFolder,
  getDriveAccessToken,
  uploadOriginalToDrive
} from "./drive.js";
import { createWebCopy } from "./resize.js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const isValidTripId = (tripId) =>
  typeof tripId === "string" && /^[a-z0-9][a-z0-9-]{1,63}$/i.test(tripId);

const sanitizeFileBaseName = (fileName) => {
  const baseName = String(fileName || "photo")
    .split(/[/\\]/)
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return baseName || "photo";
};

const extensionFromFileName = (fileName) => {
  const match = String(fileName || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : null;
};

const normalizeContentType = (contentType, fileName) => {
  const normalizedType = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (normalizedType && ALLOWED_CONTENT_TYPES.has(normalizedType)) {
    return normalizedType === "image/jpg" ? "image/jpeg" : normalizedType;
  }

  const extension = extensionFromFileName(fileName);
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";

  return null;
};

const pickPhotoFile = (formData) => {
  const namedFields = ["file", "photo", "image"];
  for (const fieldName of namedFields) {
    const fieldValue = formData.get(fieldName);
    if (fieldValue && typeof fieldValue.arrayBuffer === "function") {
      return fieldValue;
    }
  }

  for (const fieldValue of formData.values()) {
    if (fieldValue && typeof fieldValue.arrayBuffer === "function") {
      return fieldValue;
    }
  }

  return null;
};

const ensureTripRow = async (environment, tripId) => {
  const existingTrip = await environment.DB.prepare(
    "SELECT id FROM trips WHERE id = ?"
  )
    .bind(tripId)
    .first();

  if (existingTrip) {
    return { created: false };
  }

  const createdAt = new Date().toISOString();
  await environment.DB.prepare(
    `
    INSERT INTO trips (id, title, place, dates, blurb, cover_url, created_at)
    VALUES (?, ?, NULL, NULL, NULL, NULL, ?)
    `
  )
    .bind(tripId, tripId, createdAt)
    .run();

  return { created: true };
};

const putWebCopyToR2 = async (environment, r2Key, webCopy) => {
  const putOnce = async () =>
    environment.MEDIA.put(r2Key, webCopy.bytes, {
      httpMetadata: {
        contentType: webCopy.contentType,
        cacheControl: "public, max-age=31536000, immutable"
      },
      customMetadata: {
        resized: webCopy.resized ? "1" : "0"
      }
    });

  try {
    await putOnce();
  } catch (firstError) {
    try {
      await putOnce();
    } catch (secondError) {
      throw new Error(
        `R2 put failed after retry. First: ${String(firstError)}; Second: ${String(secondError)}`
      );
    }
  }
};

const insertPhotoRow = async (environment, photoRow) => {
  await environment.DB.prepare(
    `
    INSERT INTO trip_photos (
      id,
      trip_id,
      r2_key,
      media_url,
      drive_file_id,
      width,
      height,
      bytes,
      created_at,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      photoRow.id,
      photoRow.tripId,
      photoRow.r2Key,
      photoRow.mediaUrl,
      photoRow.driveFileId,
      photoRow.width,
      photoRow.height,
      photoRow.bytes,
      photoRow.createdAt,
      photoRow.createdBy
    )
    .run();

  await environment.DB.prepare(
    `
    UPDATE trips
    SET cover_url = ?
    WHERE id = ?
      AND (cover_url IS NULL OR cover_url = '')
    `
  )
    .bind(photoRow.mediaUrl, photoRow.tripId)
    .run();
};

export const handlePhotoUpload = async (request, environment, tripId) => {
  if (!isValidTripId(tripId)) {
    return {
      statusCode: 400,
      payload: {
        error: "Invalid trip id. Use lowercase letters, numbers, and hyphens."
      }
    };
  }

  const contentTypeHeader = request.headers.get("content-type") || "";
  if (!contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
    return {
      statusCode: 400,
      payload: {
        error: "Expected multipart/form-data with a photo file field (file|photo|image)."
      }
    };
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (parseError) {
    return {
      statusCode: 400,
      payload: {
        error: "Could not parse multipart body.",
        detail: String(parseError)
      }
    };
  }

  const photoFile = pickPhotoFile(formData);
  if (!photoFile) {
    return {
      statusCode: 400,
      payload: {
        error: "Missing photo file. Send multipart field named file, photo, or image."
      }
    };
  }

  const originalFileName = photoFile.name || "photo.jpg";
  const contentType = normalizeContentType(photoFile.type, originalFileName);
  if (!contentType) {
    return {
      statusCode: 415,
      payload: {
        error: "Unsupported media type. Allowed: JPEG, PNG, WebP, HEIC."
      }
    };
  }

  const originalBytes = await photoFile.arrayBuffer();
  if (!originalBytes || originalBytes.byteLength === 0) {
    return {
      statusCode: 400,
      payload: { error: "Empty photo body." }
    };
  }

  if (originalBytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      statusCode: 413,
      payload: {
        error: `Photo too large. Max ${MAX_UPLOAD_BYTES} bytes (25 MB).`
      }
    };
  }

  const createdByRaw = formData.get("createdBy") || formData.get("created_by");
  const createdBy =
    typeof createdByRaw === "string" && createdByRaw.trim()
      ? createdByRaw.trim().slice(0, 80)
      : null;

  await ensureTripRow(environment, tripId);

  const photoId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const safeBaseName = sanitizeFileBaseName(originalFileName);
  const originalExtension =
    extensionFromFileName(originalFileName) ||
    (contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType.includes("heic") || contentType.includes("heif")
          ? "heic"
          : "jpg");
  const driveFileName = `${stamp}-${safeBaseName}.${originalExtension}`;

  let accessToken;
  try {
    accessToken = await getDriveAccessToken(environment);
  } catch (tokenError) {
    return {
      statusCode: 503,
      payload: {
        error: "Google Drive auth is not ready.",
        detail: String(tokenError)
      }
    };
  }

  let tripFolderId;
  try {
    const folders = await ensureTripFolder(accessToken, tripId, environment);
    tripFolderId = folders.tripFolderId;
  } catch (folderError) {
    return {
      statusCode: 502,
      payload: {
        error: "Failed to prepare Drive trip folder.",
        detail: String(folderError)
      }
    };
  }

  let driveFileId;
  try {
    const driveUpload = await uploadOriginalToDrive({
      accessToken,
      tripFolderId,
      fileName: driveFileName,
      contentType,
      bytes: originalBytes
    });
    driveFileId = driveUpload.driveFileId;
  } catch (driveError) {
    return {
      statusCode: 502,
      payload: {
        error: "Failed to store Drive original. Photo was NOT marked safe to delete.",
        detail: String(driveError)
      }
    };
  }

  const webCopy = await createWebCopy(environment, originalBytes, contentType);
  const r2Key = `${tripId}/${stamp}-${photoId}.${webCopy.extension}`;
  const mediaBase = (
    environment.MEDIA_PUBLIC_BASE || "https://media.morjan.family"
  ).replace(/\/+$/, "");
  const mediaUrl = `${mediaBase}/${r2Key}`;

  try {
    await putWebCopyToR2(environment, r2Key, webCopy);
  } catch (r2Error) {
    return {
      statusCode: 502,
      payload: {
        error: "Drive original saved, but R2 web copy failed. Retry upload.",
        driveFileId,
        detail: String(r2Error)
      }
    };
  }

  try {
    await insertPhotoRow(environment, {
      id: photoId,
      tripId,
      r2Key,
      mediaUrl,
      driveFileId,
      width: webCopy.width,
      height: webCopy.height,
      bytes: webCopy.bytes.byteLength,
      createdAt,
      createdBy
    });
  } catch (databaseError) {
    return {
      statusCode: 502,
      payload: {
        error: "Drive + R2 saved, but catalog insert failed. Retry upload.",
        driveFileId,
        mediaUrl,
        detail: String(databaseError)
      }
    };
  }

  return {
    statusCode: 200,
    payload: {
      ok: true,
      photoId,
      tripId,
      mediaUrl,
      driveFileId,
      r2Key,
      bytes: webCopy.bytes.byteLength,
      width: webCopy.width,
      height: webCopy.height,
      resized: webCopy.resized,
      driveConfirmed: true,
      safeToMoveOffPhone: true,
      note: webCopy.note
    }
  };
};
