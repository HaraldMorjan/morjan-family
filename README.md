# morjan.family

Under-construction site for the Morjan family domains, hosted on Cloudflare Pages.

## Hostnames

- `morjan.family`
- `www.morjan.family`
- `helen.morjan.family`
- `harald.morjan.family`
- `katy.morjan.family`
- `arianna.morjan.family`

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
npx --yes serve .
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub (or upload the folder in Pages).
2. Cloudflare → **Workers & Pages** → **Create** → **Pages** → connect the repo (or **Upload assets**).
3. Build settings for this static site:
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: `/` (or leave default for root)
4. After the first deploy, open the project → **Custom domains** → add each hostname above.
5. Cloudflare will create/update DNS records in the `morjan.family` zone automatically.
6. SSL stays on the Free plan (Full / Full strict).

## Notes

- One Pages project can serve all six hostnames for now.
- Later, split apps (`expenseTracker`, `trips`, …) into their own Pages projects.
