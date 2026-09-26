#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/backups/vibecodingdiscover-$STAMP.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "$ROOT/.env" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$ROOT/.env" | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

pg_dump "$DATABASE_URL" > "$OUT"
echo "Wrote $OUT"
