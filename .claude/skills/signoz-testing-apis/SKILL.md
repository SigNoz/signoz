---
name: signoz-testing-apis
description: Test any SigNoz HTTP API (query_range, dashboards, alerts, fields, etc.) against a local server or a preview deployment. Use when a task requires calling SigNoz APIs to verify API or query builder changes, reproduce behavior, or inspect responses.
---

# Testing SigNoz APIs

## 1. Endpoint and authentication

- Base URL comes from the `SIGNOZ_ENDPOINT` env var. It may point to a preview deployment; use `http://localhost:8080` when unset.
- Auth comes from the `SIGNOZ_API_KEY` env var, sent as the `SIGNOZ-API-KEY` header.
- If `SIGNOZ_API_KEY` is not set:
  - If the server runs against a local SQLite DB, create a key directly in the database and set it in the current shell (inserts service account + key + role + authorization tuple; the server must have been started once so the schema exists):
    `source .claude/skills/signoz-testing-apis/scripts/create-api-key.sh /path/to/signoz.db`
    If authorization fails right after, wait a few seconds and retry (checks are cached briefly).
  - Otherwise (remote/preview deployment) STOP and ask the user to provide a key. NEVER try login, register, invite, user/org creation, or token minting flows.

## 2. Calling an API

- Build the call with the helper script (reads the env vars above, prints the curl it runs):

  ```bash
  .claude/skills/signoz-testing-apis/scripts/api-call.sh GET /api/v1/version
  .claude/skills/signoz-testing-apis/scripts/api-call.sh POST /api/v5/query_range payload.json
  ```

- If you need the payload schema of an unfamiliar endpoint, look it up in the checked-in OpenAPI spec at `docs/api/openapi.yml`.

## 3. Testing query builder changes

Prefer the dry-run preview endpoint — it accepts the same payload as `/api/v5/query_range` but does not execute the queries:

```bash
.claude/skills/signoz-testing-apis/scripts/api-call.sh POST '/api/v5/query_range/preview' payload.json
```

- Per query it returns `valid`, `error`, `warnings`, and the **rendered ClickHouse statement(s)** at `compositeQuery.<name>.statements[].db.statement.query` — exactly what you need to verify query builder changes without any data in ClickHouse.
- Default `verbose=true` also attaches EXPLAIN ESTIMATE and granule index analysis per statement. Use `?verbose=false` for a lightweight valid/error verdict with no ClickHouse round trips.
- Per-query errors are reported inside the response instead of failing the whole request — check each query's `valid`/`error` fields.

## 4. Query range payload

Start from [references/query-range-payload.json](references/query-range-payload.json): a full builder-query template (aggregations, filter, groupBy, selectFields, order, having, limit, legend). Adjust `start`/`end` to the current time range in epoch milliseconds and drop fields you don't need. `selectFields` only matters for `raw`/`scalar` request types; it is ignored for `time_series`.

## 5. Running a local server (only when no endpoint is available)

Skip this section entirely if `SIGNOZ_ENDPOINT` already points at a reachable deployment.

1. **ClickHouse**: the Makefile expects ClickHouse at `tcp://127.0.0.1:9000`. Reuse an already-running instance (e.g. from an existing SigNoz docker deployment) — check with `nc -z 127.0.0.1 9000`. Only start one if none is reachable (see `tests/fixtures/clickhouse.py` for how this repo runs one).
2. **Start the server** from the repo root, in the background:

   ```bash
   make go-run-community &
   ```

   This uses `./signoz.db` (fresh if absent) and disables the web assets. To reuse an existing SQLite DB (keeping orgs, users, and API keys): `make go-run-community SIGNOZ_SQLSTORE_SQLITE_PATH=/path/to/signoz.db`. Wait until the server listens on `:8080`; stop it later with `make go-stop`.
