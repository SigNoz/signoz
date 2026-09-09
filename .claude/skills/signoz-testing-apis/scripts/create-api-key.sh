#!/usr/bin/env bash
# Thin wrapper around create-api-key.py (kept separate for readability).
# Prints an export statement; use it to set the env var in the current shell:
#   eval "$(create-api-key.sh /path/to/signoz.db)"
set -euo pipefail

exec python3 "${BASH_SOURCE[0]%/*}/create-api-key.py" "$@"
