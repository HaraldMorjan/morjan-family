/**
 * morjan-api — trips upload + catalog Worker
 * Domain: api.morjan.family
 *
 * Pipeline: multipart POST → Drive original → resize → R2 → D1
 */

import {
  ensureAlbumFolder,
  ensureTripFolder,
  getDriveAccessToken
} from "./drive.js";
import {
  cacheAlbumFolderId,
  cacheTripFolderId,
  ensureAlbumRow,
  ensureTripRow,
  handlePhotoUpload,
  isValidTripId,
  slugify
} from "./upload.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

const corsHeadersFor = (environment) => ({
  "access-control-allow-origin": environment.ALLOWED_ORIGIN || "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, x-upload-token",
  "access-control-max-age": "86400"
});

const jsonResponse = (statusCode, payload, environment) =>
  new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      ...JSON_HEADERS,
      ...corsHeadersFor(environment)
    }
  });

const requireUploadToken = (request, environment) => {
  const expectedToken = environment.UPLOAD_TOKEN;
  if (!expectedToken) {
    return {
      ok: false,
      response: jsonResponse(
        503,
        { error: "UPLOAD_TOKEN secret is not configured on this Worker." },
        environment
      )
    };
  }

  const providedToken = request.headers.get("x-upload-token");
  if (!providedToken || providedToken !== expectedToken) {
    return {
      ok: false,
      response: jsonResponse(401, { error: "Unauthorized." }, environment)
    };
  }

  return { ok: true };
};

const readJsonBody = async (request) => {
  try {
    return await request.json();
  } catch (parseError) {
    return null;
  }
};

const listTrips = async (environment) => {
  const result = await environment.DB.prepare(
    `
    SELECT
      trips.id,
      trips.title,
      trips.place,
      trips.dates,
      trips.blurb,
      trips.cover_url AS coverUrl,
      COUNT(trip_photos.id) AS photoCount
    FROM trips
    LEFT JOIN trip_photos ON trip_photos.trip_id = trips.id
    GROUP BY trips.id
    ORDER BY trips.created_at DESC
    `
  ).all();

  return result.results || [];
};

const listTripAlbums = async (environment, tripId) => {
  const result = await environment.DB.prepare(
    `
    SELECT
      albums.id,
      albums.trip_id AS tripId,
      albums.slug,
      albums.name,
      albums.drive_folder_id AS driveFolderId,
      albums.created_at AS createdAt,
      COUNT(trip_photos.id) AS photoCount
    FROM albums
    LEFT JOIN trip_photos ON trip_photos.album_id = albums.id
    WHERE albums.trip_id = ?
    GROUP BY albums.id
    ORDER BY albums.created_at ASC
    `
  )
    .bind(tripId)
    .all();

  return result.results || [];
};

const listTripPhotos = async (environment, tripId, albumSlug = null) => {
  const bindings = [tripId];
  let albumFilter = "";

  if (albumSlug) {
    albumFilter = "AND albums.slug = ?";
    bindings.push(albumSlug);
  }

  const result = await environment.DB.prepare(
    `
    SELECT
      trip_photos.id,
      trip_photos.trip_id AS tripId,
      trip_photos.album_id AS albumId,
      albums.slug AS albumSlug,
      albums.name AS albumName,
      trip_photos.r2_key AS r2Key,
      trip_photos.media_url AS mediaUrl,
      trip_photos.drive_file_id AS driveFileId,
      trip_photos.width,
      trip_photos.height,
      trip_photos.bytes,
      trip_photos.created_at AS createdAt
    FROM trip_photos
    LEFT JOIN albums ON albums.id = trip_photos.album_id
    WHERE trip_photos.trip_id = ?
      ${albumFilter}
    ORDER BY trip_photos.created_at ASC
    `
  )
    .bind(...bindings)
    .all();

  return result.results || [];
};

export const createTrip = async (environment, title) => {
  const tripTitle = String(title || "").trim().slice(0, 120);
  if (!tripTitle) {
    return {
      statusCode: 400,
      payload: { error: "Missing title. Send JSON { \"title\": \"...\" }." }
    };
  }

  let tripId = slugify(tripTitle);
  if (!isValidTripId(tripId)) {
    return {
      statusCode: 400,
      payload: {
        error: "Could not derive a valid trip id from that title."
      }
    };
  }

  const existingTrip = await environment.DB.prepare(
    "SELECT id, title, drive_folder_id AS driveFolderId FROM trips WHERE id = ?"
  )
    .bind(tripId)
    .first();

  const shouldResumeIncompleteTrip =
    existingTrip &&
    !existingTrip.driveFolderId &&
    existingTrip.title === tripTitle;

  if (existingTrip && !shouldResumeIncompleteTrip) {
    let foundFreeId = false;
    for (let suffix = 2; suffix < 50; suffix += 1) {
      const candidateId = `${tripId.slice(0, 60)}-${suffix}`;
      const clash = await environment.DB.prepare(
        "SELECT id FROM trips WHERE id = ?"
      )
        .bind(candidateId)
        .first();
      if (!clash) {
        tripId = candidateId;
        foundFreeId = true;
        break;
      }
    }

    if (!foundFreeId) {
      return {
        statusCode: 409,
        payload: {
          error: "Trip already exists.",
          trip: existingTrip
        }
      };
    }
  }

  const tripRow = await ensureTripRow(environment, tripId, tripTitle);

  let accessToken;
  try {
    accessToken = await getDriveAccessToken(environment);
  } catch (tokenError) {
    return {
      statusCode: 503,
      payload: {
        error: "Trip saved in catalog, but Google Drive auth is not ready.",
        trip: { id: tripRow.tripId, title: tripRow.title },
        detail: String(tokenError)
      }
    };
  }

  try {
    const folders = await ensureTripFolder(
      accessToken,
      tripId,
      environment,
      null
    );
    await environment.DB.prepare(
      `
      UPDATE trips
      SET drive_folder_id = ?
      WHERE id = ?
      `
    )
      .bind(folders.tripFolderId, tripId)
      .run();

    return {
      statusCode: tripRow.created ? 201 : 200,
      payload: {
        ok: true,
        trip: {
          id: tripId,
          title: tripRow.title,
          driveFolderId: folders.tripFolderId
        }
      }
    };
  } catch (folderError) {
    return {
      statusCode: 502,
      payload: {
        error: "Trip saved in catalog, but Drive folder create failed.",
        trip: { id: tripId, title: tripRow.title },
        detail: String(folderError)
      }
    };
  }
};

const createAlbum = async (environment, tripId, name) => {
  if (!isValidTripId(tripId)) {
    return {
      statusCode: 400,
      payload: {
        error: "Invalid trip id. Use lowercase letters, numbers, and hyphens."
      }
    };
  }

  const albumName = String(name || "").trim().slice(0, 80);
  if (!albumName) {
    return {
      statusCode: 400,
      payload: { error: "Missing name. Send JSON { \"name\": \"...\" }." }
    };
  }

  const trip = await environment.DB.prepare(
    "SELECT id, drive_folder_id AS driveFolderId FROM trips WHERE id = ?"
  )
    .bind(tripId)
    .first();

  if (!trip) {
    return {
      statusCode: 404,
      payload: { error: "Trip not found. Create the trip first." }
    };
  }

  const albumRow = await ensureAlbumRow(environment, tripId, albumName);

  let accessToken;
  try {
    accessToken = await getDriveAccessToken(environment);
  } catch (tokenError) {
    return {
      statusCode: 503,
      payload: {
        error: "Album saved in catalog, but Google Drive auth is not ready.",
        album: {
          id: albumRow.albumId,
          tripId,
          slug: albumRow.slug,
          name: albumRow.name
        },
        detail: String(tokenError)
      }
    };
  }

  try {
    const folders = await ensureTripFolder(
      accessToken,
      tripId,
      environment,
      trip.driveFolderId || null
    );

    let tripFolderId = folders.tripFolderId;
    if (trip.driveFolderId !== tripFolderId) {
      tripFolderId = await cacheTripFolderId(
        environment,
        tripId,
        tripFolderId,
        trip.driveFolderId
      );
    }

    let albumFolderId = await ensureAlbumFolder(
      accessToken,
      tripFolderId,
      albumRow.slug,
      albumRow.driveFolderId
    );

    if (albumRow.driveFolderId !== albumFolderId) {
      albumFolderId = await cacheAlbumFolderId(
        environment,
        albumRow.albumId,
        albumFolderId,
        albumRow.driveFolderId
      );
    }

    return {
      statusCode: albumRow.created ? 201 : 200,
      payload: {
        ok: true,
        album: {
          id: albumRow.albumId,
          tripId,
          slug: albumRow.slug,
          name: albumRow.name,
          driveFolderId: albumFolderId
        }
      }
    };
  } catch (folderError) {
    return {
      statusCode: 502,
      payload: {
        error: "Album saved in catalog, but Drive folder create failed.",
        album: {
          id: albumRow.albumId,
          tripId,
          slug: albumRow.slug,
          name: albumRow.name
        },
        detail: String(folderError)
      }
    };
  }
};

const handleRequest = async (request, environment) => {
  const requestUrl = new URL(request.url);
  const pathName = requestUrl.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeadersFor(environment)
    });
  }

  if (request.method === "GET" && pathName === "/health") {
    return jsonResponse(
      200,
      {
        ok: true,
        service: "morjan-api",
        phase: "upload-pipeline"
      },
      environment
    );
  }

  if (pathName === "/trips") {
    if (request.method === "GET") {
      try {
        const trips = await listTrips(environment);
        return jsonResponse(200, { trips }, environment);
      } catch (error) {
        return jsonResponse(
          500,
          { error: "Failed to list trips.", detail: String(error) },
          environment
        );
      }
    }

    if (request.method === "POST") {
      const tokenCheck = requireUploadToken(request, environment);
      if (!tokenCheck.ok) {
        return tokenCheck.response;
      }

      const body = await readJsonBody(request);
      if (!body || typeof body !== "object") {
        return jsonResponse(
          400,
          { error: "Expected JSON body { \"title\": \"...\" }." },
          environment
        );
      }

      const createResult = await createTrip(environment, body.title);
      return jsonResponse(
        createResult.statusCode,
        createResult.payload,
        environment
      );
    }
  }

  const tripAlbumsMatch = pathName.match(/^\/trips\/([^/]+)\/albums$/);
  if (tripAlbumsMatch) {
    const tripId = decodeURIComponent(tripAlbumsMatch[1]);

    if (request.method === "GET") {
      try {
        const albums = await listTripAlbums(environment, tripId);
        return jsonResponse(200, { tripId, albums }, environment);
      } catch (error) {
        return jsonResponse(
          500,
          { error: "Failed to list albums.", detail: String(error) },
          environment
        );
      }
    }

    if (request.method === "POST") {
      const tokenCheck = requireUploadToken(request, environment);
      if (!tokenCheck.ok) {
        return tokenCheck.response;
      }

      const body = await readJsonBody(request);
      if (!body || typeof body !== "object") {
        return jsonResponse(
          400,
          { error: "Expected JSON body { \"name\": \"...\" }." },
          environment
        );
      }

      const createResult = await createAlbum(environment, tripId, body.name);
      return jsonResponse(
        createResult.statusCode,
        createResult.payload,
        environment
      );
    }
  }

  const tripPhotosMatch = pathName.match(/^\/trips\/([^/]+)\/photos$/);
  if (tripPhotosMatch) {
    const tripId = decodeURIComponent(tripPhotosMatch[1]);

    if (request.method === "GET") {
      try {
        const albumSlug = requestUrl.searchParams.get("album");
        const photos = await listTripPhotos(
          environment,
          tripId,
          albumSlug || null
        );
        return jsonResponse(200, { tripId, photos }, environment);
      } catch (error) {
        return jsonResponse(
          500,
          { error: "Failed to list photos.", detail: String(error) },
          environment
        );
      }
    }

    if (request.method === "POST") {
      const tokenCheck = requireUploadToken(request, environment);
      if (!tokenCheck.ok) {
        return tokenCheck.response;
      }

      const uploadResult = await handlePhotoUpload(
        request,
        environment,
        tripId
      );
      return jsonResponse(
        uploadResult.statusCode,
        uploadResult.payload,
        environment
      );
    }
  }

  return jsonResponse(404, { error: "Not found." }, environment);
};

export default {
  async fetch(request, environment) {
    try {
      return await handleRequest(request, environment);
    } catch (error) {
      return jsonResponse(
        500,
        { error: "Unhandled Worker error.", detail: String(error) },
        environment
      );
    }
  }
};
