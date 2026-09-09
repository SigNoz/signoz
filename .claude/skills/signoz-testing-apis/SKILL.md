---
name: signoz-testing-apis
description: Test any SigNoz HTTP API (query_range, dashboards, alerts, fields, etc.) against a local server or a preview deployment. Use when a task requires calling SigNoz APIs to verify API or query builder changes, reproduce behavior, or inspect responses.
---

# Testing SigNoz APIs

## 1. Endpoint and authentication

- Base URL comes from the `SIGNOZ_ENDPOINT` env var. It may point to a preview deployment; use `http://localhost:8080` when unset.
- Auth comes from the `SIGNOZ_API_KEY` env var, sent as the `SIGNOZ-API-KEY` header.
- If `SIGNOZ_API_KEY` is not set, STOP and ask the user to provide it. NEVER try to authenticate yourself: no login, register, invite, user/org creation, or token minting flows.

## 2. Calling an API

- Find the method, path, and payload schema for any endpoint by following [references/finding-endpoints.md](references/finding-endpoints.md). Short version: the checked-in OpenAPI spec at `docs/api/openapi.yml`.
- Build the call with the helper script (reads the env vars above, prints the curl it runs):

  ```bash
  .claude/skills/signoz-testing-apis/scripts/api-call.sh GET /api/v1/version
  .claude/skills/signoz-testing-apis/scripts/api-call.sh POST /api/v5/query_range payload.json
  ```

- For `/api/v5/query_range`, start from the minimal working payload [references/query-range-payload.json](references/query-range-payload.json) and adjust `start`/`end` to the current time range in epoch milliseconds.

## 3. Running a local server (only when no endpoint is available)

Skip this section entirely if `SIGNOZ_ENDPOINT` already points at a reachable deployment.

1. **ClickHouse**: the server expects ClickHouse at `tcp://localhost:9000` by default. Reuse an already-running instance (e.g. from an existing SigNoz docker deployment) — check with `nc -z localhost 9000`. Only start one if none is reachable (see `tests/fixtures/clickhouse.py` for how this repo runs one). If it is not on `localhost:9000`, set `SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN`.
2. **SQLite**: reuse an existing `signoz.db` if one is available, so orgs, users, and API keys persist. Point the server at it with `SIGNOZ_SQLSTORE_SQLITE_PATH=/path/to/signoz.db`; otherwise set it to a fresh local path.
3. **Start the server** from the repo root:

   ```bash
   SIGNOZ_SQLSTORE_SQLITE_PATH=./signoz.db go run ./cmd/community server
   ```

   Wait until it listens on `:8080`. If startup fails over missing web assets, add `SIGNOZ_WEB_ENABLED=false`.
