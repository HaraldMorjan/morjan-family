# morjan.family — vision & roadmap

Status: **vision / someday** — a place to ground ideas before committing to build.
Owner: mi mero macho (Harald). Last shaped: 2026-07.

This is not a task list. It captures *where we want to go*, the *options* for each idea,
the *trade-offs*, and the *open decisions* that must be answered before any of it is built.
When an idea graduates to "build next", it gets its own detailed plan doc (like
[`trips-phone-upload-plan.md`](trips-phone-upload-plan.md)) and stops living only here.

---

## North star

> A warm, private-by-default family universe: a living hub that grows with the family,
> individual spaces that feel personal, and trips that anyone in the family can add to
> from their phone — without ever fearing a lost photo or a leaked private moment.

Guiding principles (from `architecture-standards.mdc`):

- **One subdomain = one product = one deploy folder.** UI, API, and media stay separated.
- **Static frontends on Pages, APIs on Workers, media on R2, DNS on Cloudflare.**
- **Choose the professional long-term solution** over the quick hack.
- **Private by default.** Public is an explicit choice per page/asset, never the accident.

---

## Where we are today (baseline)

| Product | Domain | State |
| --- | --- | --- |
| Hub (living constellation) | `morjan.family` | Live — day/night sky, shooting stars, sun/moon switch |
| Helen | `helen.morjan.family` | Live — violet mechatronics theme |
| Arianna | `arianna.morjan.family` | Live — pink + QR confetti surprise |
| Harald | `harald.morjan.family` | Live — green developer theme |
| Katy | `katy.morjan.family` | Live — warm coral "tech mom" theme |
| Trips | `trips.morjan.family` | Live — per-trip gallery + lightbox, R2-backed media |
| Media (R2) | `media.morjan.family` | Bucket `morjan-trips` wired; web copies of photos |

Everything is static Pages today. There is **no API, no auth, and no database** yet —
that gap is the single biggest thing standing between the current sites and the vision below.

---

## The five pillars

### 1. Photo upload (phone → Drive + R2 → gallery)

The most mature idea — full plan already exists in
[`trips-phone-upload-plan.md`](trips-phone-upload-plan.md).

- **Essence:** authenticated family member adds a photo from their phone → original to
  Google Drive (full res) → web copy to R2 → appears in the trip gallery instantly.
- **Depends on:** Pillar 5 (auth) + a Worker API + a catalog store (D1).
- **Vision extensions beyond that plan:**
  - Multi-photo / whole-album upload with background processing.
  - Video (out of scope in the current plan — revisit once storage cost is understood).
  - Auto EXIF → trip date/place hints ("looks like this was taken in Antigua, add to Guatemala?").
- **Open decisions:** auth option (A/B/C), whether D1 or R2-JSON is the catalog, HEIC handling.

### 2. Trips experience

Make trips the emotional centerpiece, not just a photo grid.

- **Candidate ideas** (pick the ones that resonate):
  - **Per-trip pages** (`trips.morjan.family/guatemala-highlands-2024`) instead of one long list.
  - **Map view** — pins per trip, tap to open the gallery (static GeoJSON now; live later).
  - **Timeline / story mode** — scrollable narrative with photos + short captions.
  - **"Who was there"** — tag family members, cross-link to their personal sites.
  - **Cover picker & favorites** — choose the hero shot per trip.
- **Trade-offs:** per-trip pages + map are pure static wins (no backend). Tagging and
  favorites want the catalog/API from Pillar 1, so they naturally come *after* it.
- **Open decisions:** map provider (Leaflet + OSM free vs. hosted tiles), do we want
  public trips at all or family-only?

### 3. Hub / family constellation

The hub should *grow* and *reflect the family over time*, not stay a fixed picture.

- **Candidate ideas:**
  - **New members added gracefully** — the constellation reflows as the family grows.
  - **"Latest from the family"** — pull the newest trip photo or a person's update onto the hub.
  - **Seasonal / event skins** — birthdays, holidays (Arianna's birthday confetti on the hub).
  - **Deep-link states** — share a link that opens the hub already in night mode, etc.
  - **Subtle presence** — "3 new photos in Trips" style badges (needs the API).
- **Trade-offs:** most of this is static/config-driven and cheap. Live badges/"latest"
  need the API (Pillar 1) to have real data to read.
- **Open decisions:** how much motion is "too much" (respect `prefers-reduced-motion`),
  do we want the hub to ever show private content (then it needs auth)?

### 4. New product / subdomain (candidates — needs your pick)

I don't want to invent your intent here. These are grounded *candidates* only —
choose, combine, or replace with your own. Each would follow the subdomain-per-product rule.

| Candidate | Subdomain idea | One-line pitch | Backend? |
| --- | --- | --- | --- |
| Family recipes | `recipes.morjan.family` | Katy/Harald's recipes, searchable, print-friendly | Optional (static first) |
| Milestones / memory wall | `memories.morjan.family` | Timeline of firsts, quotes, kid milestones | Yes (catalog + auth) |
| Countdown / events | `events.morjan.family` | Next trip, birthdays, shared calendar view | Optional |
| Arianna's playground | `play.morjan.family` | Kid games / drawing that feed her main page | No (static/JS) |
| Private family notes | `notes.morjan.family` | Shared private notes / lists | Yes (auth + store) |
| Guestbook | on existing sites | Signed messages from visitors/relatives | Yes (API) |

- **Open decision:** which one (if any) excites you? That determines whether we need the
  shared API/auth foundation sooner.

### 5. Auth & private family areas (the shared foundation)

Almost every ambitious idea above needs "only the family can do/see this." Solve it **once**.

- **Options** (mirrors the trips plan, elevated to a shared decision):

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| **A. Cloudflare Access** | Email allowlist via Zero Trust | No custom login UI, fastest "family only", central | Requires Zero Trust setup; email-based |
| **B. Shared family PIN** | Worker session cookie | Simple UX, no per-person accounts | Must hash, rate-limit, rotate; one shared secret |
| **C. Magic link** | Email one-time link → session | Nice per-person UX | More moving parts, email deliverability |

- **Recommendation:** **A (Cloudflare Access)** as the family-only gate for private routes —
  it's the most professional long-term fit for the CF stack and needs no custom login code.
  Layer B/C only if we later want per-person identity inside the apps.
- **Once auth exists, it unlocks:** phone uploads, private trips, hub badges, notes,
  memory wall, delete/edit actions — all of it.
- **Open decision:** do we want *one* identity across every subdomain (single sign-on feel),
  or per-app gates? Access can do both.

---

## Shared platform (what most pillars quietly need)

Rather than build a backend per feature, plan **one small shared platform**:

```text
apps/*.morjan.family        static UIs (Pages)          ← what exists today
        │
        ▼  fetch (auth cookie/JWT)
api.morjan.family           one Cloudflare Worker        ← does not exist yet
        │
        ├── Auth (Cloudflare Access in front)
        ├── D1 (catalog: trips, photos, members, events…)
        ├── R2 morjan-trips (media web copies)
        └── Google Drive (originals backup)
```

- **`api.morjan.family`** — a single Worker is enough to start; split later only if needed.
- **D1** — one database, tables per domain (`trip_photos` already sketched in the trips plan).
- Keeps the "one subdomain = one product" rule while avoiding N different backends.

---

## Feature order (agreed priority)

This is the committed build order, set by mi mero macho. Horizon is "someday",
so this is *order*, not dates. Each feature graduates into its own detailed plan
doc when it's time to build it.

| # | Feature | Scope | Maps to pillar |
| --- | --- | --- | --- |
| 1 | **Trip photos cycle and flow** | **Defined** — safe-offload from phone via an iOS Shortcut → Drive original + R2 web copy → gallery; uploaded photos moved to a "safe to delete" album. See [`trips-phone-upload-plan.md`](trips-phone-upload-plan.md) | Pillar 1 (photo upload) |
| 2 | **Trips** | Trips experience (per-trip pages, map, story mode, tagging) | Pillar 2 |
| 3 | **Auth** | Family-only access — shared foundation | Pillar 5 |
| 4 | **New feature** | To be chosen later — mi mero macho will ask for suggestions when we reach it | Pillar 4 (candidate) |

### Notes on this order

- **#1 is now defined and locked** (2026-07): iOS Shortcut delivery, Google Drive original
  + R2 web copy, photos moved to a "Backed up — safe to delete" album (no auto-delete),
  and a shared-secret `X-Upload-Token` on the upload route. Full plan in
  [`trips-phone-upload-plan.md`](trips-phone-upload-plan.md).
- **Dependency resolved:** the upload route is mutating, so it needs protection — handled
  in v1 by the **shared-secret token** baked into the family Shortcut, without pulling the
  full **Auth (#3)** work forward. Cloudflare Access upgrades it later.
- **Hub "living" features** are intentionally **not** in this priority list — parked
  until after these four (still captured under Pillar 3 above).
- **Quick static wins** available anytime with zero backend: per-trip pages, map view
  (part of #2), and gallery cycling/transitions (part of #1 if display-only).

---

## Cost & privacy guardrails (apply to everything)

- Stay within **R2 free 10 GB** where possible; set a storage/spend alert before it matters.
- **Auth on every mutating route**; CORS locked to the owning subdomain.
- **Private by default** — no public listing of Drive; media links are the only public surface.
- Optional **EXIF GPS stripping** on upload if we don't want home coordinates leaking.
- Respect **`prefers-reduced-motion`** across hub/trip animations.

---

## Open decisions to answer before building (the real "grounding")

1. **Auth:** Cloudflare Access (A), family PIN (B), or magic link (C)?
2. **New product:** which candidate — or a different one entirely?
3. **Trips:** public-visible or family-only? Do we want a map view?
4. **Catalog:** D1 (recommended) vs. R2 JSON manifest?
5. **Scope of "someday":** is the *foundation* (API + auth) something worth doing early so
   the other pillars stop being blocked, or do we stay fully static until a concrete need?

Answer these and any pillar can graduate into its own build plan.

---

## Related docs

- [`trips-phone-upload-plan.md`](trips-phone-upload-plan.md) — detailed plan for Pillar 1.
- `README.md` — current app/domain map and R2 setup.
