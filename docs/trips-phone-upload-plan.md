# Trips: phone upload plan (Drive + R2 + gallery)

> This is **feature #1 "Trip photos cycle and flow"** from [`roadmap.md`](roadmap.md).

Status: **defined — v1 decisions locked 2026-07**

## The real problem (why this exists)

Family phones fill up on road trips, so **they can't take more photos**. The need is a
**very easy** way for *anyone in the family* to move photos **off** the phone **without ever
losing them**, then see any trip's photos effortlessly later (living room, or a tap on an
NFC souvenir). It is a **safe-offload + easy-show** problem, not just an upload feature.

Goal: From a phone, send selected photos to a trip → keep full-res in Google Drive →
create a light web copy on Cloudflare R2 → show it in that trip's gallery → free phone
space safely.

## Locked decisions (v1)

| Decision | Choice | Rationale |
| --- | --- | --- |
| **Delivery** | **iOS Shortcut** (+ Android share target) — no App Store | Install once via iCloud link; works on every family phone; we own the pipeline. A native/TestFlight app is rejected for v1 (cost, 90-day rebuilds, maintenance). |
| **Free space** | Shortcut **moves uploaded photos into a "Backed up — safe to delete" album** (does *not* auto-delete) | Nothing is deleted by surprise; family bulk-deletes the album once they've seen photos in the gallery. |
| **Auth (v1)** | **Shared secret baked into the family Shortcut** (`X-Upload-Token` header) | Only people with the Shortcut can upload. Full Auth (feature #3, Cloudflare Access) upgrades this later. |
| **Backup layer** | Google Drive original (`morjan.family.media@gmail.com`, root folder `media`, per-trip `media/<trip-id>/`) + R2 web copy | Drive = never-lose original; R2 = light gallery copy. |
| **Show later** | Per-trip gallery + NFC souvenir tags (`trips.morjan.family/<trip>`) | NFC depends on per-trip pages (feature #2), added then. |

> Deletion order is a hard rule: **confirm the Drive original exists → then** the Shortcut
> moves photos to the "safe to delete" album. The web copy (R2) can be retried; the original
> must be safe before any photo is flagged for deletion.

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
Phone photo picker → Share sheet → "Add to Morjan Trips" Shortcut
        │  HTTPS POST multipart/form-data + X-Upload-Token
        ▼
Upload API (Cloudflare Worker)     api.morjan.family/trips/:tripId/photos
        │
        ├─► Google Drive  (original, full resolution)   ← confirm FIRST
        ├─► Sharp/Image resize (Worker or queue step)
        ├─► R2 morjan-trips  (web copy)
        └─► Catalog store (D1) → gallery reads this
                │
                ▼  on success
Shortcut moves those photos → "Backed up — safe to delete" album
```

| Piece | Choice | Notes |
| --- | --- | --- |
| Delivery | **iOS Shortcut** (Share Sheet → receives Images → `POST` multipart) + Android share target | Install once via iCloud link; no App Store. Confirmed viable via `Get Contents of URL` + `Repeat with Each`. |
| Site | Existing Pages app `apps/trips` | Optional secondary in-page upload button later (`capture="environment"`); Shortcut is primary for v1. |
| API | Cloudflare Worker on `api.morjan.family` | Fits current CF stack; keep secrets off the static site. |
| Originals backup | Google Drive (Shared Drive or family folder) | Folder per `trip-id`. |
| Web delivery | R2 bucket `morjan-trips` + `media.morjan.family` | Resized JPEG/WebP. |
| Catalog | Cloudflare D1 | Source of truth for gallery URLs. |
| Auth (v1) | **Shared secret** `X-Upload-Token` validated by the Worker | Only holders of the family Shortcut can upload. Cloudflare Access = feature #3 upgrade. |
| Show / discovery | Per-trip gallery + **NFC souvenir tags** → `trips.morjan.family/<trip>` | NFC depends on per-trip pages (feature #2). |

Aligns with hosting pattern: **one subdomain = one product** — API on `api.morjan.family`, media on `media.morjan.family`, UI on `trips.morjan.family`.

---

## User experience (Shortcut flow)

1. In Photos, select the trip photos → tap **Share**.
2. Tap **Add to Morjan Trips** (the installed Shortcut).
3. Shortcut asks **which trip** (list pulled from the API, or a quick menu).
4. Uploads each photo → progress "Backing up… / Web copy… / Done".
5. New photos appear in that trip's gallery immediately (no deploy).
6. On success, Shortcut **moves those photos into the "Backed up — safe to delete" album**.
7. Later, family reviews that album and bulk-deletes to free space — with confidence.
8. To show off: open `trips.morjan.family/<trip>` or **tap the NFC souvenir** for that trip.

Constraints:

- Max file size (e.g. 25 MB original)
- Allowed types: JPEG, PNG, HEIC (convert HEIC → JPEG server-side)
- Rate limit per token/IP
- Spend / storage caps in Worker config
- Shortcut only moves to the "safe to delete" album **after** the API confirms success

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
- The Shortcut moves photos to the "safe to delete" album **only** on a `200` that confirms the Drive original is stored — never on a partial/failed upload.

---

## Google Drive setup (later checklist)

Dedicated Drive account (originals live here — see backup strategy):

| Item | Value |
| --- | --- |
| Drive account | `morjan.family.media@gmail.com` |
| Root folder | `media` |
| Per-trip layout | `media/<trip-id>/` (e.g. `media/guatemala-highlands-2024/`) |

**Auth method (locked): OAuth 2.0 refresh token — NOT a service account.**
Since 15 Apr 2025 new service accounts have no storage quota and cannot own files in a
consumer (Gmail) My Drive → `403 storageQuotaExceeded`. Service accounts only work with
Shared Drives (Google Workspace). `morjan.family.media@gmail.com` is a consumer account,
so the Worker authenticates as that user via a long-lived refresh token, using the
account's own 15 GB / Google One quota.

Checklist (one-time, signed in as `morjan.family.media@gmail.com`):

1. Google Cloud project (e.g. `morjan-media`) → enable **Google Drive API**.
2. **OAuth consent screen** → User type **External**; app + support email = the media account.
   - Scope: `https://www.googleapis.com/auth/drive.file` (non-sensitive → no Google verification).
   - **Publish app to "In production"** — Testing mode expires refresh tokens after 7 days.
3. **Credentials → OAuth client ID → Web application**; add redirect
   `https://developers.google.com/oauthplayground`. Save **Client ID + Secret**.
4. Mint the **refresh token once** via the OAuth Playground (own credentials, `access_type=offline`,
   `prompt=consent`, scope `drive.file`), authorized as the media account.
5. Store Worker secrets:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` (see note)
6. Root folder: with `drive.file` the Worker can only touch folders **it** created, so the
   Worker **creates the `media` root folder on first run** and persists its ID (do not reuse a
   hand-made folder). It then creates `media/<trip-id>/` subfolders as needed.
   - Alternative to reuse a manually-created `media` folder: use the full `drive` scope
     (sensitive → unverified-app warning, fine for a single owner). `drive.file` is preferred.

Runtime: exchange the refresh token for an access token at
`https://oauth2.googleapis.com/token`; cache it ~55 min.

---

## Auth

**v1 (locked): shared secret token.** The family Shortcut sends `X-Upload-Token: <secret>`;
the Worker rejects anything without the matching secret (stored as a Worker secret). Only
people who installed the Shortcut can upload. Simple, no login UI, good enough for a
family-only write endpoint that isn't publicly advertised.

- Rotate by pushing an updated Shortcut + swapping the Worker secret.
- Rate-limit per token/IP; keep CORS locked to the trips origin.

**Upgrade path (feature #3, later):** replace/wrap the token with **Cloudflare Access**
(email allowlist) for real per-person identity across all family subdomains. Options kept
for that decision:

| Option | Pros | Cons |
| --- | --- | --- |
| **Cloudflare Access** (allowlisted emails) | No custom login UI, central SSO feel | Needs Zero Trust setup |
| Family PIN → Worker session cookie | Simple UX | Must hash, rate-limit, rotate |
| Magic link email | Nice per-person UX | More moving parts |

---

## The Shortcut (primary delivery)

1. **Receive** Share Sheet input → type **Images**, allow multiple.
2. **Ask which trip** — menu, or `GET api.morjan.family/trips` for a live list.
3. **Repeat with Each** photo → **Get Contents of URL**:
   - `POST https://api.morjan.family/trips/<tripId>/photos`
   - Request Body: **Form**; file field = the repeated item.
   - Headers: `X-Upload-Token: <family secret>`, `Content-Type: multipart/form-data`.
4. **On success** → **Add to Album** "Backed up — safe to delete" (does not delete).
5. Show a final "Done — N photos backed up" notification.
6. Distribute via a single **iCloud share link**; each family member installs once and
   pastes the shared token (or it's baked into the shared copy).

> Enable *Settings → Shortcuts → Advanced → Allow Sharing Large Amounts of Data* for big batches.
> Keep the screen on during large transfers.

## Frontend changes (`apps/trips`, secondary/optional)

1. Load trips/photos from API (fallback to `data.js` while migrating).
2. Optional in-page **Add photo** button for desktop (`<input type="file" accept="image/*">`).
3. Per-trip pages + **NFC-friendly URLs** (`/<trip>`) — shared with feature #2.
4. Keep existing lightbox (prev/next/thumbs); append new photos on upload success.

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

### Phase 1 — API + catalog + Shortcut (no Drive yet)
- [x] Worker project scaffold (`apps/api`, Worker name `morjan-api`)
- [x] D1 schema migration file (`apps/api/migrations/0001_init.sql`)
- [x] `GET` trips/photos + `GET /health` (wired; needs D1 create + deploy)
- [x] Shared-secret `X-Upload-Token` check on `POST` (returns 501 until upload pipeline)
- [ ] Create D1 `morjan-catalog`, paste `database_id`, migrate, deploy
- [ ] Put secrets with correct names on `morjan-api` (see `apps/api/README.md`)
- [ ] Custom domain `api.morjan.family`
- [ ] `POST` photo → resize → R2 → D1 only
- [ ] Build the **iOS Shortcut** (share sheet → upload → move to "safe to delete" album)
- [ ] Trips UI reads API

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
