# SigNoz Span Metrics Processor

The `signozspanmetricsprocessor` is an OpenTelemetry Collector processor that intercepts trace data to generate RED metrics (Rate, Errors, Duration) from spans.

**Location:** `signoz-otel-collector/processor/signozspanmetricsprocessor/`

## Trace Interception

The processor implements `consumer.Traces` interface and sits in the traces pipeline:

```go
func (p *processorImp) ConsumeTraces(ctx context.Context, traces ptrace.Traces) error {
    p.lock.Lock()
    p.aggregateMetrics(traces)
    p.lock.Unlock()

    return p.tracesConsumer.ConsumeTraces(ctx, traces)  // forward unchanged
}
```

All traces flow through this method. Metrics are aggregated, then traces are forwarded unmodified to the next consumer.

## Metrics Generated

| Metric | Type | Description |
|--------|------|-------------|
| `signoz_latency` | Histogram | Span latency by service/operation/kind/status |
| `signoz_calls_total` | Counter | Call count per service/operation/kind/status |
| `signoz_db_latency_sum/count` | Counter | DB call latency (spans with `db.system` attribute) |
| `signoz_external_call_latency_sum/count` | Counter | External call latency (client spans with remote address) |

### Dimensions

All metrics include these base dimensions:
- `service.name` - from resource attributes
- `operation` - span name
- `span.kind` - SPAN_KIND_SERVER, SPAN_KIND_CLIENT, etc.
- `status.code` - STATUS_CODE_OK, STATUS_CODE_ERROR, etc.

Additional dimensions can be configured.

## Aggregation Flow

```
traces pipeline
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  ConsumeTraces()                                        │
│      │                                                  │
│      ▼                                                  │
│  aggregateMetrics(traces)                               │
│      │                                                  │
│      ├── for each ResourceSpan                          │
│      │       extract service.name                       │
│      │           │                                      │
│      │           ├── for each Span                      │
│      │           │       │                              │
│      │           │       ▼                              │
│      │           │   aggregateMetricsForSpan()          │
│      │           │       ├── skip stale spans (>24h)    │
│      │           │       ├── skip excluded patterns     │
│      │           │       ├── calculate latency          │
│      │           │       ├── build metric key           │
│      │           │       ├── update histograms          │
│      │           │       └── cache dimensions           │
│      │           │                                      │
│      ▼                                                  │
│  forward traces to next consumer                        │
└─────────────────────────────────────────────────────────┘
```

### Periodic Export

A background goroutine exports aggregated metrics on a ticker interval:

```go
go func() {
    for {
        select {
        case <-p.ticker.C:
            p.exportMetrics(ctx)  // build and send to metrics exporter
        }
    }
}()
```

## Key Design Features

### 1. Time Bucketing (Delta Temporality)

For delta temporality, metric keys include a time bucket prefix:

```go
if p.config.GetAggregationTemporality() == pmetric.AggregationTemporalityDelta {
    p.AddTimeToKeyBuf(span.StartTimestamp().AsTime())  // truncated to interval
}
```

- Spans are grouped by time bucket (default: 1 minute)
- After export, buckets are reset
- Memory-efficient for high-cardinality data

### 2. LRU Dimension Caching

Dimension key-value maps are cached to avoid rebuilding:

```go
if _, has := p.metricKeyToDimensions.Get(k); !has {
    p.metricKeyToDimensions.Add(k, p.buildDimensionKVs(...))
}
```

- Configurable cache size (`DimensionsCacheSize`)
- Evicted keys also removed from histograms

### 3. Cardinality Protection

Prevents memory explosion from high cardinality:

```go
if len(p.serviceToOperations) > p.maxNumberOfServicesToTrack {
    serviceName = "overflow_service"
}
if len(p.serviceToOperations[serviceName]) > p.maxNumberOfOperationsToTrackPerService {
    spanName = "overflow_operation"
}
```

Excess services/operations are aggregated into overflow buckets.

### 4. Exemplars

Trace/span IDs attached to histogram samples for metric-to-trace correlation:

```go
histo.exemplarsData = append(histo.exemplarsData, exemplarData{
    traceID: traceID,
    spanID:  spanID,
    value:   latency,
})
```

Enables "show me a trace that caused this latency spike" in UI.

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `metrics_exporter` | Target exporter for generated metrics | required |
| `latency_histogram_buckets` | Custom histogram bucket boundaries | 2,4,6,8,10,50,100,200,400,800,1000,1400,2000,5000,10000,15000 ms |
| `dimensions` | Additional span/resource attributes to include | [] |
| `dimensions_cache_size` | LRU cache size for dimension maps | 1000 |
| `aggregation_temporality` | cumulative or delta | cumulative |
| `time_bucket_interval` | Bucket interval for delta temporality | 1m |
| `skip_spans_older_than` | Skip stale spans | 24h |
| `max_services_to_track` | Cardinality limit for services | - |
| `max_operations_to_track_per_service` | Cardinality limit for operations | - |
| `exclude_patterns` | Regex patterns to skip spans | [] |

## Pipeline Configuration Example

```yaml
processors:
  signozspanmetrics:
    metrics_exporter: clickhousemetricswrite
    latency_histogram_buckets: [2ms, 4ms, 6ms, 8ms, 10ms, 50ms, 100ms, 200ms]
    dimensions:
      - name: http.method
      - name: http.status_code
    dimensions_cache_size: 10000
    aggregation_temporality: delta

pipelines:
  traces:
    receivers: [otlp]
    processors: [signozspanmetrics, batch]
    exporters: [clickhousetraces]

  metrics:
    receivers: [otlp]
    exporters: [clickhousemetricswrite]
```

The processor sits in the traces pipeline but exports to a metrics pipeline exporter.
