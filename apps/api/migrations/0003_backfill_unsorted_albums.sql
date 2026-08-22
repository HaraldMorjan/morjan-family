-- Preserve pre-album photos in album-scoped catalog reads.
-- Drive and R2 objects stay in their existing locations; only D1 ownership changes.

INSERT OR IGNORE INTO albums (
  id,
  trip_id,
  slug,
  name,
  drive_folder_id,
  created_at
)
SELECT
  lower(hex(randomblob(16))),
  trip_id,
  'unsorted',
  'Unsorted',
  NULL,
  MIN(created_at)
FROM trip_photos
WHERE album_id IS NULL
GROUP BY trip_id;

UPDATE trip_photos
SET album_id = (
  SELECT albums.id
  FROM albums
  WHERE albums.trip_id = trip_photos.trip_id
    AND albums.slug = 'unsorted'
)
WHERE album_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM albums
    WHERE albums.trip_id = trip_photos.trip_id
      AND albums.slug = 'unsorted'
  );
