#!/bin/bash
set -e

echo "Generating Go parser..."
# Create output directory if it doesn't exist
mkdir -p pkg/parser

# Generate Go parser
antlr -visitor -Dlanguage=Go -o pkg/parser/filterquery grammar/FilterQuery.g4
antlr -visitor -Dlanguage=Go -o pkg/parser/havingexpression grammar/HavingExpression.g4

echo "Go parser generation complete"
