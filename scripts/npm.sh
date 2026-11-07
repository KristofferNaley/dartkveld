#!/bin/sh
# Node finnes ikke på verten: kjør npm i en node:22-alpine-container med prosjektet montert.
# Eksempel: ./scripts/npm.sh install   |   ./scripts/npm.sh run check
cd "$(dirname "$0")/.." && exec docker run --rm -t -v "$PWD":/app -w /app --network host \
  -e NEXT_TELEMETRY_DISABLED=1 node:22-alpine npm "$@"
