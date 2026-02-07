#!/usr/bin/env bash
# Extracts unique fenced code block language identifiers from all .md files under frontend/src/
# Usage: bash frontend/scripts/extract-md-languages.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"

grep -roh '```[a-zA-Z0-9_+-]*' "$SRC_DIR" --include='*.md' \
  | sed 's/^```//' \
  | grep -v '^$' \
  | sort -u
