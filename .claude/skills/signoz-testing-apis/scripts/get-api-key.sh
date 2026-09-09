#!/usr/bin/env bash
# Extract an existing SigNoz API key from a SQLite database.
# API keys are stored in plaintext in factor_api_key.key, so a key from a
# reused database can be read directly.
#
# Usage:
#   get-api-key.sh <path-to-signoz.db>
#   export SIGNOZ_API_KEY=$(get-api-key.sh ./signoz.db)
#
# Exit 1 with a message if no usable key exists (e.g. a fresh database) —
# in that case ask the user for a key instead of fabricating one.
set -euo pipefail

DB="${1:-}"
if [[ -z "$DB" || ! -f "$DB" ]]; then
  echo "usage: $0 <path-to-signoz.db>" >&2
  exit 2
fi

NOW="$(date +%s)"
SQL="SELECT fak.key FROM factor_api_key fak
JOIN service_account sa ON sa.id = fak.service_account_id
WHERE sa.status = 'active'
  AND (fak.expires_at = 0 OR fak.expires_at > $NOW)
ORDER BY fak.created_at DESC
LIMIT 1;"

if command -v sqlite3 >/dev/null 2>&1; then
  key="$(sqlite3 "$DB" "$SQL")"
elif command -v python3 >/dev/null 2>&1; then
  key="$(python3 -c "
import sqlite3, sys
row = sqlite3.connect(sys.argv[1]).execute(sys.argv[2]).fetchone()
print(row[0] if row else '')
" "$DB" "$SQL")"
else
  echo "neither sqlite3 nor python3 is available to read $DB" >&2
  exit 1
fi

if [[ -z "$key" ]]; then
  echo "no active, unexpired API key found in $DB." >&2
  echo "On a fresh database no key exists yet: ask the user to provide SIGNOZ_API_KEY; do not fabricate one." >&2
  exit 1
fi

echo "$key"
