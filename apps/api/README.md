# morjan-api

Cloudflare Worker for `api.morjan.family` — trip catalog + phone upload pipeline.

Plan: [`docs/trips-phone-upload-plan.md`](../../docs/trips-phone-upload-plan.md)

## Secrets (correct names)

`wrangler secret put` takes the **name**, then prompts for the **value**.

| Secret name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Client ID (`….apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client secret |
| `GOOGLE_REFRESH_TOKEN` | Refresh token from OAuth Playground |
| `UPLOAD_TOKEN` | Long random string for the family Shortcut (`X-Upload-Token`) |

Generate `UPLOAD_TOKEN` once:

```bash
openssl rand -hex 32
```

### Put secrets on this Worker (after first deploy)

From `apps/api`:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put UPLOAD_TOKEN
```

If secrets were put earlier with the **wrong name** (e.g. the Client ID as the secret name), or on another Worker (`morjan-media`), they do **not** apply here. Re-put all four on `morjan-api` with the names above.

## First-time setup

```bash
cd apps/api

# 1) Create D1 and paste database_id into wrangler.toml
npx wrangler d1 create morjan-catalog

# 2) Apply schema
npx wrangler d1 migrations apply morjan-catalog --remote

# 3) Deploy Worker
npx wrangler deploy

# 4) Put secrets (prompts for values — do not pass values on the CLI)
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put UPLOAD_TOKEN

# 5) Seed trip catalog (mirrors apps/trips/data.js metadata; re-runnable)
bash scripts/seed-trips.sh --remote
```

## Seed trips (D1)

Trip **metadata** is seeded from `seeds/trips.sql` (kept in sync with
`apps/trips/data.js`). Placeholder photos are **not** seeded — real photos come
from `POST /trips/:id/photos`.

```bash
cd apps/api
bash scripts/seed-trips.sh --remote   # production D1
bash scripts/seed-trips.sh --local    # local wrangler D1
```

Upsert rules:

- Always refresh `title` / `place` / `dates` / `blurb`
- Keep a real `cover_url` if one was set by an upload; only overwrite empty or placeholder covers

When you add a trip in `data.js`, add a matching `INSERT … ON CONFLICT` block in
`seeds/trips.sql` and re-run the seed script.

## Custom domain

Declared in `wrangler.toml` as a `custom_domain` route, so a deploy attaches it and
creates the DNS record automatically:

```bash
cd apps/api
npx wrangler deploy
```

(Manual alternative: Dashboard → Workers & Pages → `morjan-api` → Settings → Domains →
add `api.morjan.family` in zone `morjan.family`.)

## Smoke test

```bash
curl https://api.morjan.family/health
curl https://api.morjan.family/trips
```

## Upload (`POST /trips/:tripId/photos`)

Requires header `X-Upload-Token: <UPLOAD_TOKEN>` and `multipart/form-data` with a
file field named `file`, `photo`, or `image`.

Pipeline order (locked):

1. Validate token + trip id + type + size (max 25 MB)
2. Auto-create a minimal D1 `trips` row if missing (titles seeded later)
3. Upload **original** to Google Drive `media/<trip-id>/` (must succeed)
4. Resize via Images binding (max edge 2048, JPEG q80) — fail without publishing if resize fails
5. Put web copy on R2 → `https://media.morjan.family/<trip-id>/...`
6. Insert `trip_photos` row; set trip `cover_url` if empty
7. Return `{ ok, photoId, mediaUrl, driveFileId, driveConfirmed, safeToMoveOffPhone }`

Smoke (replace token; use a small JPEG):

```bash
curl -sS -X POST "https://api.morjan.family/trips/guatemala-highlands-2024/photos" \
  -H "X-Upload-Token: $UPLOAD_TOKEN" \
  -F "file=@./sample.jpg;type=image/jpeg"
```

Unauthorized without token returns `401`. Missing pipeline pieces return `502` with detail
(Drive original is never claimed successful unless `driveConfirmed: true`).

## Local

```bash
cd apps/api
npx wrangler dev
```
