#!/usr/bin/env bash
set -euo pipefail

pnpm storybook --ci --quiet &
SB_PID=$!
trap 'kill "$SB_PID" 2>/dev/null || true' EXIT

until curl -sf http://127.0.0.1:6006/index.json >/dev/null 2>&1; do
	sleep 1
done

pnpm exec test-storybook --ci --maxWorkers=2 "$@"
