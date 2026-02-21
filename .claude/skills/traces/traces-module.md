# SigNoz Traces Module — Developer Guide

## Overview

```
App → OTel SDK → OTLP Receiver → [signozspanmetrics, batch] →
  ClickHouse Exporter → signoz_traces DB → Query Service (Go) → Frontend (React)
```

**Query Service layers**: HTTP Handlers (`http_handler.go`) → Querier (`querier.go`, orchestration/cache) → Statement Builders (`pkg/telemetrytraces/`) → ClickHouse

---

## Storage Schema

All tables in `signoz_traces` database. Schema DDL: `signoz-otel-collector/cmd/signozschemamigrator/schema_migrator/traces_migrations.go`.

### `distributed_signoz_index_v3` — Primary span storage

- **Engine**: MergeTree (plain — **no deduplication**, use `DISTINCT ON (span_id)`)
- **Key columns**: `ts_bucket_start` (UInt64), `timestamp` (DateTime64(9)), `trace_id` (FixedString(32)), `span_id`, `duration_nano`, `has_error`, `name`, `resource_string_service$$name`, `attributes_string`, `events`, `links`
- **ORDER BY**: `(ts_bucket_start, resource_fingerprint, has_error, name, timestamp)`
- **Partition**: `toDate(timestamp)`

### `distributed_trace_summary` — Pre-aggregated trace metadata

- **Engine**: AggregatingMergeTree. Columns: `trace_id`, `start` (min), `end` (max), `num_spans` (sum)
- **Populated by** `trace_summary_mv` — materialized view on `signoz_index_v3` that triggers per-batch, inserting partial aggregates. ClickHouse merges them asynchronously.
- **CRITICAL**: Always query with `GROUP BY trace_id` (never raw `SELECT *`)

### Other tables

`distributed_tag_attributes_v2` (attribute keys for autocomplete), `distributed_span_attributes_keys` (which attributes exist)

---

## API Endpoints

### 1. Query Range V5 — `POST /api/v5/query_range`

Primary query endpoint for traces (also logs/metrics). Supports query builder queries, trace operators, aggregations, filters, group by. See [QUERY_RANGE_API.md](../../docs/modules/QUERY_RANGE_API.md).

Key files: `pkg/telemetrytraces/statement_builder.go`, `trace_operator_statement_builder.go`, `pkg/querier/trace_operator_query.go`

### 2. Waterfall — `POST /api/v2/traces/waterfall/{traceId}`

Handler: `http_handler.go:1748` → Reader: `clickhouseReader/reader.go:873`

**Request**: `{ "selectedSpanId", "isSelectedSpanIDUnCollapsed", "uncollapsedSpans[]" }`
**Response**: `{ startTimestampMillis, endTimestampMillis, totalSpansCount, totalErrorSpansCount, rootServiceName, rootServiceEntryPoint, serviceNameToTotalDurationMap, spans[], hasMissingSpans, uncollapsedSpans[] }`

**Pipeline**:
1. Query `trace_summary` for time range → query `signoz_index_v3` with `DISTINCT ON (span_id)` and `ts_bucket_start >= start - 1800`
2. Build span tree: map spanID→Span, link parent via CHILD_OF refs, create Missing Span nodes for absent parents
3. Cache (key: `getWaterfallSpansForTraceWithMetadata-{traceID}`, TTL: 5 min, skipped if trace end within flux interval of 2 min from now)
4. `GetSelectedSpans` (`tracedetail/waterfall.go:159`): find path to selectedSpanID, DFS into uncollapsed nodes, compute SubTreeNodeCount, return sliding window of **500 spans** (40% before, 60% after selected)

### 3. Flamegraph — `POST /api/v2/traces/flamegraph/{traceId}`

Handler: `http_handler.go:1781` → Reader: `reader.go:1091`

**Request**: `{ "selectedSpanId" }` **Response**: `{ startTimestampMillis, endTimestampMillis, durationNano, spans[][] }`

Same DB query as waterfall, but uses **BFS** (not DFS) to organize by level. Returns `[][]*FlamegraphSpan` (lighter model, no tagMap). Level sampling when > 100 spans/level: top 5 by latency + 50 timestamp buckets (2 each). Window: **50 levels**.

### 4. Other APIs

- **Trace Fields**: `GET/POST /api/v2/traces/fields` (handlers at `http_handler.go:4912-4921`)
- **Trace Funnels**: CRUD at `/api/v1/trace-funnels/*`, analytics at `/{funnel_id}/analytics/*` (`pkg/modules/tracefunnel/`)

---

## Query Building System

### Query Structure

```go
QueryBuilderQuery[TraceAggregation]{
    Signal: SignalTraces,
    Filter: &Filter{Expression: "service.name = 'api' AND duration_nano > 1000000"},
    Aggregations: []TraceAggregation{{Expression: "count()", Alias: "total"}},
    GroupBy: []GroupByKey{{TelemetryFieldKey: {Name: "service.name"}}},
}
```

### SQL Generation (`statement_builder.go`)

1. **Field resolution** via `field_mapper.go` — maps intrinsic (`trace_id`, `duration_nano`), calculated (`http_method`, `has_error`), and attribute fields (`attributes_string[...]`) to CH columns. Example: `"service.name"` → `"resource_string_service$$name"`
2. **Time optimization** — if `trace_id` in filter, queries `trace_summary` first to narrow range
3. **Filter building** via `condition_builder.go` — supports `=`, `!=`, `IN`, `LIKE`, `ILIKE`, `EXISTS`, `CONTAINS`, comparisons
4. **Build SQL** by request type: `buildListQuery()`, `buildTimeSeriesQuery()`, `buildScalarQuery()`, `buildTraceQuery()`

### Trace Operators (`trace_operator_statement_builder.go`)

Combines multiple trace queries with set operations. Parses expression (e.g., `"A AND B"`) → builds CTE per query via `trace_operator_cte_builder.go` → combines with INTERSECT (AND), UNION (OR), EXCEPT (NOT).

---

## Frontend (Trace Detail)

### State Flow
```
TraceDetailsV2 (pages/TraceDetailV2/TraceDetailV2.tsx)
  ├── uncollapsedNodes, interestedSpanId, selectedSpan
  ├── useGetTraceV2 → waterfall API
  ├── TraceMetadata (totalSpans, errors, duration)
  ├── TraceFlamegraph (separate API via useGetTraceFlamegraph)
  └── TraceWaterfall → Success → TableV3 (virtualized)
```

### Components

| Component | File |
|-----------|------|
| TraceDetailsV2 | `pages/TraceDetailV2/TraceDetailV2.tsx` |
| TraceMetadata | `container/TraceMetadata/TraceMetadata.tsx` |
| TraceWaterfall | `container/TraceWaterfall/TraceWaterfall.tsx` |
| Success (waterfall table) | `container/TraceWaterfall/.../Success/Success.tsx` |
| Filters | `container/TraceWaterfall/.../Filters/Filters.tsx` |
| TraceFlamegraph | `container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph.tsx` |
| SpanDetailsDrawer | `container/SpanDetailsDrawer/SpanDetailsDrawer.tsx` |

### API Hooks

| Hook | API |
|------|-----|
| `useGetTraceV2` (`hooks/trace/useGetTraceV2.tsx`) | POST waterfall |
| `useGetTraceFlamegraph` (`hooks/trace/useGetTraceFlamegraph.tsx`) | POST flamegraph |

Adapter: `api/trace/getTraceV2.tsx`. Types: `types/api/trace/getTraceV2.ts`.

---

## Known Gotchas

1. **trace_summary**: Always `GROUP BY trace_id` — raw reads return partial unmerged rows
2. **signoz_index_v3 dedup**: Plain MergeTree. Waterfall uses `DISTINCT ON (span_id)`. Flamegraph relies on map-key dedup (keeps last-seen)
3. **Flux interval**: Traces ending within 2 min of now bypass cache → fresh DB query every interaction
4. **SubTreeNodeCount**: Self-inclusive (root count = total tree nodes)
5. **Waterfall pagination**: Max 500 spans per response (sliding window). Frontend virtual-scrolls and re-fetches at edges

---

## Extending the Module

- **New calculated field**: Define in `telemetrytraces/const.go` → map in `field_mapper.go` → optionally update `condition_builder.go`
- **New API endpoint**: Handler in `http_handler.go` → register route → implement in ClickHouseReader or Querier
- **New aggregation**: Update `querybuilder/agg_expr_rewriter.go`
- **New trace operator**: Update `grammar/TraceOperatorGrammar.g4` + `trace_operator_cte_builder.go`

---

## Key File Index

### Backend
| File | Purpose |
|------|---------|
| `pkg/telemetrytraces/statement_builder.go` | Trace SQL generation |
| `pkg/telemetrytraces/field_mapper.go` | Field → CH column mapping |
| `pkg/telemetrytraces/condition_builder.go` | WHERE clause building |
| `pkg/telemetrytraces/trace_operator_statement_builder.go` | Trace operator SQL |
| `pkg/telemetrytraces/trace_operator_cte_builder.go` | Trace operator CTEs |
| `pkg/querier/trace_operator_query.go` | Trace operator execution |
| `pkg/query-service/app/http_handler.go:1748` | Waterfall handler |
| `pkg/query-service/app/http_handler.go:1781` | Flamegraph handler |
| `pkg/query-service/app/clickhouseReader/reader.go:831` | GetSpansForTrace |
| `pkg/query-service/app/clickhouseReader/reader.go:873` | Waterfall logic |
| `pkg/query-service/app/clickhouseReader/reader.go:1091` | Flamegraph logic |
| `pkg/query-service/app/traces/tracedetail/waterfall.go` | DFS traversal, span selection |
| `pkg/query-service/app/traces/tracedetail/flamegraph.go` | BFS traversal, level sampling |
| `pkg/query-service/model/response.go:279` | Span model (waterfall) |
| `pkg/query-service/model/response.go:305` | FlamegraphSpan model |
| `pkg/query-service/model/trace.go` | SpanItemV2, TraceSummary |
| `pkg/query-service/model/cacheable.go` | Cache structures |

### Frontend
| File | Purpose |
|------|---------|
| `pages/TraceDetailV2/TraceDetailV2.tsx` | Page container |
| `container/TraceWaterfall/.../Success/Success.tsx` | Waterfall table |
| `container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph.tsx` | Flamegraph |
| `hooks/trace/useGetTraceV2.tsx` | Waterfall API hook |
| `hooks/trace/useGetTraceFlamegraph.tsx` | Flamegraph API hook |
| `api/trace/getTraceV2.tsx` | API adapter |
| `types/api/trace/getTraceV2.ts` | TypeScript types |

### Schema DDL
| File | Purpose |
|------|---------|
| `signozschemamigrator/.../traces_migrations.go:10-134` | signoz_index_v3 |
| `signozschemamigrator/.../traces_migrations.go:271-348` | trace_summary + MV |
