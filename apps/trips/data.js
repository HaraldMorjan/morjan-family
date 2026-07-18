/**
 * Trip catalog for trips.morjan.family
 *
 * Photo hosting (wired):
 *   Bucket:  morjan-trips (Cloudflare R2)
 *   Public:  https://media.morjan.family/<trip-id>/<file>
 *   Setup:   bash scripts/setup-media-r2.sh
 *   Upload:  bash scripts/upload-trip-photos.sh <trip-id> <local-folder>
 *
 * Keep full-quality originals in Google Drive / external SSD.
 * This file only stores metadata + URLs (or tiny local placeholders).
 */
window.MORJAN_MEDIA_BASE = "https://media.morjan.family";

window.morjanMediaUrl = (tripId, fileName) =>
  `${window.MORJAN_MEDIA_BASE}/${tripId}/${fileName}`;

window.morjanTripPhotos = (tripId, fileNames) =>
  fileNames.map((fileName) => window.morjanMediaUrl(tripId, fileName));

window.MORJAN_TRIPS = [
  {
    id: "guatemala-highlands-2024",
    title: "Guatemala Highlands",
    place: "Antigua & Lake Atitlán, Guatemala",
    dates: "2024",
    blurb: "Volcano views, markets, and slow mornings by the lake.",
    cover: morjanMediaUrl(
      "guatemala-highlands-2024",
      "placeholder-highlands.svg"
    ),
    photos: morjanTripPhotos("guatemala-highlands-2024", [
      "placeholder-highlands.svg",
      "placeholder-beach.svg",
      "placeholder-city.svg"
    ]),
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
