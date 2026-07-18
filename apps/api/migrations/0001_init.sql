-- Catalog for trip photos (feature #1 Phase 1)
-- Source of truth once the API is live; data.js stays as seed/fallback during transition.

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  place TEXT,
  dates TEXT,
  blurb TEXT,
  cover_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_photos (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_url TEXT NOT NULL,
  drive_file_id TEXT,
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  created_at TEXT NOT NULL,
  created_by TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id
  ON trip_photos (trip_id, created_at);
