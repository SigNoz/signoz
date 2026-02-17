---
description: Architecture context for the traces module (trace detail, waterfall, flamegraph)
---

# Traces Module

Read [trace-detail-architecture.md](./trace-detail-architecture.md) for full context before working on this module. It covers:

- ClickHouse tables (`signoz_index_v3`, `trace_summary`) and their gotchas
- Backend API endpoints (waterfall + flamegraph) and processing pipelines
- Frontend component map, state flow, and API hooks
- Key file index for both backend and frontend
