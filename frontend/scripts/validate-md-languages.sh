#!/usr/bin/env bash
# Validates that all fenced code block languages used in .md files are registered
# in the syntax highlighter.
# Usage: bash frontend/scripts/validate-md-languages.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNTAX_HIGHLIGHTER="$SCRIPT_DIR/../src/components/MarkdownRenderer/syntaxHighlighter.ts"

# Get all languages used in .md files
md_languages=$("$SCRIPT_DIR/extract-md-languages.sh")

# Get all registered languages from syntaxHighlighter.ts
registered_languages=$(grep -oP "registerLanguage\('\K[^']+" "$SYNTAX_HIGHLIGHTER" | sort -u)

missing_languages=()

for lang in $md_languages; do
  if ! echo "$registered_languages" | grep -qx "$lang"; then
    missing_languages+=("$lang")
  fi
done

if [ ${#missing_languages[@]} -gt 0 ]; then
  echo "Error: The following languages are used in .md files but not registered in syntaxHighlighter.ts:"
  for lang in "${missing_languages[@]}"; do
    echo "  - $lang"
  done
  echo ""
  echo "Please add them to: frontend/src/components/MarkdownRenderer/syntaxHighlighter.ts"
  exit 1
fi

echo "All markdown code block languages are registered in syntaxHighlighter.ts"
