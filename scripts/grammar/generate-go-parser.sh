#!/bin/bash
set -e

echo "Generating Go parser..."
# Create output directory if it doesn't exist
mkdir -p pkg/parser

# Generate Go parser
antlr -visitor -Dlanguage=Go -o pkg/parser grammar/FilterQuery.g4

echo "Go parser generation complete"
