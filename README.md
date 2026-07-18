# morjan.family

Monorepo for Morjan family sites on Cloudflare Pages.  
Each app under `apps/` is independent (own Pages project + custom domain).

## Apps

| Folder | Theme | Domain(s) |
| --- | --- | --- |
| `apps/hub` | Family hub | `morjan.family`, `www.morjan.family` |
| `apps/arianna` | Pink + QR codes (age 5) | `arianna.morjan.family` |
| `apps/helen` | Violet mechatronics student | `helen.morjan.family` |
| `apps/harald` | Green software developer | `harald.morjan.family` |
| `apps/katy` | Proud tech mom (warm coral) | `katy.morjan.family` |
| `apps/trips` | Trip log (places + photos) | `trips.morjan.family` |

## Local preview

```bash
npx --yes serve apps/arianna
```

## Trips content & photo storage (R2)

**Do not put 50 trip JPEGs in Git.**

| Layer | Where | Purpose |
| --- | --- | --- |
| Originals | Google Drive / external SSD | True backup (full quality) |
| Web copies | R2 bucket `morjan-trips` → `https://media.morjan.family` | Gallery delivery |
| Catalog | `apps/trips/data.js` | Metadata + URLs only |

### One-time setup

```bash
npx wrangler login
bash scripts/setup-media-r2.sh
```

That creates bucket `morjan-trips` and attaches custom domain `media.morjan.family`.

### Upload a trip album

Compress/export web-sized photos first, then:

```bash
bash scripts/upload-trip-photos.sh guatemala-highlands-2024 ./path/to/photos
```

The script prints ready-to-paste `cover` / `photos` lines for `apps/trips/data.js`.

Helpers already in `data.js`:

```js
cover: morjanMediaUrl("guatemala-highlands-2024", "01.jpg"),
photos: morjanTripPhotos("guatemala-highlands-2024", ["01.jpg", "02.jpg"]),
```

Tiny placeholders may stay in `apps/trips/img/`. Real albums go to R2.

Click a trip card (or **View gallery**) to open the lightbox.

**Later:** phone upload → Google Drive (original) + R2 (web) + gallery — see [`docs/trips-phone-upload-plan.md`](docs/trips-phone-upload-plan.md).

## Cloudflare Pages (one project per app)

Same GitHub repo for all. Per app:

- Production branch: `main`
- Framework: None
- Build command: empty
- **Root directory:** e.g. `apps/helen`
- Custom domain: matching hostname

Push to `main` auto-deploys connected projects.
