-- Seed / sync trip catalog from apps/trips/data.js (metadata only).
-- Re-runnable: upserts titles/place/dates/blurb/cover; keeps existing created_at on conflict
-- unless the row was auto-created by the upload pipeline (title == id).
--
-- Does NOT seed placeholder photos into trip_photos — real photos come from POST uploads.
--
-- Apply:
--   npx wrangler d1 execute morjan-catalog --remote --file=./seeds/trips.sql
--   npx wrangler d1 execute morjan-catalog --local  --file=./seeds/trips.sql

INSERT INTO trips (id, title, place, dates, blurb, cover_url, created_at)
VALUES (
  'guatemala-highlands-2024',
  'Guatemala Highlands',
  'Antigua & Lake Atitlán, Guatemala',
  '2024',
  'Volcano views, markets, and slow mornings by the lake.',
  'https://media.morjan.family/guatemala-highlands-2024/placeholder-highlands.svg',
  '2024-12-01T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  place = excluded.place,
  dates = excluded.dates,
  blurb = excluded.blurb,
  cover_url = CASE
    WHEN trips.cover_url IS NULL
      OR trips.cover_url = ''
      OR trips.cover_url LIKE '%/placeholder-%'
      OR trips.cover_url LIKE 'img/placeholder-%'
    THEN excluded.cover_url
    ELSE trips.cover_url
  END;

INSERT INTO trips (id, title, place, dates, blurb, cover_url, created_at)
VALUES (
  'beach-escape-2023',
  'Pacific Escape',
  'Pacific coast',
  '2023',
  'Salt air, sunset walks, and sandy footprints everywhere.',
  'img/placeholder-beach.svg',
  '2023-06-01T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  place = excluded.place,
  dates = excluded.dates,
  blurb = excluded.blurb,
  cover_url = CASE
    WHEN trips.cover_url IS NULL
      OR trips.cover_url = ''
      OR trips.cover_url LIKE '%/placeholder-%'
      OR trips.cover_url LIKE 'img/placeholder-%'
    THEN excluded.cover_url
    ELSE trips.cover_url
  END;

INSERT INTO trips (id, title, place, dates, blurb, cover_url, created_at)
VALUES (
  'city-weekend',
  'City Weekend',
  'To be filled in',
  'Soon',
  'Replace this card with your next real trip — photo, place, and notes.',
  'img/placeholder-city.svg',
  '2022-01-01T00:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  place = excluded.place,
  dates = excluded.dates,
  blurb = excluded.blurb,
  cover_url = CASE
    WHEN trips.cover_url IS NULL
      OR trips.cover_url = ''
      OR trips.cover_url LIKE '%/placeholder-%'
      OR trips.cover_url LIKE 'img/placeholder-%'
    THEN excluded.cover_url
    ELSE trips.cover_url
  END;
