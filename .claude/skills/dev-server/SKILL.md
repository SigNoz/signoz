---
description: How to start SigNoz frontend and backend dev servers
---

# Dev Server Setup

Full guide: [development.md](../../docs/contributing/development.md)

## Start Order

1. **Infra**: Ensure clickhouse container is running using `docker ps | grep clickhouse` 
2. **Backend**: `make go-run-community` (serves at `localhost:8080`)
3. **Frontend**: `cd frontend && yarn install && yarn dev` (serves at `localhost:3301`)
   - Requires `frontend/.env` with `FRONTEND_API_ENDPOINT=http://localhost:8080`
   - For git worktrees, frontend/.env can be created using command: `cp frontend/example.env frontend/.env`.

## Verify

- ClickHouse: `curl http://localhost:8123/ping` → "Ok."
- OTel Collector: `curl http://localhost:13133`
- Backend: `curl http://localhost:8080/api/v1/health` → `{"status":"ok"}`
- Frontend: `http://localhost:3301`
