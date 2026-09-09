#!/usr/bin/env bash
# Build and run a curl call against a SigNoz deployment (local or preview).
#
# Usage:
#   api-call.sh <METHOD> <PATH> [payload.json]
#
# Environment:
#   SIGNOZ_ENDPOINT  Base URL of the deployment (default: http://localhost:8080)
#   SIGNOZ_API_KEY   API key sent as the SIGNOZ-API-KEY header (required)
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: $0 <METHOD> <PATH> [payload.json]" >&2
  exit 2
fi

if [[ -z "${SIGNOZ_API_KEY:-}" ]]; then
  echo "SIGNOZ_API_KEY is not set. Ask the user for an API key; do not attempt to authenticate yourself." >&2
  exit 1
fi

METHOD="$1"
API_PATH="$2"
PAYLOAD_FILE="${3:-}"
ENDPOINT="${SIGNOZ_ENDPOINT:-http://localhost:8080}"

cmd=(curl -sS -X "$METHOD"
  -H "SIGNOZ-API-KEY: $SIGNOZ_API_KEY"
  -H "Content-Type: application/json")

if [[ -n "$PAYLOAD_FILE" ]]; then
  cmd+=(--data @"$PAYLOAD_FILE")
fi

cmd+=("$ENDPOINT$API_PATH")

printf '%q ' "${cmd[@]}" >&2; echo >&2
"${cmd[@]}"
echo
