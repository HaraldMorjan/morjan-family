# Context handoff — morjan.family project

Copy this whole file into a new Agent chat (or `@docs/context-handoff.md`).

## What this is
Monorepo of Cloudflare Pages sites for the Morjan family (`c:\Users\hmorjan\Documents\GitHub\morjan-family`).
Apps under `apps/`, each its own Pages project + subdomain. API is a Cloudflare Worker.

## Live today
- Hub: `morjan.family` (living constellation, day/night sky, sun/moon switch)
- Per-person: `helen` / `arianna` (QR confetti) / `harald` / `katy` `.morjan.family`
- Trips: `trips.morjan.family` (per-trip gallery + lightbox)
- Media: `media.morjan.family` (R2 bucket `morjan-trips`, web copies)
- **API Worker (new):** `morjan-api` → `https://api.morjan.family`
  - Custom domain `api.morjan.family` **attached** (declared in `apps/api/wrangler.toml` as a `custom_domain` route). `*.workers.dev` URL now disabled (custom domain only).
  - D1 `morjan-catalog` created + migrated (`database_id = 43da9c01-39be-4f6b-a6d7-bd22589a3133`)
  - R2 binding `MEDIA` → `morjan-trips`
  - Routes live: `GET /health`, `GET /trips`, `GET /trips/:id/photos`
  - `POST /trips/:id/photos` → token + multipart → Drive original → resize (Images) → R2 → D1 → `{ mediaUrl, photoId, driveConfirmed }`

## Source-of-truth docs (read these first)
- `docs/roadmap.md` — vision + agreed feature order
- `docs/trips-phone-upload-plan.md` — feature #1, defined & locked
- `apps/api/README.md` — Worker setup / secrets
- `docs/context-handoff.md` — this file

## Agreed feature order (priority)
1. Trip photos cycle and flow  ← IN PROGRESS (pipeline + D1 seed live; Shortcut next)
2. Trips (per-trip pages, map, story mode, tagging)
3. Auth (family-only; Cloudflare Access is the target upgrade)
4. New feature (owner will ask for suggestions when we get there)
Hub "living" features are parked (not in priority list).

## Feature #1 — locked decisions
- Delivery: iOS Shortcut (+ Android share target). NO native/TestFlight app.
- Free space: Shortcut MOVES uploaded photos into a "Backed up — safe to delete" album (never auto-deletes). Only after API confirms success.
- Auth v1: shared secret `X-Upload-Token` / Worker secret `UPLOAD_TOKEN`. Cloudflare Access later (feature #3).
- Pipeline: phone → `api.morjan.family` (Worker) → Google Drive (original) + R2 (light web copy) → D1 catalog → gallery.
- Show/discovery later: NFC souvenir tags → `trips.morjan.family/<trip>` (needs per-trip pages = feature #2).

## Google Drive (originals) — LOCKED
- Account: `morjan.family.media@gmail.com`
- Folder: `media` (app may create its own under `drive.file` scope)
- Per-trip layout: `media/<trip-id>/`
- Auth method: **OAuth refresh token** (NOT service account)
  - Consumer Gmail cannot use new service accounts for My Drive storage (Apr 2025+)
  - Secrets on Worker: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- GCP project: `morjan-media`
- Scope: `https://www.googleapis.com/auth/drive.file`
- Consent app must stay **In production** (Testing expires refresh tokens in 7 days)
- **Drive write TESTED OK** via `apps/api/scripts/test-drive-upload.mjs` (owner confirmed)

## Backup strategy (chat decisions)
- Primary originals: Google Drive / Google One on the media account (start 15 GB → upgrade when tight; wife shoots 200+ photos+video per event).
- R2: light web copies of **photos** for gallery only. Video backed up in Drive, not shown in gallery yet.
- Informal second copy: iPhone iCloud auto-backup. Home SSD/NAS = someday.
- Do not re-litigate Drive vs R2-primary; plan docs keep Drive-as-originals.

## Worker secrets status (as of 2026-07-18)
All four put successfully on Worker `morjan-api`:
- `GOOGLE_CLIENT_ID` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `GOOGLE_REFRESH_TOKEN` ✅
- `UPLOAD_TOKEN` ✅

Earlier mistaken `secret put` (Client ID used as secret *name*) — ignore; correct names were re-put after deploy.

## Repo scaffolding added
- `apps/api/wrangler.toml` — Worker `morjan-api`, D1 + R2 + Images bindings, `api.morjan.family` custom-domain route
- `apps/api/src/index.js` — health/list routes + token-gated POST
- `apps/api/src/upload.js` — multipart → Drive → resize → R2 → D1 pipeline
- `apps/api/src/drive.js` — OAuth refresh + `media/<trip-id>/` folders + resumable upload
- `apps/api/src/resize.js` — Images binding web copy (fallback to original)
- `apps/api/migrations/0001_init.sql` — `trips` + `trip_photos`
- `apps/api/seeds/trips.sql` — re-runnable trip metadata seed (from `data.js`)
- `apps/api/scripts/seed-trips.sh` — apply seed to local/remote D1
- `apps/api/scripts/test-drive-upload.mjs` — one-shot Drive connectivity test
- `apps/api/README.md` — setup docs

## Next build steps (in order)
1. ~~Attach custom domain `api.morjan.family` to Worker `morjan-api`~~ ✅ DONE (2026-07-18)
2. ~~Wire `POST /trips/:tripId/photos`~~ ✅ DONE (2026-07-18) — auto-creates minimal trip row if missing
3. ~~Seed trips into D1~~ ✅ DONE (2026-07-18) — `apps/api/seeds/trips.sql` + `bash scripts/seed-trips.sh --remote` (re-runnable upsert; mirrors `data.js` metadata only)
4. Build iOS Shortcut (share sheet → POST → move to "Backed up — safe to delete" album)
5. Point trips UI at API (fallback to `data.js` during transition)
6. Phase 2 polish already partially ready (Drive secrets exist)

## Key facts (don't re-litigate)
- iOS Shortcuts CAN upload share-sheet photos to a custom API (no App Store).
- Google Photos API auto-sync is DEAD since Mar 2025 — not a backup path.
- GitHub is NOT a photo backup option.
- iCloud has no general third-party write API → phone backstop only.
- New Google service accounts cannot own consumer My Drive files → OAuth refresh token is correct.

## Smoke tests
```bash
curl https://api.morjan.family/health
curl https://api.morjan.family/trips
```

Drive re-test (local, with env secrets — do not commit):
```bash
cd apps/api
export GOOGLE_CLIENT_ID='...'
export GOOGLE_CLIENT_SECRET='...'
export GOOGLE_REFRESH_TOKEN='...'
node scripts/test-drive-upload.mjs
```

## House rules (always apply)
- Address the owner as "mi mero macho". Respond in English unless asked otherwise.
- Minimal diffs; ask before assuming scope; investigate before re-fixing.
- JS style: `const`/`let`, arrow fns in iterators, descriptive names, `catch (error)` (no bare catch).
- First reply in a new chat: Rules loaded checklist per `session-start-confirmation.mdc`.
