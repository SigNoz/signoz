#!/bin/bash
set -e

echo "Generating JavaScript parser..."
# Create output directory if it doesn't exist
mkdir -p frontend/src/parser

# Generate JavaScript parser
antlr -Dlanguage=JavaScript -o frontend/src/parser grammar/FilterQuery.g4

echo "JavaScript parser generation complete"