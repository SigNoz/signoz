# Query Range API (V5) - Developer Guide

This document provides a comprehensive guide to the Query Range API (V5), which is the primary query endpoint for traces, logs, and metrics in SigNoz. It covers architecture, request/response models, code flows, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoint](#api-endpoint)
3. [Request/Response Models](#requestresponse-models)
4. [Query Types](#query-types)
5. [Request Types](#request-types)
6. [Code Flow](#code-flow)
7. [Key Components](#key-components)
8. [Query Execution](#query-execution)
9. [Caching](#caching)
10. [Result Processing](#result-processing)
11. [Performance Considerations](#performance-considerations)
12. [Extending the API](#extending-the-api)

---

## Overview

The Query Range API (V5) is the unified query endpoint for all telemetry signals (traces, logs, metrics) in SigNoz. It provides:

- **Unified Interface**: Single endpoint for all signal types
- **Query Builder**: Visual query builder support
- **Multiple Query Types**: Builder queries, PromQL, ClickHouse SQL, Formulas, Trace Operators
- **Flexible Response Types**: Time series, scalar, raw data, trace-specific
- **Advanced Features**: Aggregations, filters, group by, ordering, pagination
- **Caching**: Intelligent caching for performance

### Key Technologies

- **Backend**: Go (Golang)
- **Storage**: ClickHouse (columnar database)
- **Query Language**: Custom query builder + PromQL + ClickHouse SQL
- **Protocol**: HTTP/REST API

---

## API Endpoint

### Endpoint Details

**URL**: `POST /api/v5/query_range`

**Handler**: `QuerierAPI.QueryRange` → `querier.QueryRange`

**Location**: 
- Handler: `pkg/querier/querier.go:122`
- Route Registration: `pkg/query-service/app/http_handler.go:480`

**Authentication**: Requires ViewAccess permission

**Content-Type**: `application/json`

### Request Flow

```
HTTP Request (POST /api/v5/query_range)
    ↓
HTTP Handler (QuerierAPI.QueryRange)
    ↓
Querier.QueryRange (pkg/querier/querier.go)
    ↓
Query Execution (Statement Builders → ClickHouse)
    ↓
Result Processing & Merging
    ↓
HTTP Response (QueryRangeResponse)
```

---

## Request/Response Models

### Request Model

**Location**: `pkg/types/querybuildertypes/querybuildertypesv5/req.go`

```go
type QueryRangeRequest struct {
    Start       uint64          // Start timestamp (milliseconds)
    End         uint64          // End timestamp (milliseconds)
    RequestType RequestType      // Response type (TimeSeries, Scalar, Raw, Trace)
    Variables   map[string]VariableItem // Template variables
    CompositeQuery CompositeQuery // Container for queries
    NoCache     bool            // Skip cache flag
}
```

### Composite Query

```go
type CompositeQuery struct {
    Queries []QueryEnvelope // Array of queries to execute
}
```

### Query Envelope

```go
type QueryEnvelope struct {
    Type QueryType // Query type (Builder, PromQL, ClickHouseSQL, Formula, TraceOperator)
    Spec any       // Query specification (type-specific)
}
```

### Response Model

**Location**: `pkg/types/querybuildertypes/querybuildertypesv5/req.go`

```go
type QueryRangeResponse struct {
    Type    RequestType           // Response type
    Data    QueryData             // Query results
    Meta    ExecStats             // Execution statistics
    Warning *QueryWarnData        // Warnings (if any)
    QBEvent *QBEvent              // Query builder event metadata
}

type QueryData struct {
    Results []any // Array of result objects (type depends on RequestType)
}

type ExecStats struct {
    RowsScanned   uint64            // Total rows scanned
    BytesScanned  uint64            // Total bytes scanned
    DurationMS    uint64            // Query duration in milliseconds
    StepIntervals map[string]uint64 // Step intervals per query
}
```

---

## Query Types

The API supports multiple query types, each with its own specification format.

### 1. Builder Query (`QueryTypeBuilder`)

Visual query builder queries. Supports traces, logs, and metrics.

**Spec Type**: `QueryBuilderQuery[T]` where T is:
- `TraceAggregation` for traces
- `LogAggregation` for logs
- `MetricAggregation` for metrics

**Example**:
```go
QueryBuilderQuery[TraceAggregation] {
    Name: "query_name",
    Signal: SignalTraces,
    Filter: &Filter {
        Expression: "service.name = 'api' AND duration_nano > 1000000",
    },
    Aggregations: []TraceAggregation {
        {Expression: "count()", Alias: "total"},
        {Expression: "avg(duration_nano)", Alias: "avg_duration"},
    },
    GroupBy: []GroupByKey {...},
    Order: []OrderBy {...},
    Limit: 100,
}
```

**Key Files**:
- Traces: `pkg/telemetrytraces/statement_builder.go`
- Logs: `pkg/telemetrylogs/statement_builder.go`
- Metrics: `pkg/telemetrymetrics/statement_builder.go`

### 2. PromQL Query (`QueryTypePromQL`)

Prometheus Query Language queries for metrics.

**Spec Type**: `PromQuery`

**Example**:
```go
PromQuery {
    Query: "rate(http_requests_total[5m])",
    Step: Step{Duration: time.Minute},
}
```

**Key Files**: `pkg/querier/promql_query.go`

### 3. ClickHouse SQL Query (`QueryTypeClickHouseSQL`)

Direct ClickHouse SQL queries.

**Spec Type**: `ClickHouseQuery`

**Example**:
```go
ClickHouseQuery {
    Query: "SELECT count() FROM signoz_traces.distributed_signoz_index_v3 WHERE ...",
}
```

**Key Files**: `pkg/querier/ch_sql_query.go`

### 4. Formula Query (`QueryTypeFormula`)

Mathematical formulas combining other queries.

**Spec Type**: `QueryBuilderFormula`

**Example**:
```go
QueryBuilderFormula {
    Expression: "A / B * 100", // A and B are query names
}
```

**Key Files**: `pkg/querier/formula_query.go`

### 5. Trace Operator Query (`QueryTypeTraceOperator`)

Set operations on trace queries (AND, OR, NOT).

**Spec Type**: `QueryBuilderTraceOperator`

**Example**:
```go
QueryBuilderTraceOperator {
    Expression: "A AND B", // A and B are query names
    Filter: &Filter {...},
}
```

**Key Files**: 
- `pkg/telemetrytraces/trace_operator_statement_builder.go`
- `pkg/querier/trace_operator_query.go`

---

## Request Types

The `RequestType` determines the format of the response data.

### 1. `RequestTypeTimeSeries`

Returns time series data for charts.

**Response Format**: `TimeSeriesData`

```go
type TimeSeriesData struct {
    QueryName    string
    Aggregations []AggregationBucket
}

type AggregationBucket struct {
    Index  int
    Series []TimeSeries
    Alias  string
    Meta   AggregationMeta
}

type TimeSeries struct {
    Labels map[string]string
    Values []TimeSeriesValue
}

type TimeSeriesValue struct {
    Timestamp int64
    Value     float64
}
```

**Use Case**: Line charts, bar charts, area charts

### 2. `RequestTypeScalar`

Returns a single scalar value.

**Response Format**: `ScalarData`

```go
type ScalarData struct {
    QueryName string
    Data      []ScalarValue
}

type ScalarValue struct {
    Timestamp int64
    Value     float64
}
```

**Use Case**: Single value displays, stat panels

### 3. `RequestTypeRaw`

Returns raw data rows.

**Response Format**: `RawData`

```go
type RawData struct {
    QueryName string
    Columns   []string
    Rows      []RawDataRow
}

type RawDataRow struct {
    Timestamp time.Time
    Data      map[string]any
}
```

**Use Case**: Tables, logs viewer, trace lists

### 4. `RequestTypeTrace`

Returns trace-specific data structure.

**Response Format**: Trace-specific format (see traces documentation)

**Use Case**: Trace-specific visualizations

---

## Code Flow

### Complete Request Flow

```
1. HTTP Request
   POST /api/v5/query_range
   Body: QueryRangeRequest JSON
   ↓
2. HTTP Handler
   QuerierAPI.QueryRange (pkg/querier/querier.go)
   - Validates request
   - Extracts organization ID from auth context
   ↓
3. Querier.QueryRange (pkg/querier/querier.go:122)
   - Validates QueryRangeRequest
   - Processes each query in CompositeQuery.Queries
   - Identifies dependencies (e.g., trace operators, formulas)
   - Calculates step intervals
   - Fetches metric temporality if needed
   ↓
4. Query Creation
   For each QueryEnvelope:
   
   a. Builder Query:
      - newBuilderQuery() creates builderQuery instance
      - Selects appropriate statement builder based on signal:
        * Traces → traceStmtBuilder
        * Logs → logStmtBuilder
        * Metrics → metricStmtBuilder or meterStmtBuilder
      ↓
   
   b. PromQL Query:
      - newPromqlQuery() creates promqlQuery instance
      - Uses Prometheus engine
      ↓
   
   c. ClickHouse SQL Query:
      - newchSQLQuery() creates chSQLQuery instance
      - Direct SQL execution
      ↓
   
   d. Formula Query:
      - newFormulaQuery() creates formulaQuery instance
      - References other queries by name
      ↓
   
   e. Trace Operator Query:
      - newTraceOperatorQuery() creates traceOperatorQuery instance
      - Uses traceOperatorStmtBuilder
      ↓
5. Statement Building (for Builder queries)
   StatementBuilder.Build()
   - Resolves field keys from metadata store
   - Builds SQL based on request type:
     * RequestTypeRaw → buildListQuery()
     * RequestTypeTimeSeries → buildTimeSeriesQuery()
     * RequestTypeScalar → buildScalarQuery()
     * RequestTypeTrace → buildTraceQuery()
   - Returns SQL statement with arguments
   ↓
6. Query Execution
   Query.Execute()
   - Executes SQL/query against ClickHouse or Prometheus
   - Processes results into response format
   - Returns Result with data and statistics
   ↓
7. Caching (if applicable)
   - Checks bucket cache for time series queries
   - Executes queries for missing time ranges
   - Merges cached and fresh results
   ↓
8. Result Processing
   querier.run()
   - Executes all queries (with dependency resolution)
   - Collects results and warnings
   - Merges results from multiple queries
   ↓
9. Post-Processing
   postProcessResults()
   - Applies formulas if present
   - Handles variable substitution
   - Formats results for response
   ↓
10. HTTP Response
    - Returns QueryRangeResponse with results
    - Includes execution statistics
    - Includes warnings if any
```

### Key Decision Points

1. **Query Type Selection**: Based on `QueryEnvelope.Type`
2. **Signal Selection**: For builder queries, based on `Signal` field
3. **Request Type Handling**: Different SQL generation for different request types
4. **Caching Strategy**: Only for time series queries with valid fingerprints
5. **Dependency Resolution**: Trace operators and formulas resolve dependencies first

---

## Key Components

### 1. Querier

**Location**: `pkg/querier/querier.go`

**Purpose**: Orchestrates query execution, caching, and result merging

**Key Methods**:
- `QueryRange()`: Main entry point for query execution
- `run()`: Executes queries and merges results
- `executeWithCache()`: Handles caching logic
- `mergeResults()`: Merges cached and fresh results
- `postProcessResults()`: Applies formulas and variable substitution

**Key Features**:
- Query orchestration across multiple query types
- Intelligent caching with bucket-based strategy
- Result merging from multiple queries
- Formula evaluation
- Time range optimization
- Step interval calculation and validation

### 2. Statement Builder Interface

**Location**: `pkg/types/querybuildertypes/querybuildertypesv5/`

**Purpose**: Converts query builder specifications into executable queries

**Interface**:
```go
type StatementBuilder[T any] interface {
    Build(
        ctx context.Context,
        start uint64,
        end uint64,
        requestType RequestType,
        query QueryBuilderQuery[T],
        variables map[string]VariableItem,
    ) (*Statement, error)
}
```

**Implementations**:
- `traceQueryStatementBuilder` - Traces (`pkg/telemetrytraces/statement_builder.go`)
- `logQueryStatementBuilder` - Logs (`pkg/telemetrylogs/statement_builder.go`)
- `metricQueryStatementBuilder` - Metrics (`pkg/telemetrymetrics/statement_builder.go`)

**Key Features**:
- Field resolution via metadata store
- SQL generation for different request types
- Filter, aggregation, group by, ordering support
- Time range optimization

### 3. Query Interface

**Location**: `pkg/types/querybuildertypes/querybuildertypesv5/`

**Purpose**: Represents an executable query

**Interface**:
```go
type Query interface {
    Execute(ctx context.Context) (*Result, error)
    Fingerprint() string // For caching
    Window() (uint64, uint64) // Time range
}
```

**Implementations**:
- `builderQuery[T]` - Builder queries (`pkg/querier/builder_query.go`)
- `promqlQuery` - PromQL queries (`pkg/querier/promql_query.go`)
- `chSQLQuery` - ClickHouse SQL queries (`pkg/querier/ch_sql_query.go`)
- `formulaQuery` - Formula queries (`pkg/querier/formula_query.go`)
- `traceOperatorQuery` - Trace operator queries (`pkg/querier/trace_operator_query.go`)

### 4. Telemetry Store

**Location**: `pkg/telemetrystore/`

**Purpose**: Abstraction layer for ClickHouse database access

**Key Methods**:
- `Query()`: Execute SQL query
- `QueryRow()`: Execute query returning single row
- `Select()`: Execute query returning multiple rows

**Implementation**: `clickhouseTelemetryStore` (`pkg/telemetrystore/clickhousetelemetrystore/`)

### 5. Metadata Store

**Location**: `pkg/types/telemetrytypes/`

**Purpose**: Provides metadata about available fields, keys, and attributes

**Key Methods**:
- `GetKeysMulti()`: Get field keys for multiple selectors
- `FetchTemporalityMulti()`: Get metric temporality information

**Implementation**: `telemetryMetadataStore` (`pkg/telemetrymetadata/`)

### 6. Bucket Cache

**Location**: `pkg/querier/`

**Purpose**: Caches query results by time buckets for performance

**Key Methods**:
- `GetMissRanges()`: Get time ranges not in cache
- `Put()`: Store query result in cache

**Features**:
- Bucket-based caching (aligned to step intervals)
- Automatic cache invalidation
- Parallel query execution for missing ranges

---

## Query Execution

### Builder Query Execution

**Location**: `pkg/querier/builder_query.go`

**Process**:
1. Statement builder generates SQL
2. SQL executed against ClickHouse via TelemetryStore
3. Results processed based on RequestType:
   - TimeSeries: Grouped by time buckets and labels
   - Scalar: Single value extraction
   - Raw: Row-by-row processing
4. Statistics collected (rows scanned, bytes scanned, duration)

### PromQL Query Execution

**Location**: `pkg/querier/promql_query.go`

**Process**:
1. Query parsed by Prometheus engine
2. Executed against Prometheus-compatible data
3. Results converted to QueryRangeResponse format

### ClickHouse SQL Query Execution

**Location**: `pkg/querier/ch_sql_query.go`

**Process**:
1. SQL query executed directly
2. Results processed based on RequestType
3. Variable substitution applied

### Formula Query Execution

**Location**: `pkg/querier/formula_query.go`

**Process**:
1. Referenced queries executed first
2. Formula expression evaluated using govaluate
3. Results computed from query results

### Trace Operator Query Execution

**Location**: `pkg/querier/trace_operator_query.go`

**Process**:
1. Expression parsed to find dependencies
2. Referenced queries executed
3. Set operations applied (INTERSECT, UNION, EXCEPT)
4. Results combined

---

## Caching

### Caching Strategy

**Location**: `pkg/querier/querier.go:642`

**When Caching Applies**:
- Time series queries only
- Queries with valid fingerprints
- `NoCache` flag not set

**How It Works**:
1. Query fingerprint generated (includes query structure, filters, time range)
2. Cache checked for existing results
3. Missing time ranges identified
4. Queries executed only for missing ranges (parallel execution)
5. Fresh results merged with cached results
6. Merged result stored in cache

### Cache Key Generation

**Location**: `pkg/querier/builder_query.go:52`

The fingerprint includes:
- Signal type
- Source type
- Step interval
- Aggregations
- Filters
- Group by fields
- Time range (for cache key, not fingerprint)

### Cache Benefits

- **Performance**: Avoids re-executing identical queries
- **Efficiency**: Only queries missing time ranges
- **Parallelism**: Multiple missing ranges queried in parallel

---

## Result Processing

### Result Merging

**Location**: `pkg/querier/querier.go:795`

**Process**:
1. Results from multiple queries collected
2. For time series: Series merged by labels
3. For raw data: Rows combined
4. Statistics aggregated (rows scanned, bytes scanned, duration)

### Formula Evaluation

**Location**: `pkg/querier/formula_query.go`

**Process**:
1. Formula expression parsed
2. Referenced query results retrieved
3. Expression evaluated using govaluate library
4. Result computed and formatted

### Variable Substitution

**Location**: `pkg/querier/querier.go`

**Process**:
1. Variables extracted from request
2. Variable values substituted in queries
3. Applied to filters, aggregations, and other query parts

---

## Performance Considerations

### Query Optimization

1. **Time Range Optimization**: 
   - For trace queries with `trace_id` filter, query `trace_summary` first to narrow time range
   - Use appropriate time ranges to limit data scanned

2. **Step Interval Calculation**:
   - Automatic step interval calculation based on time range
   - Minimum step interval enforcement
   - Warnings for suboptimal intervals

3. **Index Usage**:
   - Queries use time bucket columns (`ts_bucket_start`) for efficient filtering
   - Proper filter placement for index utilization

4. **Limit Enforcement**:
   - Raw data queries should include limits
   - Pagination support via offset/cursor

### Best Practices

1. **Use Query Builder**: Prefer query builder over raw SQL for better optimization
2. **Limit Time Ranges**: Always specify reasonable time ranges
3. **Use Aggregations**: For large datasets, use aggregations instead of raw data
4. **Cache Awareness**: Be mindful of cache TTLs when testing
5. **Parallel Queries**: Multiple independent queries execute in parallel
6. **Step Intervals**: Let system calculate optimal step intervals

### Monitoring

Execution statistics are included in response:
- `RowsScanned`: Total rows scanned
- `BytesScanned`: Total bytes scanned
- `DurationMS`: Query execution time
- `StepIntervals`: Step intervals per query

---

## Extending the API

### Adding a New Query Type

1. **Define Query Type** (`pkg/types/querybuildertypes/querybuildertypesv5/query.go`):
```go
const (
    QueryTypeMyNewType QueryType = "my_new_type"
)
```

2. **Define Query Spec**:
```go
type MyNewQuerySpec struct {
    Name string
    // ... your fields
}
```

3. **Update QueryEnvelope Unmarshaling** (`pkg/types/querybuildertypes/querybuildertypesv5/query.go`):
```go
case QueryTypeMyNewType:
    var spec MyNewQuerySpec
    if err := UnmarshalJSONWithContext(shadow.Spec, &spec, "my new query spec"); err != nil {
        return wrapUnmarshalError(err, "invalid my new query spec: %v", err)
    }
    q.Spec = spec
```

4. **Implement Query Interface** (`pkg/querier/my_new_query.go`):
```go
type myNewQuery struct {
    spec MyNewQuerySpec
    // ... other fields
}

func (q *myNewQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
    // Implementation
}

func (q *myNewQuery) Fingerprint() string {
    // Generate fingerprint for caching
}

func (q *myNewQuery) Window() (uint64, uint64) {
    // Return time range
}
```

5. **Update Querier** (`pkg/querier/querier.go`):
```go
case QueryTypeMyNewType:
    myQuery, ok := query.Spec.(MyNewQuerySpec)
    if !ok {
        return nil, errors.NewInvalidInputf(...)
    }
    queries[myQuery.Name] = newMyNewQuery(myQuery, ...)
```

### Adding a New Request Type

1. **Define Request Type** (`pkg/types/querybuildertypes/querybuildertypesv5/req.go`):
```go
const (
    RequestTypeMyNewType RequestType = "my_new_type"
)
```

2. **Update Statement Builders**: Add handling in `Build()` method
3. **Update Query Execution**: Add result processing for new type
4. **Update Response Models**: Add response data structure

### Adding a New Aggregation Function

1. **Update Aggregation Rewriter** (`pkg/querybuilder/agg_expr_rewriter.go`):
```go
func (r *aggExprRewriter) RewriteAggregation(expr string) (string, error) {
    if strings.HasPrefix(expr, "my_function(") {
        // Parse arguments
        // Return ClickHouse SQL expression
        return "myClickHouseFunction(...)", nil
    }
    // ... existing functions
}
```

2. **Update Documentation**: Document the new function

---

## Common Patterns

### Pattern 1: Simple Time Series Query

```go
req := qbtypes.QueryRangeRequest{
    Start:       startMs,
    End:         endMs,
    RequestType: qbtypes.RequestTypeTimeSeries,
    CompositeQuery: qbtypes.CompositeQuery{
        Queries: []qbtypes.QueryEnvelope{
            {
                Type: qbtypes.QueryTypeBuilder,
                Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
                    Name:   "A",
                    Signal: telemetrytypes.SignalMetrics,
                    Aggregations: []qbtypes.MetricAggregation{
                        {Expression: "sum(rate)", Alias: "total"},
                    },
                    StepInterval: qbtypes.Step{Duration: time.Minute},
                },
            },
        },
    },
}
```

### Pattern 2: Query with Filter and Group By

```go
req := qbtypes.QueryRangeRequest{
    Start:       startMs,
    End:         endMs,
    RequestType: qbtypes.RequestTypeTimeSeries,
    CompositeQuery: qbtypes.CompositeQuery{
        Queries: []qbtypes.QueryEnvelope{
            {
                Type: qbtypes.QueryTypeBuilder,
                Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
                    Name:   "A",
                    Signal: telemetrytypes.SignalTraces,
                    Filter: &qbtypes.Filter{
                        Expression: "service.name = 'api' AND duration_nano > 1000000",
                    },
                    Aggregations: []qbtypes.TraceAggregation{
                        {Expression: "count()", Alias: "total"},
                    },
                    GroupBy: []qbtypes.GroupByKey{
                        {TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
                            Name: "service.name",
                            FieldContext: telemetrytypes.FieldContextResource,
                        }},
                    },
                },
            },
        },
    },
}
```

### Pattern 3: Formula Query

```go
req := qbtypes.QueryRangeRequest{
    Start:       startMs,
    End:         endMs,
    RequestType: qbtypes.RequestTypeTimeSeries,
    CompositeQuery: qbtypes.CompositeQuery{
        Queries: []qbtypes.QueryEnvelope{
            {
                Type: qbtypes.QueryTypeBuilder,
                Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
                    Name: "A",
                    // ... query A definition
                },
            },
            {
                Type: qbtypes.QueryTypeBuilder,
                Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
                    Name: "B",
                    // ... query B definition
                },
            },
            {
                Type: qbtypes.QueryTypeFormula,
                Spec: qbtypes.QueryBuilderFormula{
                    Name:       "C",
                    Expression: "A / B * 100",
                },
            },
        },
    },
}
```

---

## Testing

### Unit Tests

- `pkg/querier/querier_test.go` - Querier tests
- `pkg/querier/builder_query_test.go` - Builder query tests
- `pkg/querier/formula_query_test.go` - Formula query tests

### Integration Tests

- `tests/integration/` - End-to-end API tests

### Running Tests

```bash
# Run all querier tests
go test ./pkg/querier/...

# Run with verbose output
go test -v ./pkg/querier/...

# Run specific test
go test -v ./pkg/querier/ -run TestQueryRange
```

---

## Debugging

### Enable Debug Logging

```go
// In querier.go
q.logger.DebugContext(ctx, "Executing query",
    "query", queryName,
    "start", start,
    "end", end)
```

### Common Issues

1. **Query Not Found**: Check query name matches in CompositeQuery
2. **SQL Errors**: Check generated SQL in logs, verify ClickHouse syntax
3. **Performance**: Check execution statistics, optimize time ranges
4. **Cache Issues**: Set `NoCache: true` to bypass cache
5. **Formula Errors**: Check formula expression syntax and referenced query names

---

## References

### Key Files

- `pkg/querier/querier.go` - Main query orchestration
- `pkg/querier/builder_query.go` - Builder query execution
- `pkg/types/querybuildertypes/querybuildertypesv5/` - Request/response models
- `pkg/telemetrystore/` - ClickHouse interface
- `pkg/telemetrymetadata/` - Metadata store

### Signal-Specific Documentation

- [Traces Module](./TRACES_MODULE.md) - Trace-specific details
- Logs module documentation (when available)
- Metrics module documentation (when available)

### Related Documentation

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

## Contributing

When contributing to the Query Range API:

1. **Follow Existing Patterns**: Match the style of existing query types
2. **Add Tests**: Include unit tests for new functionality
3. **Update Documentation**: Update this doc for significant changes
4. **Consider Performance**: Optimize queries and use caching appropriately
5. **Handle Errors**: Provide meaningful error messages

For questions or help, reach out to the maintainers or open an issue.
