/**
 * One-shot Drive connectivity test for morjan-api OAuth secrets.
 *
 * Usage (Git Bash / PowerShell — do NOT commit these values):
 *
 *   export GOOGLE_CLIENT_ID='...'
 *   export GOOGLE_CLIENT_SECRET='...'
 *   export GOOGLE_REFRESH_TOKEN='...'
 *   node scripts/test-drive-upload.mjs
 *
 * Creates (or reuses) an app-owned folder named "media", then uploads
 * a tiny text file. Requires scope drive.file (app-created folders only).
 */

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  console.error(
    "Missing env. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN."
  );
  process.exit(1);
}

const getAccessToken = async () => {
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
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenPayload)}`);
  }

  return tokenPayload.access_token;
};

const driveFetch = async (accessToken, url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Drive API ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
};

const findOrCreateMediaFolder = async (accessToken) => {
  const query = encodeURIComponent(
    "name = 'media' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const listPayload = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`
  );

  if (listPayload.files && listPayload.files.length > 0) {
    return listPayload.files[0].id;
  }

  const createPayload = await driveFetch(
    accessToken,
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "media",
        mimeType: "application/vnd.google-apps.folder"
      })
    }
  );

  return createPayload.id;
};

const uploadTestFile = async (accessToken, folderId) => {
  const fileName = `morjan-drive-test-${Date.now()}.txt`;
  const fileBody = `Morjan Drive test OK at ${new Date().toISOString()}\n`;
  const boundary = "morjan_boundary_" + Date.now();

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify({
      name: fileName,
      parents: [folderId]
    })}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${fileBody}\r\n` +
    `--${boundary}--`;

  return driveFetch(
    accessToken,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,parents",
    {
      method: "POST",
      headers: {
        "content-type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );
};

const main = async () => {
  console.log("Exchanging refresh token for access token...");
  const accessToken = await getAccessToken();
  console.log("Access token OK.");

  console.log('Finding or creating Drive folder "media"...');
  const folderId = await findOrCreateMediaFolder(accessToken);
  console.log("Folder id:", folderId);

  console.log("Uploading test file...");
  const uploadedFile = await uploadTestFile(accessToken, folderId);
  console.log("Upload OK:");
  console.log(JSON.stringify(uploadedFile, null, 2));
  console.log("\nOpen Drive as morjan.family.media@gmail.com and look in media/");
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
