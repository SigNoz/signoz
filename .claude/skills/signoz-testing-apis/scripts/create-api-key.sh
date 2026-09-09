#!/usr/bin/env bash
# Create a SigNoz API key in a local SQLite database (logic: create-api-key.py).
#
# A child process cannot modify its parent shell's environment, so to get
# SIGNOZ_API_KEY into the current shell, SOURCE this script:
#   source create-api-key.sh /path/to/signoz.db
# Executed normally, it only prints the token:
#   create-api-key.sh /path/to/signoz.db

_sourced=0
if [[ -n "${BASH_SOURCE:-}" && "${BASH_SOURCE[0]}" != "$0" ]]; then
  _sourced=1
fi

key="$(python3 "$(dirname "${BASH_SOURCE[0]:-$0}")/create-api-key.py" "$@")"
rc=$?

if [[ $rc -ne 0 || -z "$key" ]]; then
  [[ $rc -eq 0 ]] && rc=1
  if [[ $_sourced -eq 1 ]]; then return "$rc"; else exit "$rc"; fi
fi

export SIGNOZ_API_KEY="$key"
echo "$key"

if [[ $_sourced -eq 0 ]]; then
  echo "note: SIGNOZ_API_KEY was not persisted (a process can't modify its parent's environment)." >&2
  echo "run 'source ${BASH_SOURCE[0]:-$0} $*' to set it in the current shell." >&2
fi
