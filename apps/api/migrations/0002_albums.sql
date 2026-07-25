-- Album level between trip and photo (Drive trips/<trip>/<album>/).
-- Existing photos keep album_id NULL; nothing is moved in Drive or R2.

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  drive_folder_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (trip_id, slug),
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);

ALTER TABLE trip_photos ADD COLUMN album_id TEXT;

CREATE INDEX IF NOT EXISTS idx_trip_photos_album
  ON trip_photos (album_id, created_at);

ALTER TABLE trips ADD COLUMN drive_folder_id TEXT;
