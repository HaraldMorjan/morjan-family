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

## Trips content & photo storage

**Do not put 50 trip JPEGs in Git.** Use this split so nothing gets lost:

| Layer | Where | Purpose |
| --- | --- | --- |
| Originals | Google Drive / external SSD | True backup (full quality) |
| Web copies | **Cloudflare R2** (recommended) | Site gallery; cheap, durable, outside Git |
| Catalog | `apps/trips/data.js` | Titles, places, and photo **URLs** only |

### Recommended R2 layout

- Bucket: e.g. `morjan-trips`
- Folders per trip id: `guatemala-highlands-2024/01.jpg` … `50.jpg`
- Optional custom domain: `media.morjan.family`
- In `data.js`, list full URLs in `photos` (and set `cover` to the hero shot)

### Local placeholders only

Tiny demo assets can stay in `apps/trips/img/`. Real family albums should live in R2.

### Per-trip gallery fields

```js
{
  id: "guatemala-highlands-2024",
  title: "Guatemala Highlands",
  cover: "https://media.morjan.family/guatemala-highlands-2024/01.jpg",
  photos: [
    "https://media.morjan.family/guatemala-highlands-2024/01.jpg",
    "https://media.morjan.family/guatemala-highlands-2024/02.jpg"
    // …up to 50+
  ]
}
```

Click a trip card (or **View gallery**) to open the lightbox.

## Cloudflare Pages (one project per app)

Same GitHub repo for all. Per app:

- Production branch: `main`
- Framework: None
- Build command: empty
- **Root directory:** e.g. `apps/helen`
- Custom domain: matching hostname

Push to `main` auto-deploys connected projects.
