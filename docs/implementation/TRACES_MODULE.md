# SigNoz Traces Module - Developer Guide

This document provides a comprehensive guide to understanding and contributing to the traces module in SigNoz. It covers architecture, APIs, code flows, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Code Flows](#code-flows)
6. [Key Components](#key-components)
7. [Query Building System](#query-building-system)
8. [Storage Schema](#storage-schema)
9. [Extending the Traces Module](#extending-the-traces-module)

---

## Overview

The traces module in SigNoz handles distributed tracing data from OpenTelemetry. It provides:

- **Ingestion**: Receives traces via OpenTelemetry Collector
- **Storage**: Stores traces in ClickHouse
- **Querying**: Supports complex queries with filters, aggregations, and trace operators
- **Visualization**: Provides waterfall and flamegraph views
- **Trace Funnels**: Advanced analytics for multi-step trace analysis

### Key Technologies

- **Backend**: Go (Golang)
- **Storage**: ClickHouse (columnar database)
- **Protocol**: OpenTelemetry Protocol (OTLP)
- **Query Language**: Custom query builder + ClickHouse SQL

---

## Architecture

### High-Level Flow

```
Application → OpenTelemetry SDK → OTLP Receiver → 
  [Processors: signozspanmetrics, batch] → 
  ClickHouse Traces Exporter → ClickHouse Database
                                    ↓
                            Query Service (Go)
                                    ↓
                            Frontend (React/TypeScript)
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - TracesExplorer                                        │
│  - TraceDetail (Waterfall/Flamegraph)                   │
│  - Query Builder UI                                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────┐
│              Query Service (Go)                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  HTTP Handlers (http_handler.go)                  │  │
│  │  - QueryRangeV5 (Main query endpoint)            │  │
│  │  - GetWaterfallSpansForTrace                      │  │
│  │  - GetFlamegraphSpansForTrace                     │  │
│  │  - Trace Fields API                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Querier (querier.go)                            │  │
│  │  - Query orchestration                            │  │
│  │  - Cache management                              │  │
│  │  - Result merging                                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Statement Builders                              │  │
│  │  - traceQueryStatementBuilder                    │  │
│  │  - traceOperatorStatementBuilder                 │  │
│  │  - Builds ClickHouse SQL from query specs        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ClickHouse Reader (clickhouseReader/)          │  │
│  │  - Direct trace retrieval                       │  │
│  │  - Waterfall/Flamegraph data processing         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ ClickHouse Protocol
┌────────────────────▼────────────────────────────────────┐
│              ClickHouse Database                         │
│  - signoz_traces.distributed_signoz_index_v3           │
│  - signoz_traces.distributed_trace_summary              │
│  - signoz_traces.distributed_tag_attributes_v2          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Models

### Core Trace Models

**Location**: `pkg/query-service/model/trace.go`

### Query Request Models

**Location**: `pkg/types/querybuildertypes/querybuildertypesv5/`

- `QueryRangeRequest`: Main query request structure
- `QueryBuilderQuery[TraceAggregation]`: Query builder specification for traces
- `QueryBuilderTraceOperator`: Trace operator query specification
- `CompositeQuery`: Container for multiple queries

---

## API Endpoints

### 1. Query Range API (V5) - Primary Query Endpoint

**Endpoint**: `POST /api/v5/query_range`

**Handler**: `QuerierAPI.QueryRange` → `querier.QueryRange`

**Purpose**: Main query endpoint for traces, logs, and metrics. Supports:
- Query builder queries
- Trace operator queries
- Aggregations, filters, group by
- Time series, scalar, and raw data requests

> **Note**: For detailed information about the Query Range API, including request/response models, query types, and common code flows, see the [Query Range API Documentation](./QUERY_RANGE_API.md).

**Trace-Specific Details**:
- Uses `traceQueryStatementBuilder` for SQL generation
- Supports trace-specific aggregations (count, avg, p99, etc. on duration_nano)
- Trace operator queries combine multiple trace queries with set operations
- Time range optimization when `trace_id` filter is present

**Key Files**:
- `pkg/telemetrytraces/statement_builder.go` - Trace SQL generation
- `pkg/telemetrytraces/trace_operator_statement_builder.go` - Trace operator SQL
- `pkg/querier/trace_operator_query.go` - Trace operator execution

### 2. Waterfall View API

**Endpoint**: `POST /api/v2/traces/waterfall/{traceId}`

**Handler**: `GetWaterfallSpansForTraceWithMetadata`

**Purpose**: Retrieves spans for waterfall visualization with metadata

**Request Parameters**:
```go
type GetWaterfallSpansForTraceWithMetadataParams struct {
    SelectedSpanID              string   // Selected span to focus on
    IsSelectedSpanIDUnCollapsed bool     // Whether selected span is expanded
    UncollapsedSpans            []string // List of expanded span IDs
}
```

**Response**:
```go
type GetWaterfallSpansForTraceWithMetadataResponse struct {
    StartTimestampMillis          uint64            // Trace start time
    EndTimestampMillis            uint64            // Trace end time
    DurationNano                  uint64            // Total duration
    RootServiceName               string            // Root service
    RootServiceEntryPoint         string            // Entry point operation
    TotalSpansCount               uint64            // Total spans
    TotalErrorSpansCount          uint64            // Error spans
    ServiceNameToTotalDurationMap map[string]uint64 // Service durations
    Spans                         []*Span           // Span tree
    HasMissingSpans               bool              // Missing spans indicator
    UncollapsedSpans             []string          // Expanded spans
}
```

**Code Flow**:
```
Handler → ClickHouseReader.GetWaterfallSpansForTraceWithMetadata
    → Query trace_summary for time range
    → Query spans from signoz_index_v3
    → Build span tree structure
    → Apply uncollapsed/selected span logic
    → Return filtered spans (500 span limit)
```

**Key Files**:
- `pkg/query-service/app/http_handler.go:1748` - Handler
- `pkg/query-service/app/clickhouseReader/reader.go:873` - Implementation
- `pkg/query-service/app/traces/tracedetail/waterfall.go` - Tree processing

### 3. Flamegraph View API

**Endpoint**: `POST /api/v2/traces/flamegraph/{traceId}`

**Handler**: `GetFlamegraphSpansForTrace`

**Purpose**: Retrieves spans organized by level for flamegraph visualization

**Request Parameters**:
```go
type GetFlamegraphSpansForTraceParams struct {
    SelectedSpanID string // Selected span ID
}
```

**Response**:
```go
type GetFlamegraphSpansForTraceResponse struct {
    StartTimestampMillis uint64              // Trace start
    EndTimestampMillis   uint64              // Trace end
    DurationNano         uint64              // Total duration
    Spans                [][]*FlamegraphSpan // Spans organized by level
}
```

**Code Flow**:
```
Handler → ClickHouseReader.GetFlamegraphSpansForTrace
    → Query trace_summary for time range
    → Query spans from signoz_index_v3
    → Build span tree
    → BFS traversal to organize by level
    → Sample spans (50 levels, 100 spans/level max)
    → Return level-organized spans
```

**Key Files**:
- `pkg/query-service/app/http_handler.go:1781` - Handler
- `pkg/query-service/app/clickhouseReader/reader.go:1091` - Implementation
- `pkg/query-service/app/traces/tracedetail/flamegraph.go` - BFS processing

### 4. Trace Fields API

**Endpoint**: 
- `GET /api/v2/traces/fields` - Get available trace fields
- `POST /api/v2/traces/fields` - Update trace field metadata

**Handler**: `traceFields`, `updateTraceField`

**Purpose**: Manage trace field metadata for query builder

**Key Files**:
- `pkg/query-service/app/http_handler.go:4912` - Get handler
- `pkg/query-service/app/http_handler.go:4921` - Update handler

### 5. Trace Funnels API

**Endpoint**: `/api/v1/trace-funnels/*`

**Purpose**: Manage trace funnels (multi-step trace analysis)

**Endpoints**:
- `POST /api/v1/trace-funnels/new` - Create funnel
- `GET /api/v1/trace-funnels/list` - List funnels
- `GET /api/v1/trace-funnels/{funnel_id}` - Get funnel
- `PUT /api/v1/trace-funnels/{funnel_id}` - Update funnel
- `DELETE /api/v1/trace-funnels/{funnel_id}` - Delete funnel
- `POST /api/v1/trace-funnels/{funnel_id}/analytics/*` - Analytics endpoints

**Key Files**:
- `pkg/query-service/app/http_handler.go:5084` - Route registration
- `pkg/modules/tracefunnel/` - Funnel implementation

---

## Code Flows

### Flow 1: Query Range Request (V5)

This is the primary query flow for traces. For the complete flow covering all query types, see the [Query Range API Documentation](./QUERY_RANGE_API.md#code-flow).

**Trace-Specific Flow**:

```
1. HTTP Request
   POST /api/v5/query_range
   ↓
2. Querier.QueryRange (common flow - see QUERY_RANGE_API.md)
   ↓
3. Trace Query Processing:
   a. Builder Query (QueryTypeBuilder with SignalTraces):
      - newBuilderQuery() creates builderQuery instance
      - Uses traceStmtBuilder (traceQueryStatementBuilder)
      ↓
   b. Trace Operator Query (QueryTypeTraceOperator):
      - newTraceOperatorQuery() creates traceOperatorQuery
      - Uses traceOperatorStmtBuilder
      ↓
4. Trace Statement Building
   traceQueryStatementBuilder.Build() (pkg/telemetrytraces/statement_builder.go:58)
   - Resolves trace field keys from metadata store
   - Optimizes time range if trace_id filter present (queries trace_summary)
   - Maps fields using traceFieldMapper
   - Builds conditions using traceConditionBuilder
   - Builds SQL based on request type:
     * RequestTypeRaw → buildListQuery()
     * RequestTypeTimeSeries → buildTimeSeriesQuery()
     * RequestTypeScalar → buildScalarQuery()
     * RequestTypeTrace → buildTraceQuery()
   ↓
5. Query Execution
   builderQuery.Execute() (pkg/querier/builder_query.go)
   - Executes SQL against ClickHouse (signoz_traces database)
   - Processes results into response format
   ↓
6. Result Processing (common flow - see QUERY_RANGE_API.md)
   - Merges results from multiple queries
   - Applies formulas if present
   - Handles caching
   ↓
7. HTTP Response
   - Returns QueryRangeResponse with trace results
```

**Trace-Specific Key Components**:
- `pkg/telemetrytraces/statement_builder.go` - Trace SQL generation
- `pkg/telemetrytraces/field_mapper.go` - Trace field mapping
- `pkg/telemetrytraces/condition_builder.go` - Trace filter building
- `pkg/telemetrytraces/trace_operator_statement_builder.go` - Trace operator SQL

### Flow 2: Waterfall View Request

```
1. HTTP Request
   POST /api/v2/traces/waterfall/{traceId}
   ↓
2. GetWaterfallSpansForTraceWithMetadata handler
   - Extracts traceId from URL
   - Parses request body for params
   ↓
3. ClickHouseReader.GetWaterfallSpansForTraceWithMetadata
   - Checks cache first (5 minute TTL)
   ↓
4. If cache miss:
   a. Query trace_summary table
      SELECT * FROM distributed_trace_summary WHERE trace_id = ?
      - Gets time range (start, end, num_spans)
   ↓
   b. Query spans table
      SELECT ... FROM distributed_signoz_index_v3
      WHERE trace_id = ? 
      AND ts_bucket_start >= ? AND ts_bucket_start <= ?
      - Retrieves all spans for trace
   ↓
   c. Build span tree
      - Parse references to build parent-child relationships
      - Identify root spans (no parent)
      - Calculate service durations
   ↓
   d. Cache result
   ↓
5. Apply selection logic
   tracedetail.GetSelectedSpans()
   - Traverses tree based on uncollapsed spans
   - Finds path to selected span
   - Returns sliding window (500 spans max)
   ↓
6. HTTP Response
   - Returns spans with metadata
```

**Key Components**:
- `pkg/query-service/app/clickhouseReader/reader.go:873`
- `pkg/query-service/app/traces/tracedetail/waterfall.go`
- `pkg/query-service/model/trace.go`

### Flow 3: Trace Operator Query

Trace operators allow combining multiple trace queries with set operations.

```
1. QueryRangeRequest with QueryTypeTraceOperator
   ↓
2. Querier identifies trace operator queries
   - Parses expression to find dependencies
   - Collects referenced queries
   ↓
3. traceOperatorStatementBuilder.Build()
   - Parses expression (e.g., "A AND B", "A OR B")
   - Builds expression tree
   ↓
4. traceOperatorCTEBuilder.build()
   - Creates CTEs (Common Table Expressions) for each query
   - Builds final query with set operations:
     * AND → INTERSECT
     * OR → UNION
     * NOT → EXCEPT
   ↓
5. Execute combined query
   - Returns traces matching the operator expression
```

**Key Components**:
- `pkg/telemetrytraces/trace_operator_statement_builder.go`
- `pkg/telemetrytraces/trace_operator_cte_builder.go`
- `pkg/querier/trace_operator_query.go`

---

## Key Components

> **Note**: For common components used across all signals (Querier, TelemetryStore, MetadataStore, etc.), see the [Query Range API Documentation](./QUERY_RANGE_API.md#key-components).

### 1. Trace Statement Builder

**Location**: `pkg/telemetrytraces/statement_builder.go`

**Purpose**: Converts trace query builder specifications into ClickHouse SQL

**Key Methods**:
- `Build()`: Main entry point, builds SQL statement
- `buildListQuery()`: Builds query for raw/list results
- `buildTimeSeriesQuery()`: Builds query for time series
- `buildScalarQuery()`: Builds query for scalar values
- `buildTraceQuery()`: Builds query for trace-specific results

**Key Features**:
- Trace field resolution via metadata store
- Time range optimization for trace_id filters (queries trace_summary first)
- Support for trace aggregations, filters, group by, ordering
- Calculated field support (http_method, db_name, has_error, etc.)
- Resource filter support via resourceFilterStmtBuilder

### 2. Trace Field Mapper

**Location**: `pkg/telemetrytraces/field_mapper.go`

**Purpose**: Maps trace query field names to ClickHouse column names

**Field Types**:
- **Intrinsic Fields**: Built-in fields (trace_id, span_id, duration_nano, name, kind_string, status_code_string, etc.)
- **Calculated Fields**: Derived fields (http_method, db_name, has_error, response_status_code, etc.)
- **Attribute Fields**: Dynamic span/resource attributes (accessed via attributes_string, attributes_number, attributes_bool, resources_string)

**Example Mapping**:
```
"service.name" → "resource_string_service$$name"
"http.method" → Calculated from attributes_string['http.method']
"duration_nano" → "duration_nano" (intrinsic)
"trace_id" → "trace_id" (intrinsic)
```

**Key Methods**:
- `MapField()`: Maps a field to ClickHouse expression
- `MapAttribute()`: Maps attribute fields
- `MapResource()`: Maps resource fields

### 3. Trace Condition Builder

**Location**: `pkg/telemetrytraces/condition_builder.go`

**Purpose**: Builds WHERE clause conditions from trace filter expressions

**Supported Operators**:
- `=`, `!=`, `IN`, `NOT IN`
- `>`, `>=`, `<`, `<=`
- `LIKE`, `NOT LIKE`, `ILIKE`
- `EXISTS`, `NOT EXISTS`
- `CONTAINS`, `NOT CONTAINS`

**Key Methods**:
- `BuildCondition()`: Builds condition from filter expression
- Handles attribute, resource, and intrinsic field filtering

### 4. Trace Operator Statement Builder

**Location**: `pkg/telemetrytraces/trace_operator_statement_builder.go`

**Purpose**: Builds SQL for trace operator queries (AND, OR, NOT operations on trace queries)

**Key Methods**:
- `Build()`: Builds CTE-based SQL for trace operators
- Uses `traceOperatorCTEBuilder` to create Common Table Expressions

**Features**:
- Parses operator expressions (e.g., "A AND B")
- Creates CTEs for each referenced query
- Combines results using INTERSECT, UNION, EXCEPT

### 5. ClickHouse Reader (Trace-Specific Methods)

**Location**: `pkg/query-service/app/clickhouseReader/reader.go`

**Purpose**: Direct trace data retrieval and processing (bypasses query builder)

**Key Methods**:
- `GetWaterfallSpansForTraceWithMetadata()`: Waterfall view data
- `GetFlamegraphSpansForTrace()`: Flamegraph view data
- `SearchTraces()`: Legacy trace search (still used for some flows)
- `GetMinAndMaxTimestampForTraceID()`: Time range optimization helper

**Caching**: Implements 5-minute cache for trace detail views

**Note**: These methods are used for trace-specific visualizations. For general trace queries, use the Query Range API.

---

## Query Building System

> **Note**: For general query building concepts and patterns, see the [Query Range API Documentation](./QUERY_RANGE_API.md). This section covers trace-specific aspects.

### Trace Query Builder Structure

A trace query consists of:

```go
QueryBuilderQuery[TraceAggregation] {
    Name: "query_name",
    Signal: SignalTraces,
    Filter: &Filter {
        Expression: "service.name = 'api' AND duration_nano > 1000000"
    },
    Aggregations: []TraceAggregation {
        {Expression: "count()", Alias: "total"},
        {Expression: "avg(duration_nano)", Alias: "avg_duration"},
        {Expression: "p99(duration_nano)", Alias: "p99"},
    },
    GroupBy: []GroupByKey {
        {TelemetryFieldKey: {Name: "service.name", ...}},
    },
    Order: []OrderBy {...},
    Limit: 100,
}
```

### Trace-Specific SQL Generation Process

1. **Field Resolution**: 
   - Resolve trace field names using `traceFieldMapper`
   - Handle intrinsic, calculated, and attribute fields
   - Map to ClickHouse columns (e.g., `service.name` → `resource_string_service$$name`)

2. **Time Range Optimization**:
   - If `trace_id` filter present, query `trace_summary` first
   - Narrow time range based on trace start/end times
   - Reduces data scanned significantly

3. **Filter Building**: 
   - Convert filter expression using `traceConditionBuilder`
   - Handle attribute filters (attributes_string, attributes_number, attributes_bool)
   - Handle resource filters (resources_string)
   - Handle intrinsic field filters

4. **Aggregation Building**: 
   - Build SELECT with trace aggregations
   - Support trace-specific functions (count, avg, p99, etc. on duration_nano)

5. **Group By Building**: 
   - Add GROUP BY clause with trace fields
   - Support grouping by service.name, operation name, etc.

6. **Order Building**: 
   - Add ORDER BY clause
   - Support ordering by duration, timestamp, etc.

7. **Limit/Offset**: 
   - Add pagination

### Example Generated SQL

For query: `count() WHERE service.name = 'api' GROUP BY service.name`

```sql
SELECT 
    count() AS total,
    resource_string_service$$name AS service_name
FROM signoz_traces.distributed_signoz_index_v3
WHERE 
    timestamp >= toDateTime64(1234567890/1e9, 9)
    AND timestamp <= toDateTime64(1234567899/1e9, 9)
    AND ts_bucket_start >= toDateTime64(1234567890/1e9, 9)
    AND ts_bucket_start <= toDateTime64(1234567899/1e9, 9)
    AND resource_string_service$$name = 'api'
GROUP BY resource_string_service$$name
```

**Note**: The query uses `ts_bucket_start` for efficient time filtering (partitioning column).

---

## Storage Schema

### Main Tables

**Location**: `pkg/telemetrytraces/tables.go`

#### 1. `distributed_signoz_index_v3`

Main span index table. Stores all span data.

**Key Columns**:
- `timestamp`: Span timestamp
- `duration_nano`: Span duration
- `span_id`, `trace_id`: Identifiers
- `has_error`: Error indicator
- `kind`: Span kind
- `name`: Operation name
- `attributes_string`, `attributes_number`, `attributes_bool`: Attributes
- `resources_string`: Resource attributes
- `events`: Span events
- `status_code_string`, `status_message`: Status
- `ts_bucket_start`: Time bucket for partitioning

#### 2. `distributed_trace_summary`

Trace-level summary for quick lookups.

**Columns**:
- `trace_id`: Trace identifier
- `start`: Earliest span timestamp
- `end`: Latest span timestamp
- `num_spans`: Total span count

#### 3. `distributed_tag_attributes_v2`

Metadata table for attribute keys.

**Purpose**: Stores available attribute keys for autocomplete

#### 4. `distributed_span_attributes_keys`

Span attribute keys metadata.

**Purpose**: Tracks which attributes exist in spans

### Database

All trace tables are in the `signoz_traces` database.

---

## Extending the Traces Module

### Adding a New Calculated Field

1. **Define Field in Constants** (`pkg/telemetrytraces/const.go`):
```go
CalculatedFields = map[string]telemetrytypes.TelemetryFieldKey{
    "my_new_field": {
        Name:          "my_new_field",
        Description:   "Description of the field",
        Signal:        telemetrytypes.SignalTraces,
        FieldContext:  telemetrytypes.FieldContextSpan,
        FieldDataType: telemetrytypes.FieldDataTypeString,
    },
}
```

2. **Implement Field Mapping** (`pkg/telemetrytraces/field_mapper.go`):
```go
func (fm *fieldMapper) MapField(field telemetrytypes.TelemetryFieldKey) (string, error) {
    if field.Name == "my_new_field" {
        // Return ClickHouse expression
        return "attributes_string['my.attribute.key']", nil
    }
    // ... existing mappings
}
```

3. **Update Condition Builder** (if needed for filtering):
```go
// In condition_builder.go, add support for your field
```

### Adding a New API Endpoint

1. **Add Handler Method** (`pkg/query-service/app/http_handler.go`):
```go
func (aH *APIHandler) MyNewTraceHandler(w http.ResponseWriter, r *http.Request) {
    // Extract parameters
    // Call reader or querier
    // Return response
}
```

2. **Register Route** (in `RegisterRoutes` or separate method):
```go
router.HandleFunc("/api/v2/traces/my-endpoint", 
    am.ViewAccess(aH.MyNewTraceHandler)).Methods(http.MethodPost)
```

3. **Implement Logic**:
   - Add to `ClickHouseReader` if direct DB access needed
   - Or use `Querier` for query builder queries

### Adding a New Aggregation Function

1. **Update Aggregation Rewriter** (`pkg/querybuilder/agg_expr_rewriter.go`):
```go
func (r *aggExprRewriter) RewriteAggregation(expr string) (string, error) {
    // Add parsing for your function
    if strings.HasPrefix(expr, "my_function(") {
        // Return ClickHouse SQL expression
        return "myClickHouseFunction(...)", nil
    }
}
```

2. **Update Statement Builder** (if special handling needed):
```go
// In statement_builder.go, add special case if needed
```

### Adding Trace Operator Support

Trace operators are already extensible. To add a new operator:

1. **Update Grammar** (`grammar/TraceOperatorGrammar.g4`):
```antlr
operator: AND | OR | NOT | MY_NEW_OPERATOR;
```

2. **Update CTE Builder** (`pkg/telemetrytraces/trace_operator_cte_builder.go`):
```go
func (b *traceOperatorCTEBuilder) buildOperatorQuery(op TraceOperatorType) string {
    switch op {
    case TraceOperatorTypeMyNewOperator:
        return "MY_CLICKHOUSE_OPERATION"
    }
}
```

---

## Common Patterns

### Pattern 1: Query with Filter

```go
query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
    Name: "filtered_traces",
    Signal: telemetrytypes.SignalTraces,
    Filter: &qbtypes.Filter{
        Expression: "service.name = 'api' AND duration_nano > 1000000",
    },
    Aggregations: []qbtypes.TraceAggregation{
        {Expression: "count()", Alias: "total"},
    },
}
```

### Pattern 2: Time Series Query

```go
query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
    Name: "time_series",
    Signal: telemetrytypes.SignalTraces,
    Aggregations: []qbtypes.TraceAggregation{
        {Expression: "avg(duration_nano)", Alias: "avg_duration"},
    },
    GroupBy: []qbtypes.GroupByKey{
        {TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
            Name: "service.name",
            FieldContext: telemetrytypes.FieldContextResource,
        }},
    },
    StepInterval: qbtypes.Step{Duration: time.Minute},
}
```

### Pattern 3: Trace Operator Query

```go
query := qbtypes.QueryBuilderTraceOperator{
    Name: "operator_query",
    Expression: "A AND B", // A and B are query names
    Filter: &qbtypes.Filter{
        Expression: "duration_nano > 5000000",
    },
}
```

---

## Performance Considerations

### Caching

- **Trace Detail Views**: 5-minute cache for waterfall/flamegraph
- **Query Results**: Bucket-based caching in querier
- **Metadata**: Cached attribute keys and field metadata

### Query Optimization

1. **Time Range Optimization**: When `trace_id` is in filter, query `trace_summary` first to narrow time range
2. **Index Usage**: Queries use `ts_bucket_start` for time filtering
3. **Limit Enforcement**: Waterfall/flamegraph have span limits (500/50)

### Best Practices

1. **Use Query Builder**: Prefer query builder over raw SQL for better optimization
2. **Limit Time Ranges**: Always specify reasonable time ranges
3. **Use Aggregations**: For large datasets, use aggregations instead of raw data
4. **Cache Awareness**: Be mindful of cache TTLs when testing

---

## References

### Key Files

- `pkg/telemetrytraces/` - Core trace query building
  - `statement_builder.go` - Trace SQL generation
  - `field_mapper.go` - Trace field mapping
  - `condition_builder.go` - Trace filter building
  - `trace_operator_statement_builder.go` - Trace operator SQL
- `pkg/query-service/app/clickhouseReader/reader.go` - Direct trace access
- `pkg/query-service/app/http_handler.go` - API handlers
- `pkg/query-service/model/trace.go` - Data models

### Related Documentation

- [Query Range API Documentation](./QUERY_RANGE_API.md) - Common query_range API details
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/)
- [ClickHouse Documentation](https://clickhouse.com/docs)
- [Query Builder Guide](../contributing/go/query-builder.md)

---

## Contributing

When contributing to the traces module:

1. **Follow Existing Patterns**: Match the style of existing code
2. **Add Tests**: Include unit tests for new functionality
3. **Update Documentation**: Update this doc for significant changes
4. **Consider Performance**: Optimize queries and use caching appropriately
5. **Handle Errors**: Provide meaningful error messages

For questions or help, reach out to the maintainers or open an issue.
