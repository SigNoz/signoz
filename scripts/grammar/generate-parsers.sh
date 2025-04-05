#!/bin/bash
set -e

# Run both parser generators
./scripts/generate-go-parser.sh
./scripts/generate-js-parser.sh

echo "All parsers generated successfully"