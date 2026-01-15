#!/bin/bash

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

echo "Tag files renamed to index.ts"
