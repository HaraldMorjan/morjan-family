#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

mkdir -p "${TEMP_DIR}/bin" "${TEMP_DIR}/photos"
touch \
  "${TEMP_DIR}/photos/photo.jpg" \
  "${TEMP_DIR}/photos/photo.png" \
  "${TEMP_DIR}/photos/photo.webp" \
  "${TEMP_DIR}/photos/photo.gif" \
  "${TEMP_DIR}/photos/photo.svg"

cat > "${TEMP_DIR}/bin/npx" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "$*" == *"wrangler whoami"* ]]; then
  echo "Logged in"
  exit 0
fi

printf '<call>\n' >> "${WRANGLER_CALL_LOG}"
printf '%s\n' "$@" >> "${WRANGLER_CALL_LOG}"
EOF
chmod +x "${TEMP_DIR}/bin/npx"

for album_id in first-album second-album; do
  WRANGLER_CALL_LOG="${TEMP_DIR}/wrangler.log" \
    PATH="${TEMP_DIR}/bin:${PATH}" \
    bash "${ROOT_DIR}/scripts/upload-trip-photos.sh" \
      test-trip \
      "${album_id}" \
      "${TEMP_DIR}/photos" >> "${TEMP_DIR}/output.log"
done

for album_id in first-album second-album; do
  expected_key="morjan-trips/test-trip/${album_id}/photo.jpg"
  if ! grep -Fxq -- "${expected_key}" "${TEMP_DIR}/wrangler.log"; then
    echo "Missing album-scoped R2 key: ${expected_key}" >&2
    exit 1
  fi

  expected_url="https://media.morjan.family/test-trip/${album_id}/photo.jpg"
  if ! grep -Fq -- "${expected_url}" "${TEMP_DIR}/output.log"; then
    echo "Missing album-scoped public URL: ${expected_url}" >&2
    exit 1
  fi
done

if grep -Fxq -- "morjan-trips/test-trip/photo.jpg" "${TEMP_DIR}/wrangler.log"; then
  echo "Found legacy unscoped R2 key" >&2
  exit 1
fi

for expected_type in \
  image/jpeg \
  image/png \
  image/webp \
  image/gif \
  image/svg+xml
do
  if ! grep -Fxq -- "--content-type=${expected_type}" "${TEMP_DIR}/wrangler.log"; then
    echo "Missing Wrangler content type: ${expected_type}" >&2
    exit 1
  fi
done

echo "upload-trip-photos album scoping and MIME metadata tests passed"
