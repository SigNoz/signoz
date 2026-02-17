---
description: Architecture context for the traces module (query building, waterfall, flamegraph)
---

# Traces Module

Read [traces-module.md](./traces-module.md) for full context before working on this module. It covers:

- Storage schema (`signoz_index_v3`, `trace_summary`) and gotchas
- API endpoints (Query Range V5, waterfall, flamegraph, funnels)
- Query building system (statement builder, field mapper, trace operators)
- Backend processing pipelines and caching
- Frontend component map, state flow, and API hooks
- Key file index for backend and frontend
