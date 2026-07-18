# Trips: phone upload plan (Drive + R2 + gallery)

Status: **planned — implement later**  
Goal: From a phone, upload a photo to a trip → keep full-res in Google Drive → create a web copy on Cloudflare R2 → show it in that trip’s gallery.

Related today:

- Gallery UI: `apps/trips/` (lightbox + `photos[]` in `data.js`)
- R2 wiring (manual): `scripts/setup-media-r2.sh`, `scripts/upload-trip-photos.sh`
- Public media host: `https://media.morjan.family/<trip-id>/<file>`

---

## Why not static-only

`data.js` + hand uploads cannot safely accept phone uploads. Need:

1. Authentication (family only)
2. An API that accepts multipart uploads
3. Google Drive write access
4. Image resize/compress
5. R2 write access
6. A durable photo catalog (not Git commits per photo)

---

## Recommended architecture

```text
Phone (trips.morjan.family)
        │  HTTPS + auth cookie/JWT
        ▼
Upload API (Cloudflare Worker)     e.g. api.morjan.family/trips/...
        │
        ├─► Google Drive  (original, full resolution)
        ├─► Sharp/Image resize (Worker or queue step)
        ├─► R2 morjan-trips  (web copy)
        └─► Catalog store (D1 or KV/R2 JSON) → gallery reads this
```

| Piece | Choice | Notes |
| --- | --- | --- |
| Site | Existing Pages app `apps/trips` | Add Upload button + picker (`capture="environment"` on mobile) |
| API | Cloudflare Worker on `api.morjan.family` | Fits current CF stack; keep secrets off the static site |
| Originals backup | Google Drive (Shared Drive or family folder) | Folder per `trip-id` |
| Web delivery | R2 bucket `morjan-trips` + `media.morjan.family` | Resized JPEG/WebP |
| Catalog | Cloudflare D1 (preferred) or R2 JSON manifest | Source of truth for gallery URLs |
| Auth | Cloudflare Access (email allowlist) **or** simple shared PIN + HttpOnly session | Access is fastest “family only” |

Aligns with hosting pattern: **one subdomain = one product** — API on `api.morjan.family`, media on `media.morjan.family`, UI on `trips.morjan.family`.

---

## User experience

1. Open trip on `trips.morjan.family` (signed in).
2. Tap **Add photo**.
3. Camera roll / camera opens.
4. Progress: “Saving original… / Creating web copy… / Done”.
5. New photo appears in that trip’s gallery immediately (no deploy).
6. Optional: show “Saved to Drive” confirmation.

Constraints:

- Max file size (e.g. 25 MB original)
- Allowed types: JPEG, PNG, HEIC (convert HEIC → JPEG server-side)
- Rate limit per user/IP
- Spend / storage caps in Worker config

---

## Data model (D1 sketch)

```sql
-- trips (optional if still seeded from config)
CREATE TABLE trips (
  id TEXT PRIMARY KEY,          -- guatemala-highlands-2024
  title TEXT NOT NULL,
  place TEXT,
  dates TEXT,
  blurb TEXT,
  cover_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE trip_photos (
  id TEXT PRIMARY KEY,          -- uuid
  trip_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,         -- guatemala-highlands-2024/20260718-abc.webp
  media_url TEXT NOT NULL,      -- https://media.morjan.family/...
  drive_file_id TEXT,           -- Google Drive file id
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  created_at TEXT NOT NULL,
  created_by TEXT
);
```

Gallery load path:

1. `GET /api/trips` → trip cards (cover + photo count)
2. `GET /api/trips/:tripId/photos` → ordered photo URLs for lightbox
3. `POST /api/trips/:tripId/photos` → multipart upload

Migrate off hand-edited `photos[]` in `data.js` once API is live (keep `data.js` only as seed/fallback during transition).

---

## Upload pipeline (Worker)

`POST /api/trips/:tripId/photos` (auth required)

1. Validate session + trip id + content type + size.
2. Read original bytes.
3. **Drive:** upload original to `Morjan Trips/<trip-id>/` via Google Drive API (service account or OAuth refresh token stored in Worker secrets).
4. **Resize:** produce web derivative (e.g. max edge 2048px, WebP/JPEG quality ~80).
5. **R2:** `put` to `morjan-trips/<trip-id>/<timestamp>-<id>.webp` with cache-friendly `Cache-Control`.
6. **D1:** insert `trip_photos` row; if trip has no cover, set `cover_url`.
7. Return `{ mediaUrl, photoId }` so the UI appends to the open gallery.

Failure policy:

- If Drive succeeds and R2 fails → retry R2; do not claim success until web copy exists (gallery needs R2).
- If R2 succeeds and Drive fails → keep R2 photo, flag `drive_pending` for retry job (original safety net).
- Prefer: **Drive first**, then web copy, so backup exists even if resize fails (store original temporarily in R2 `inbox/` only if needed).

---

## Google Drive setup (later checklist)

1. Google Cloud project → enable Drive API.
2. Service account **or** single-user OAuth (family Drive owned by Harald/Katy).
3. Shared folder “Morjan Trips” shared with the service account (Editor).
4. Store secrets in Worker:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_REFRESH_TOKEN` + client id/secret
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
5. Create subfolder per `trip-id` on first upload if missing.

---

## Auth options (pick one when implementing)

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Cloudflare Access** (allowlisted emails) | Fast, no custom login UI | Needs Zero Trust setup |
| **B. Family PIN / password** → Worker session cookie | Simple UX | Must hash, rate-limit, rotate |
| **C. Magic link email** | Nice UX | More moving parts |

Recommendation: **A** for private family use; add Upload UI only when Access session present (or separate `upload.trips…` protected route).

---

## Frontend changes (`apps/trips`)

1. Load trips/photos from API (fallback to `data.js` while migrating).
2. Per trip: **Add photo** button (hidden if logged out).
3. `<input type="file" accept="image/*" capture="environment">` + multi-select later if desired.
4. Upload with `fetch` + progress; on success, push into lightbox thumb list.
5. Keep existing lightbox (prev/next/thumbs).

---

## Security & cost guardrails

- Auth on all mutating routes
- CORS: only `https://trips.morjan.family` (and Pages preview if needed)
- Max body size at Worker + CF
- Monthly R2 storage alert (stay under free 10 GB when possible)
- Strip EXIF GPS if privacy desired (optional flag)
- No public listing of Drive; Drive is backup-only

---

## Implementation phases

### Phase 0 — already partly done
- [x] Per-trip gallery UI
- [x] R2 scripts + `media.morjan.family` plan
- [ ] Enable R2 in Cloudflare dashboard
- [ ] Run `bash scripts/setup-media-r2.sh`
- [ ] Manual uploads via `upload-trip-photos.sh` until phone upload ships

### Phase 1 — API + catalog (no Drive yet)
- [ ] Worker project `api` (or `apps/api`) on `api.morjan.family`
- [ ] D1 schema + migrations
- [ ] `GET` trips/photos
- [ ] `POST` photo → resize → R2 → D1 only
- [ ] Trips UI reads API + upload button
- [ ] Auth (Access or PIN)

### Phase 2 — Google Drive originals
- [ ] Drive credentials + root folder
- [ ] Upload original to Drive in pipeline
- [ ] Persist `drive_file_id`
- [ ] Retry/repair for failed Drive writes

### Phase 3 — polish
- [ ] Multi-photo select
- [ ] Delete photo (R2 + D1; soft-delete Drive or trash)
- [ ] Cover picker
- [ ] HEIC support
- [ ] Admin “rebuild manifest” tool

---

## Out of scope (for this plan)

- Public anonymous uploads
- Video
- Face recognition / albums auto-grouping
- Syncing Drive → R2 as primary (upload API is the write path; Drive is backup)

---

## Success criteria

- From a phone on cellular/Wi‑Fi, authenticated family member adds a photo to “Guatemala Highlands”.
- Full-res appears in the trip’s Google Drive folder.
- Web copy is reachable at `https://media.morjan.family/...` and shows in the gallery without redeploying Pages.
- Unauthenticated users cannot upload.

---

## When ready to build

1. Finish Phase 0 (R2 enabled + custom domain).
2. Say which auth option (A/B/C).
3. Implement Phase 1 first (upload → R2 → gallery), then Phase 2 (Drive).

This document is the source of truth for that work.
