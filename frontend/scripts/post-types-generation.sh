#!/bin/bash

echo "\n\n---\nRenamed tag files to index.ts...\n"
# Rename tag files to index.ts in services directories
# tags-split creates: services/tagName/tagName.ts -> rename to services/tagName/index.ts
find src/api/generated/services -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
  dirname=$(basename "$dir")
  tagfile="$dir/$dirname.ts"
  if [ -f "$tagfile" ]; then
    mv "$tagfile" "$dir/index.ts"
    echo "Renamed $tagfile -> $dir/index.ts"
  fi
done

echo "\n✅ Tag files renamed to index.ts"

# Format generated files
echo "\n\n---\nRunning prettier...\n"
if ! prettier --write src/api/generated; then
  echo "Prettier formatting failed!"
  exit 1
fi
echo "\n✅ Prettier formatting successful"


# Fix linting issues
echo "\n\n---\nRunning eslint...\n"
if ! yarn lint --fix --quiet src/api/generated; then
  echo "ESLint check failed! Please fix linting errors before proceeding."
  exit 1
fi
echo "\n✅ ESLint check successful"


# Check for type errors
echo "\n\n---\nChecking for type errors...\n"
if ! tsc --noEmit; then
  echo "Type check failed! Please fix type errors before proceeding."
  exit 1
fi
echo "\n✅ Type check successful"


echo "\n\n---\n ✅✅✅ API generation complete!"
