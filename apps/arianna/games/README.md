# Club de aprendizaje — Arianna

Spanish UI learning games for Arianna (age 5), on `arianna.morjan.family`.

| Path | Stack | Theme |
| --- | --- | --- |
| `/games/` | Static hub | Stars, stickers, prizes |
| `/games/qr/` | Static QR board | Scan missions; green when done |
| `/games/counting/` | **React + Vite (JS)** | Contar con Rumi |
| `/games/reading/` | **Astro (JS)** | Volar con Skye |
| `/games/english/` | **Vue + Vite (JS)** | Club secreto Kuromi |

All game code is **JavaScript only** (no TypeScript).

## Parent guide

### Play on iPhone X

1. Open [https://arianna.morjan.family/games/qr/](https://arianna.morjan.family/games/qr/)
2. Or print the board (**Imprimir**) and scan a paper card with Camera
3. Finish a mission → that tile turns **green** on the phone board (same Safari / `localStorage`)

For local testing, set **Base URL → Local** on the QR page so codes point at your machine.

### Redefine prizes later

Edit [`shared/prizes.js`](shared/prizes.js):

```js
export const prizeCatalog = [
  { id: "helado", label: "Un helado con papá", cost: 50, emoji: "🍦" }
];
```

Redeem on the club hub: hold **Canjear** ~1s (parent confirm).

### Add reading / English content

- Spanish words: [`reading/src/content/words.js`](reading/src/content/words.js)
- English sets: [`english/src/vocabulary.js`](english/src/vocabulary.js)
- QR missions list: [`shared/missions.js`](shared/missions.js)

### Local build & preview

From `apps/arianna`:

```bash
npm run build
npx --yes serve dist
```

Cloudflare Pages for Arianna:

- **Root directory:** `apps/arianna`
- **Build command:** `npm run build`
- **Output directory:** `dist`

Dev one game:

```bash
npm run dev:counting
npm run dev:reading
npm run dev:english
```

### Tests

```bash
npm test
```
