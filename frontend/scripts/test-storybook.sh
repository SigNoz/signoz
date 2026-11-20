#!/usr/bin/env bash
# Tests the static Storybook build. Arguments go to test-storybook: runner flags
# and, optionally, the story files to test (all of them when none are given).
# STORYBOOK_STATIC_DIR points at an existing build; without it the script builds
# one into storybook-static/.
set -euo pipefail

port=6006
static_dir=${STORYBOOK_STATIC_DIR:-}
if [ -z "$static_dir" ]; then
	static_dir=storybook-static
	pnpm storybook:build --quiet
fi
if [ ! -f "$static_dir/index.json" ]; then
	echo "No Storybook build in $static_dir/" >&2
	exit 1
fi

if curl -s -o /dev/null "http://127.0.0.1:$port/"; then
	echo "Port $port is taken; stop whatever serves it first." >&2
	exit 1
fi

node_modules/.bin/vite preview --outDir "$static_dir" --host 127.0.0.1 --port "$port" --strictPort >/dev/null &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

until curl -sf "http://127.0.0.1:$port/index.json" >/dev/null 2>&1; do
	kill -0 "$SERVER_PID" 2>/dev/null || {
		echo "Static server exited" >&2
		exit 1
	}
	sleep 1
done

# Index-json mode names its tests after story titles, so story file arguments
# would match nothing.
pnpm exec test-storybook --ci --no-index-json --url "http://127.0.0.1:$port" --maxWorkers=2 --testTimeout 30000 "$@"
