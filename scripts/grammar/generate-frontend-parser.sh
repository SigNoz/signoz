#!/bin/bash
set -e

echo "Generating TypeScript parser..."
# Create output directory if it doesn't exist
mkdir -p frontend/src/parser

# Generate TypeScript parser
(cd grammar && antlr4 -Dlanguage=TypeScript -o ../frontend/src/parser FilterQuery.g4 -visitor)

echo "TypeScript parser generation complete"
