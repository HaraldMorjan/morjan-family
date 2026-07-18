#!/usr/bin/env bash
# Create the R2 bucket and attach media.morjan.family
set -euo pipefail

BUCKET_NAME="morjan-trips"
MEDIA_DOMAIN="media.morjan.family"
ZONE_NAME="morjan.family"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

echo "==> Checking Wrangler auth..."
if ! npx --yes wrangler whoami 2>&1 | grep -qiE "logged in|Account ID|email"; then
  echo "Not logged in. Opening browser login..."
  npx --yes wrangler login
fi

echo "==> Creating R2 bucket (ok if it already exists): ${BUCKET_NAME}"
npx --yes wrangler r2 bucket create "${BUCKET_NAME}" || true

ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
if [[ -z "${ZONE_ID}" ]]; then
  echo "==> Looking up zone id for ${ZONE_NAME}..."
  ZONE_ID="$(node scripts/get-zone-id.mjs "${ZONE_NAME}")"
fi

echo "==> Attaching custom domain ${MEDIA_DOMAIN} (zone ${ZONE_ID})..."
npx --yes wrangler r2 bucket domain add "${BUCKET_NAME}" \
  --domain "${MEDIA_DOMAIN}" \
  --zone-id "${ZONE_ID}" \
  --force

echo
echo "Done."
echo "  Bucket:  ${BUCKET_NAME}"
echo "  Public:  https://${MEDIA_DOMAIN}/<trip-id>/<file>"
echo
echo "Upload a trip folder next:"
echo "  bash scripts/upload-trip-photos.sh guatemala-highlands-2024 ./path/to/photos"
