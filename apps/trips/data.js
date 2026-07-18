/**
 * Trip catalog for trips.morjan.family
 *
 * Storage recommendation (so photos don’t get lost):
 * 1. ORIGINALS (backup) — Google Drive / external SSD. Never only on the website.
 * 2. WEB copies — Cloudflare R2 bucket, folders per trip id, e.g.
 *    guatemala-highlands-2024/01.jpg … 50.jpg
 *    Public URL example: https://media.morjan.family/guatemala-highlands-2024/01.jpg
 * 3. THIS FILE — only metadata + URLs (or short local paths for tiny placeholders).
 *
 * Do not commit dozens of large JPEGs into Git. Use R2 (or similar) for galleries.
 *
 * Each trip:
 *   cover  — card image (optional; falls back to photos[0])
 *   photos — gallery list (R2 URLs or local "img/..." paths)
 */
window.MORJAN_TRIPS = [
  {
    id: "guatemala-highlands-2024",
    title: "Guatemala Highlands",
    place: "Antigua & Lake Atitlán, Guatemala",
    dates: "2024",
    blurb: "Volcano views, markets, and slow mornings by the lake.",
    cover: "img/placeholder-highlands.svg",
    photos: [
      "img/placeholder-highlands.svg",
      "img/placeholder-beach.svg",
      "img/placeholder-city.svg"
    ],
    tags: ["family", "nature"]
  },
  {
    id: "beach-escape-2023",
    title: "Pacific Escape",
    place: "Pacific coast",
    dates: "2023",
    blurb: "Salt air, sunset walks, and sandy footprints everywhere.",
    cover: "img/placeholder-beach.svg",
    photos: ["img/placeholder-beach.svg"],
    tags: ["beach", "relax"]
  },
  {
    id: "city-weekend",
    title: "City Weekend",
    place: "To be filled in",
    dates: "Soon",
    blurb: "Replace this card with your next real trip — photo, place, and notes.",
    cover: "img/placeholder-city.svg",
    photos: ["img/placeholder-city.svg"],
    tags: ["placeholder"]
  }
];
