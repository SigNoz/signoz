#!/usr/bin/env bash
# Throwaway load-test harness for the dashboard-list filter query.
#
# Starts a Postgres container, then seeds ORGS × DASHBOARDS_PER_ORG v6 dashboards
# (content based on pkg/types/dashboardtypes/testdata/perses.json) and runs a few
# EXPLAIN ANALYZE samples of the list query.
#
#   ./loadtest.sh                       # 1000 orgs × 500 dashboards (default)
#   ORGS=50 DASHBOARDS_PER_ORG=100 ./loadtest.sh   # smaller, quick run
#   ./loadtest.sh down                  # stop & remove the container
#
# NOTE: the default scale writes ~17 GB of dashboard.data (500k × ~35 KB). Start
# small to sanity-check, then scale up.
set -euo pipefail

CONTAINER=signoz-loadtest-pg
# 5499 by default so it doesn't collide with a dev SigNoz postgres on 5432.
PG_PORT="${PG_PORT:-5499}"
PG_IMAGE="${PG_IMAGE:-postgres:16}"
export PG_DSN="${PG_DSN:-postgres://signoz:signoz@localhost:${PG_PORT}/signoz?sslmode=disable}"

cd "$(dirname "$0")"

if [[ "${1:-}" == "down" ]]; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  echo "removed $CONTAINER"
  exit 0
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "starting postgres ($PG_IMAGE) as $CONTAINER on :$PG_PORT ..."
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_USER=signoz -e POSTGRES_PASSWORD=signoz -e POSTGRES_DB=signoz \
    -p "${PG_PORT}:5432" \
    "$PG_IMAGE" \
    -c shared_buffers=512MB -c work_mem=64MB >/dev/null
else
  docker start "$CONTAINER" >/dev/null || true
  echo "reusing existing $CONTAINER"
fi

echo -n "waiting for postgres"
until docker exec "$CONTAINER" pg_isready -U signoz -d signoz >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " ready"

go run ./loadtest
