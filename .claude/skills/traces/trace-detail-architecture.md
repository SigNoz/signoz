# Trace Detail Module Architecture

Use this document as context when working on the trace detail page — the waterfall view, flamegraph view, or any related backend/frontend code. This avoids expensive codebase searches.

---

## ClickHouse Tables

### `signoz_index_v3` (local) / `distributed_signoz_index_v3` (distributed)

- **Engine**: MergeTree (plain — no deduplication)
- **Location**: `signoz-otel-collector/cmd/signozschemamigrator/schema_migrator/traces_migrations.go`
- **Purpose**: Primary span storage. Every span is a row.
- **Key columns**: `ts_bucket_start` (UInt64), `timestamp` (DateTime64(9)), `trace_id` (FixedString(32)), `span_id`, `duration_nano`, `has_error`, `name`, `resource_string_service$$name` (service name), `links` (references/parent info), `attributes_string`, `events`
- **ORDER BY**: `(ts_bucket_start, resource_fingerprint, has_error, name, timestamp)`
- **Partition**: `toDate(timestamp)`
- **Important**: Since it's a plain MergeTree, duplicate rows for the same `span_id` can exist. Queries must use `DISTINCT ON (span_id)` to deduplicate.

### `trace_summary` (local) / `distributed_trace_summary` (distributed)

- **Engine**: AggregatingMergeTree
- **Purpose**: Pre-aggregated trace-level metadata (start time, end time, span count per trace).
- **Columns**:
  - `trace_id` (String) — ORDER BY key
  - `start` (SimpleAggregateFunction(min, DateTime64(9)))
  - `end` (SimpleAggregateFunction(max, DateTime64(9)))
  - `num_spans` (SimpleAggregateFunction(sum, UInt64))
- **Partition**: `toDate(end)`
- **Distributed sharding**: `cityHash64(trace_id)`
- **CRITICAL**: Because this is AggregatingMergeTree, `SELECT *` without `FINAL` or `GROUP BY` can return multiple partial rows per trace_id (one per unmerged part). Always query with:
  ```sql
  SELECT trace_id, min(start) AS start, max(end) AS end, sum(num_spans) AS num_spans
  FROM distributed_trace_summary WHERE trace_id = $1 GROUP BY trace_id
  ```

### `trace_summary_mv` (Materialized View)

- **Source**: `signoz_index_v3`
- **Destination**: `trace_summary`
- **Query**: `SELECT trace_id, min(timestamp) AS start, max(timestamp) AS end, toUInt64(count()) AS num_spans FROM signoz_index_v3 GROUP BY trace_id`
- **How it works**: Acts as an INSERT trigger — runs only on each new batch of rows inserted into `signoz_index_v3`, NOT on the full table. Each batch produces a partial aggregate row in `trace_summary`.

---

## Data Flow: Ingestion to Storage

```
OTel Collector sends spans in batches
  → INSERT into signoz_index_v3 (raw span rows)
    → trace_summary_mv triggers on the batch
      → Computes min(timestamp), max(timestamp), count() per trace_id FOR THAT BATCH ONLY
        → Inserts partial aggregate row into trace_summary
          → ClickHouse eventually merges partial rows (background, async, no timing guarantee)
```

---

## Backend API Endpoints

### POST `/api/v2/traces/waterfall/{traceId}`

- **Handler**: `pkg/query-service/app/http_handler.go` → `GetWaterfallSpansForTraceWithMetadata` (line ~1748)
- **Reader**: `pkg/query-service/app/clickhouseReader/reader.go` → `GetWaterfallSpansForTraceWithMetadata` (line ~873)
- **Request body** (`model.GetWaterfallSpansForTraceWithMetadataParams` in `pkg/query-service/model/queryParams.go:332`):
  ```json
  {
    "selectedSpanId": "abc123",
    "isSelectedSpanIDUnCollapsed": true,
    "uncollapsedSpans": ["span1", "span2"]
  }
  ```
- **Response** (`model.GetWaterfallSpansForTraceWithMetadataResponse` in `pkg/query-service/model/response.go:319`):
  ```json
  {
    "startTimestampMillis": 1707300000000,
    "endTimestampMillis": 1707302460000,
    "totalSpansCount": 166,
    "totalErrorSpansCount": 0,
    "rootServiceName": "frontend",
    "rootServiceEntryPoint": "GET /api/data",
    "serviceNameToTotalDurationMap": {"frontend": 5000, "backend": 3000},
    "spans": [/* flat list of Span objects */],
    "hasMissingSpans": true,
    "uncollapsedSpans": ["span1", "span2", "span3"]
  }
  ```

### POST `/api/v2/traces/flamegraph/{traceId}`

- **Handler**: `http_handler.go` → `GetFlamegraphSpansForTrace` (line ~1781)
- **Reader**: `reader.go` → `GetFlamegraphSpansForTrace` (line ~1091)
- **Request body** (`model.GetFlamegraphSpansForTraceParams` in `queryParams.go:338`):
  ```json
  { "selectedSpanId": "abc123" }
  ```
- **Response** (`model.GetFlamegraphSpansForTraceResponse` in `response.go:334`):
  ```json
  {
    "startTimestampMillis": 1707300000000,
    "endTimestampMillis": 1707302460000,
    "durationNano": 2460000000000,
    "spans": [/* 2D array: spans[level][index] = FlamegraphSpan */]
  }
  ```

---

## Backend Processing Pipeline (Waterfall)

### Step 1: Get spans from DB (`GetSpansForTrace`, reader.go:831)

1. Query `distributed_trace_summary` for the trace's start/end time range
2. Use that range to query `distributed_signoz_index_v3`:
   ```sql
   SELECT DISTINCT ON (span_id) timestamp, duration_nano, span_id, ...
   FROM distributed_signoz_index_v3
   WHERE trace_id = $1
     AND ts_bucket_start >= traceSummary.Start - 1800
     AND ts_bucket_start <= traceSummary.End
   ORDER BY timestamp ASC, name ASC
   ```
3. `totalSpans = len(results)` — count of actual DB spans

### Step 2: Build the span tree (reader.go:907-1017)

1. Create a `spanIdToSpanNodeMap` (map[spanID] → *Span)
2. For each span, find its parent via `References` (CHILD_OF ref type):
   - If parent exists in map → append as child
   - If parent NOT in map → create a **Missing Span** node, add it as root
3. Spans with no parent reference and not already in roots → add as root
4. Sort roots by timestamp

### Step 3: Cache (reader.go:1029-1045)

- Cache key: `"getWaterfallSpansForTraceWithMetadata-{traceID}"`
- TTL: 5 minutes
- Cached data: the full tree (spanIdToSpanNodeMap, traceRoots), metadata (totalSpans, startTime, etc.)
- **Flux interval** (default 2 minutes, config: `--flux-interval-for-trace-detail`): If the trace's end time is within this interval from now, cache is SKIPPED — forces fresh DB query

### Step 4: Select visible spans (`GetSelectedSpans`, tracedetail/waterfall.go:159)

1. Find path from root to `selectedSpanID` → auto-uncollapse those nodes
2. Pre-order DFS traversal of the tree, only descending into uncollapsed nodes
3. For each visited node, compute `SubTreeNodeCount` (total descendants + self)
4. Apply a **sliding window** of 500 spans centered around the selected span (40% before, 60% after)
5. Return the windowed flat list + updated uncollapsedSpans list

### Key Constants (waterfall.go)
- `SPAN_LIMIT_PER_REQUEST_FOR_WATERFALL = 500` — max spans per API response

---

## Backend Processing Pipeline (Flamegraph)

### Differences from Waterfall
- Uses `model.FlamegraphSpan` (lighter model, no tagMap/statusMessage/etc.)
- Uses **BFS traversal** instead of DFS — organizes spans by level (depth)
- Returns spans as `[][]*FlamegraphSpan` — a 2D array where index = tree level
- Applies **level sampling** when a level has > 100 spans:
  - Keeps top 5 by latency
  - Buckets remaining spans into 50 timestamp buckets, keeps 2 per bucket
- Sliding window of 50 levels centered on selected span

### Key Constants (flamegraph.go)
- `SPAN_LIMIT_PER_REQUEST_FOR_FLAMEGRAPH = 50` — max levels per response
- `SPAN_LIMIT_PER_LEVEL = 100` — triggers sampling within a level
- `TIMESTAMP_SAMPLING_BUCKET_COUNT = 50` — buckets for timestamp-based sampling

---

## Frontend Architecture

### Page: `frontend/src/pages/TraceDetailV2/TraceDetailV2.tsx`

The main trace detail page. Uses a resizable panel layout with trace content on the left and span details drawer on the right.

### Key State Flow
```
TraceDetailsV2
  ├── uncollapsedNodes (string[]) — tracks which spans are expanded
  ├── interestedSpanId — the span to focus on (from URL or user click)
  ├── selectedSpan — currently selected span for detail drawer
  │
  ├── useGetTraceV2 hook — calls waterfall API
  │     queryKey: [GET_TRACE_V2_WATERFALL, traceId, selectedSpanId, isUncollapsed]
  │     triggers: on traceId or interestedSpanId change
  │
  ├── TraceMetadata — displays totalSpansCount, errorSpansCount, duration, etc.
  ├── TraceFlamegraph — separate API call via useGetTraceFlamegraph hook
  └── TraceWaterfall → Success component → TableV3 (virtualized table)
```

### Component Map

| Component | File | Purpose |
|-----------|------|---------|
| TraceDetailsV2 | `pages/TraceDetailV2/TraceDetailV2.tsx` | Page container, state management |
| TraceMetadata | `container/TraceMetadata/TraceMetadata.tsx` | Top bar: trace ID, duration, total/error spans |
| TraceWaterfall | `container/TraceWaterfall/TraceWaterfall.tsx` | State machine (loading/error/success) |
| Success | `container/TraceWaterfall/TraceWaterfallStates/Success/Success.tsx` | Waterfall table with virtualized rows |
| SpanOverview | (inside Success.tsx) | Left column: span name, service, collapse button |
| SpanDuration | (inside Success.tsx) | Right column: span duration bar |
| Filters | `container/TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters.tsx` | Search/filter spans within trace |
| TraceFlamegraph | `container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph.tsx` | Flamegraph visualization |
| SpanDetailsDrawer | `container/SpanDetailsDrawer/SpanDetailsDrawer.tsx` | Right panel: selected span attributes |

### API Layer

| Hook | File | API |
|------|------|-----|
| useGetTraceV2 | `hooks/trace/useGetTraceV2.tsx` | POST `/api/v2/traces/waterfall/{traceId}` |
| useGetTraceFlamegraph | `hooks/trace/useGetTraceFlamegraph.tsx` | POST `/api/v2/traces/flamegraph/{traceId}` |

### API Adapter
- `frontend/src/api/trace/getTraceV2.tsx` — prepares POST body, filters uncollapsedSpans based on isSelectedSpanIDUnCollapsed

### Frontend Types
- `frontend/src/types/api/trace/getTraceV2.ts` — Span, GetTraceV2SuccessResponse, GetTraceV2PayloadProps

---

## Models (Backend)

| Model | File | Used By |
|-------|------|---------|
| `Span` | `model/response.go:279` | Waterfall — includes Children, SubTreeNodeCount, Level, HasChildren, TagMap |
| `FlamegraphSpan` | `model/response.go:305` | Flamegraph — lighter, includes Level, no TagMap |
| `SpanItemV2` | `model/trace.go` | Raw DB scan result |
| `TraceSummary` | `model/trace.go:26` | trace_summary table row: TraceID, Start, End, NumSpans |
| `GetWaterfallSpansForTraceWithMetadataCache` | `model/cacheable.go:10` | Cache structure for waterfall |
| `GetFlamegraphSpansForTraceCache` | `model/cacheable.go:51` | Cache structure for flamegraph |

---

## Known Gotchas

1. **trace_summary reads**: Always use `GROUP BY trace_id` when reading from `distributed_trace_summary`. Raw `SELECT *` can return partial unmerged rows from AggregatingMergeTree.

3. **Flux interval**: Traces whose end time is within 2 minutes of now always bypass cache, causing fresh DB queries on every interaction (collapse/expand/refresh).

4. **signoz_index_v3 has no dedup**: It's a plain MergeTree. Duplicate span rows can exist. The waterfall query uses `DISTINCT ON (span_id)` to handle this. The flamegraph query does NOT — it relies on `spanIdToSpanNodeMap` (map keyed by spanID) which naturally deduplicates but keeps the last-seen duplicate.

5. **SubTreeNodeCount is self-inclusive**: The count displayed next to a span's collapse button includes the span itself. For the root span, this equals the total number of nodes in the tree (real spans + missing spans).

6. **Waterfall pagination**: The API returns at most 500 spans per request (a sliding window). The frontend uses virtual scrolling and triggers new API calls when the user scrolls to the edges (`handleVirtualizerInstanceChanged` in Success.tsx).

---

## Key File Index

### Backend
| File | Purpose |
|------|---------|
| `pkg/query-service/app/http_handler.go:566-567` | Route registration |
| `pkg/query-service/app/http_handler.go:1748` | Waterfall handler |
| `pkg/query-service/app/http_handler.go:1781` | Flamegraph handler |
| `pkg/query-service/app/clickhouseReader/reader.go:831` | `GetSpansForTrace` — queries trace_summary + spans table |
| `pkg/query-service/app/clickhouseReader/reader.go:856` | Waterfall cache retrieval |
| `pkg/query-service/app/clickhouseReader/reader.go:873` | `GetWaterfallSpansForTraceWithMetadata` — main waterfall logic |
| `pkg/query-service/app/clickhouseReader/reader.go:1074` | Flamegraph cache retrieval |
| `pkg/query-service/app/clickhouseReader/reader.go:1091` | `GetFlamegraphSpansForTrace` — main flamegraph logic |
| `pkg/query-service/app/traces/tracedetail/waterfall.go` | Tree traversal, span selection, SubTreeNodeCount calculation |
| `pkg/query-service/app/traces/tracedetail/flamegraph.go` | BFS traversal, level-based organization, sampling |
| `pkg/query-service/model/response.go:279-339` | Span and FlamegraphSpan models |
| `pkg/query-service/model/queryParams.go:332-340` | Request param models |
| `pkg/query-service/model/cacheable.go` | Cache data structures |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/pages/TraceDetailV2/TraceDetailV2.tsx` | Main page component |
| `frontend/src/container/TraceMetadata/TraceMetadata.tsx` | Header with total/error spans |
| `frontend/src/container/TraceWaterfall/TraceWaterfall.tsx` | Waterfall state machine |
| `frontend/src/container/TraceWaterfall/TraceWaterfallStates/Success/Success.tsx` | Waterfall table rendering |
| `frontend/src/container/TraceWaterfall/TraceWaterfallStates/Success/Filters/Filters.tsx` | Span search/filter |
| `frontend/src/container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph.tsx` | Flamegraph component |
| `frontend/src/hooks/trace/useGetTraceV2.tsx` | Waterfall API hook |
| `frontend/src/api/trace/getTraceV2.tsx` | Waterfall API adapter |
| `frontend/src/types/api/trace/getTraceV2.ts` | TypeScript types |

### Schema
| File | Purpose |
|------|---------|
| `signoz-otel-collector/cmd/signozschemamigrator/schema_migrator/traces_migrations.go:10-134` | signoz_index_v3 table DDL |
| `signoz-otel-collector/cmd/signozschemamigrator/schema_migrator/traces_migrations.go:271-348` | trace_summary + MV DDL |
