#!/usr/bin/env bash
set -euo pipefail

story_count=$(find src -name '*.stories.tsx' | wc -l)
if [ "$story_count" -eq 0 ]; then
	echo "No *.stories.tsx found under src/" >&2
	exit 1
fi

# jest splits the sorted story files into contiguous shards and exits 1 when a
# shard is empty, which happens on every shard above the file count. The runner
# rejects jest's own `--passWithNoTests`, so skip those shards here.
for arg in "$@"; do
	if [[ $arg == --shard=* ]]; then
		shard_index=${arg#--shard=}
		if [ "${shard_index%%/*}" -gt "$story_count" ]; then
			echo "Skipping ${arg#--shard=}: only ${story_count} story files"
			exit 0
		fi
	fi
done

pnpm storybook --ci --quiet &
SB_PID=$!
trap 'kill "$SB_PID" 2>/dev/null || true' EXIT

until curl -sf http://127.0.0.1:6006/index.json >/dev/null 2>&1; do
	sleep 1
done

pnpm exec test-storybook --ci --maxWorkers=2 "$@"
