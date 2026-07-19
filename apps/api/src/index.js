/**
 * morjan-api — trips upload + catalog Worker
 * Domain: api.morjan.family
 *
 * Pipeline: multipart POST → Drive original → resize → R2 → D1
 */

import { handlePhotoUpload } from "./upload.js";

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

const listTripPhotos = async (environment, tripId) => {
  const result = await environment.DB.prepare(
    `
    SELECT
      id,
      trip_id AS tripId,
      r2_key AS r2Key,
      media_url AS mediaUrl,
      drive_file_id AS driveFileId,
      width,
      height,
      bytes,
      created_at AS createdAt
    FROM trip_photos
    WHERE trip_id = ?
    ORDER BY created_at ASC
    `
  )
    .bind(tripId)
    .all();

  return result.results || [];
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

  if (request.method === "GET" && pathName === "/trips") {
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

  const tripPhotosMatch = pathName.match(/^\/trips\/([^/]+)\/photos$/);
  if (tripPhotosMatch) {
    const tripId = decodeURIComponent(tripPhotosMatch[1]);

    if (request.method === "GET") {
      try {
        const photos = await listTripPhotos(environment, tripId);
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
