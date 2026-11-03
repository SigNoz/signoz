#!/usr/bin/env bash
set -euo pipefail

echo "e2e-signoz-$(git rev-parse HEAD:cmd HEAD:ee HEAD:pkg HEAD:go.mod HEAD:go.sum HEAD:.dockerignore HEAD:.github/workflows/cacheci.yml | sha256sum | cut -c1-32)"
