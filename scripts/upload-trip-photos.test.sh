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

WRANGLER_CALL_LOG="${TEMP_DIR}/wrangler.log" \
  PATH="${TEMP_DIR}/bin:${PATH}" \
  bash "${ROOT_DIR}/scripts/upload-trip-photos.sh" \
    test-trip \
    "${TEMP_DIR}/photos" > /dev/null

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

echo "upload-trip-photos MIME metadata test passed"
