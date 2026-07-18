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

## Trips content

1. Edit `apps/trips/data.js`
2. Add photos under `apps/trips/img/`
3. Set each trip `cover` to `img/your-photo.jpg`

## Cloudflare Pages (one project per app)

Same GitHub repo for all. Per app:

- Production branch: `main`
- Framework: None
- Build command: empty
- **Root directory:** e.g. `apps/helen`
- Custom domain: matching hostname

Push to `main` auto-deploys connected projects.
