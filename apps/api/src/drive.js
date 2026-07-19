/**
 * Google Drive helpers for morjan-api (OAuth refresh token + drive.file).
 * Creates app-owned `media/<trip-id>/` folders as needed.
 */

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

const driveJson = async (accessToken, url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Drive API ${response.status}: ${JSON.stringify(payload)}`
    );
  }

  return payload;
};

export const getDriveAccessToken = async (environment) => {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = environment.GOOGLE_CLIENT_ID;
  const clientSecret = environment.GOOGLE_CLIENT_SECRET;
  const refreshToken = environment.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth secrets (GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN)."
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(
      `Token exchange failed: ${JSON.stringify(tokenPayload)}`
    );
  }

  const expiresInSeconds = Number(tokenPayload.expires_in) || 3600;
  cachedAccessToken = tokenPayload.access_token;
  cachedAccessTokenExpiresAt = now + (expiresInSeconds - 60) * 1000;

  return cachedAccessToken;
};

const findFolderByName = async (accessToken, folderName, parentFolderId) => {
  const parentClause = parentFolderId
    ? ` and '${parentFolderId}' in parents`
    : "";
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`
  );

  const listPayload = await driveJson(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`
  );

  if (listPayload.files && listPayload.files.length > 0) {
    return listPayload.files[0].id;
  }

  return null;
};

const createFolder = async (accessToken, folderName, parentFolderId) => {
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder"
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const createPayload = await driveJson(
    accessToken,
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(metadata)
    }
  );

  return createPayload.id;
};

export const ensureTripFolder = async (accessToken, tripId, environment) => {
  let mediaFolderId = environment.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;

  if (!mediaFolderId) {
    mediaFolderId = await findFolderByName(accessToken, "media", null);
  }

  if (!mediaFolderId) {
    mediaFolderId = await createFolder(accessToken, "media", null);
  }

  let tripFolderId = await findFolderByName(
    accessToken,
    tripId,
    mediaFolderId
  );

  if (!tripFolderId) {
    tripFolderId = await createFolder(accessToken, tripId, mediaFolderId);
  }

  return { mediaFolderId, tripFolderId };
};

export const uploadOriginalToDrive = async ({
  accessToken,
  tripFolderId,
  fileName,
  contentType,
  bytes
}) => {
  const initiateResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(bytes.byteLength)
      },
      body: JSON.stringify({
        name: fileName,
        parents: [tripFolderId]
      })
    }
  );

  if (!initiateResponse.ok) {
    const errorPayload = await initiateResponse.json().catch(() => ({}));
    throw new Error(
      `Drive resumable init failed (${initiateResponse.status}): ${JSON.stringify(errorPayload)}`
    );
  }

  const uploadUrl = initiateResponse.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Drive resumable init missing Location header.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "content-length": String(bytes.byteLength)
    },
    body: bytes
  });

  const uploadedFile = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) {
    throw new Error(
      `Drive upload failed (${uploadResponse.status}): ${JSON.stringify(uploadedFile)}`
    );
  }

  if (!uploadedFile.id) {
    throw new Error("Drive upload succeeded but returned no file id.");
  }

  return {
    driveFileId: uploadedFile.id,
    driveFileName: uploadedFile.name || fileName
  };
};
