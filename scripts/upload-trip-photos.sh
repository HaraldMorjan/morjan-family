#!/usr/bin/env bash
# Upload a local folder of web-sized photos into R2 under a trip id.
#
# Usage:
#   bash scripts/upload-trip-photos.sh <trip-id> <local-folder>
#
# Example:
#   bash scripts/upload-trip-photos.sh guatemala-highlands-2024 ~/Pictures/guatemala-web
#
# Object keys: morjan-trips/<trip-id>/<filename>
# Public URL:  https://media.morjan.family/<trip-id>/<filename>
set -euo pipefail

BUCKET_NAME="morjan-trips"
MEDIA_BASE="https://media.morjan.family"
TRIP_ID="${1:-}"
SOURCE_DIR="${2:-}"

if [[ -z "${TRIP_ID}" || -z "${SOURCE_DIR}" ]]; then
  echo "Usage: bash scripts/upload-trip-photos.sh <trip-id> <local-folder>"
  exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Folder not found: ${SOURCE_DIR}"
  exit 1
fi

if [[ ! "${TRIP_ID}" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Trip id must be lowercase kebab-case (e.g. guatemala-highlands-2024)."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Checking Wrangler auth..."
if ! npx --yes wrangler whoami 2>&1 | grep -qiE "logged in|Account ID|email"; then
  echo "Not logged in. Run: npx wrangler login"
  exit 1
fi

uploaded_names=()
shopt -s nullglob
photo_files=("${SOURCE_DIR}"/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,gif,GIF,svg,SVG})

if [[ ${#photo_files[@]} -eq 0 ]]; then
  echo "No image files found in ${SOURCE_DIR}"
  exit 1
fi

# Stable sort by filename
IFS=$'\n' photo_files=($(printf '%s\n' "${photo_files[@]}" | sort))
unset IFS

echo "==> Uploading ${#photo_files[@]} file(s) to ${BUCKET_NAME}/${TRIP_ID}/"

for photo_path in "${photo_files[@]}"; do
  file_name="$(basename "${photo_path}")"
  object_key="${BUCKET_NAME}/${TRIP_ID}/${file_name}"
  echo "  → ${object_key}"
  npx --yes wrangler r2 object put "${object_key}" --file="${photo_path}" --remote
  uploaded_names+=("${file_name}")
done

echo
echo "Upload complete. Add this to apps/trips/data.js:"
echo
echo "  cover: \"${MEDIA_BASE}/${TRIP_ID}/${uploaded_names[0]}\","
echo "  photos: ["
for file_name in "${uploaded_names[@]}"; do
  echo "    \"${MEDIA_BASE}/${TRIP_ID}/${file_name}\","
done
echo "  ],"
echo
echo "Public check (after custom domain is active):"
echo "  ${MEDIA_BASE}/${TRIP_ID}/${uploaded_names[0]}"
