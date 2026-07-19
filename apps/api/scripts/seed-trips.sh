#!/usr/bin/env bash
# Seed / sync trips into D1 from seeds/trips.sql (mirrors apps/trips/data.js metadata).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SEED_FILE="${API_DIR}/seeds/trips.sql"

TARGET="${1:---remote}"

if [[ "${TARGET}" != "--remote" && "${TARGET}" != "--local" ]]; then
  echo "Usage: bash scripts/seed-trips.sh [--remote|--local]"
  exit 1
fi

if [[ ! -f "${SEED_FILE}" ]]; then
  echo "Missing seed file: ${SEED_FILE}"
  exit 1
fi

cd "${API_DIR}"
echo "Applying ${SEED_FILE} (${TARGET})..."
npx wrangler d1 execute morjan-catalog "${TARGET}" --file="${SEED_FILE}"
echo "Done. Verify: curl https://api.morjan.family/trips"
