# ClickHouse Traces Query Reference for SigNoz

Source: https://signoz.io/docs/userguide/writing-clickhouse-traces-query/

All tables live in the `signoz_traces` database.

---

## Table Schemas

### distributed_signoz_index_v3 (Primary Spans Table)

The main table for querying span data. 30+ columns following OpenTelemetry conventions.

```sql
(
    `ts_bucket_start` UInt64 CODEC(DoubleDelta, LZ4),
    `resource_fingerprint` String CODEC(ZSTD(1)),
    `timestamp` DateTime64(9) CODEC(DoubleDelta, LZ4),
    `trace_id` FixedString(32) CODEC(ZSTD(1)),
    `span_id` String CODEC(ZSTD(1)),
    `trace_state` String CODEC(ZSTD(1)),
    `parent_span_id` String CODEC(ZSTD(1)),
    `flags` UInt32 CODEC(T64, ZSTD(1)),
    `name` LowCardinality(String) CODEC(ZSTD(1)),
    `kind` Int8 CODEC(T64, ZSTD(1)),
    `kind_string` String CODEC(ZSTD(1)),
    `duration_nano` UInt64 CODEC(T64, ZSTD(1)),
    `status_code` Int16 CODEC(T64, ZSTD(1)),
    `status_message` String CODEC(ZSTD(1)),
    `status_code_string` String CODEC(ZSTD(1)),
    `attributes_string` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    `attributes_number` Map(LowCardinality(String), Float64) CODEC(ZSTD(1)),
    `attributes_bool` Map(LowCardinality(String), Bool) CODEC(ZSTD(1)),
    `resources_string` Map(LowCardinality(String), String) CODEC(ZSTD(1)),  -- deprecated
    `resource` JSON(max_dynamic_paths = 100) CODEC(ZSTD(1)),
    `events` Array(String) CODEC(ZSTD(2)),
    `links` String CODEC(ZSTD(1)),
    `response_status_code` LowCardinality(String) CODEC(ZSTD(1)),
    `external_http_url` LowCardinality(String) CODEC(ZSTD(1)),
    `http_url` LowCardinality(String) CODEC(ZSTD(1)),
    `external_http_method` LowCardinality(String) CODEC(ZSTD(1)),
    `http_method` LowCardinality(String) CODEC(ZSTD(1)),
    `http_host` LowCardinality(String) CODEC(ZSTD(1)),
    `db_name` LowCardinality(String) CODEC(ZSTD(1)),
    `db_operation` LowCardinality(String) CODEC(ZSTD(1)),
    `has_error` Bool CODEC(T64, ZSTD(1)),
    `is_remote` LowCardinality(String) CODEC(ZSTD(1)),
    -- Pre-indexed "selected" columns (use these instead of map access when available):
    `resource_string_service$$name` LowCardinality(String) DEFAULT resources_string['service.name'] CODEC(ZSTD(1)),
    `attribute_string_http$$route` LowCardinality(String) DEFAULT attributes_string['http.route'] CODEC(ZSTD(1)),
    `attribute_string_messaging$$system` LowCardinality(String) DEFAULT attributes_string['messaging.system'] CODEC(ZSTD(1)),
    `attribute_string_messaging$$operation` LowCardinality(String) DEFAULT attributes_string['messaging.operation'] CODEC(ZSTD(1)),
    `attribute_string_db$$system` LowCardinality(String) DEFAULT attributes_string['db.system'] CODEC(ZSTD(1)),
    `attribute_string_rpc$$system` LowCardinality(String) DEFAULT attributes_string['rpc.system'] CODEC(ZSTD(1)),
    `attribute_string_rpc$$service` LowCardinality(String) DEFAULT attributes_string['rpc.service'] CODEC(ZSTD(1)),
    `attribute_string_rpc$$method` LowCardinality(String) DEFAULT attributes_string['rpc.method'] CODEC(ZSTD(1)),
    `attribute_string_peer$$service` LowCardinality(String) DEFAULT attributes_string['peer.service'] CODEC(ZSTD(1))
)
ORDER BY (ts_bucket_start, resource_fingerprint, has_error, name, timestamp)
```

### distributed_traces_v3_resource (Resource Lookup Table)

Used in the resource filter CTE pattern for efficient filtering by resource attributes.

```sql
(
    `labels` String CODEC(ZSTD(5)),
    `fingerprint` String CODEC(ZSTD(1)),
    `seen_at_ts_bucket_start` Int64 CODEC(Delta(8), ZSTD(1))
)
```

### distributed_signoz_error_index_v2 (Error Events)

```sql
(
    `timestamp` DateTime64(9) CODEC(DoubleDelta, LZ4),
    `errorID` FixedString(32) CODEC(ZSTD(1)),
    `groupID` FixedString(32) CODEC(ZSTD(1)),
    `traceID` FixedString(32) CODEC(ZSTD(1)),
    `spanID` String CODEC(ZSTD(1)),
    `serviceName` LowCardinality(String) CODEC(ZSTD(1)),
    `exceptionType` LowCardinality(String) CODEC(ZSTD(1)),
    `exceptionMessage` String CODEC(ZSTD(1)),
    `exceptionStacktrace` String CODEC(ZSTD(1)),
    `exceptionEscaped` Bool CODEC(T64, ZSTD(1)),
    `resourceTagsMap` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    INDEX idx_error_id errorID TYPE bloom_filter GRANULARITY 4,
    INDEX idx_resourceTagsMapKeys mapKeys(resourceTagsMap) TYPE bloom_filter(0.01) GRANULARITY 64,
    INDEX idx_resourceTagsMapValues mapValues(resourceTagsMap) TYPE bloom_filter(0.01) GRANULARITY 64
)
```

### distributed_top_level_operations

```sql
(
    `name` LowCardinality(String) CODEC(ZSTD(1)),
    `serviceName` LowCardinality(String) CODEC(ZSTD(1))
)
```

### distributed_span_attributes_keys

```sql
(
    `tagKey` LowCardinality(String) CODEC(ZSTD(1)),
    `tagType` Enum8('tag' = 1, 'resource' = 2) CODEC(ZSTD(1)),
    `dataType` Enum8('string' = 1, 'bool' = 2, 'float64' = 3) CODEC(ZSTD(1)),
    `isColumn` Bool CODEC(ZSTD(1))
)
```

### distributed_span_attributes

```sql
(
    `timestamp` DateTime CODEC(DoubleDelta, ZSTD(1)),
    `tagKey` LowCardinality(String) CODEC(ZSTD(1)),
    `tagType` Enum8('tag' = 1, 'resource' = 2) CODEC(ZSTD(1)),
    `dataType` Enum8('string' = 1, 'bool' = 2, 'float64' = 3) CODEC(ZSTD(1)),
    `stringTagValue` String CODEC(ZSTD(1)),
    `float64TagValue` Nullable(Float64) CODEC(ZSTD(1)),
    `isColumn` Bool CODEC(ZSTD(1))
)
```

---

## Mandatory Optimization Patterns

### 1. Resource Filter CTE

**Always** use a CTE to pre-filter resource fingerprints when filtering by resource attributes (service.name, environment, etc.). This is the single most impactful optimization.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = 'myservice')
    AND seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT ...
FROM signoz_traces.distributed_signoz_index_v3
WHERE resource_fingerprint GLOBAL IN __resource_filter
    AND ...
```

- Multiple resource filters: chain with AND in the CTE WHERE clause.
- Use `simpleJSONExtractString(labels, '<key>')` to extract resource attribute values.

### 2. Timestamp Bucketing

**Always** include `ts_bucket_start` filter alongside `timestamp` filter. Data is bucketed in 30-minute (1800-second) intervals.

```sql
WHERE timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}}
  AND ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
```

Since the ts_bucket_start is rounded down to 30m, the `- 1800` is required to avoid filtering out the bucket with start timestamp.

### 3. Use Indexed Columns Over Map Access

When a pre-indexed ("selected") column exists, use it instead of map access:

| Instead of | Use |
|---|---|
| `attributes_string['http.route']` | `attribute_string_http$$route` |
| `attributes_string['db.system']` | `attribute_string_db$$system` |
| `attributes_string['rpc.method']` | `attribute_string_rpc$$method` |
| `attributes_string['peer.service']` | `attribute_string_peer$$service` |
| `resources_string['service.name']` | `resource_string_service$$name` |

The naming convention: replace `.` with `$$` in the attribute name and prefix with `attribute_string_`, `attribute_number_`, or `attribute_bool_`.

### 4. Use Pre-extracted Columns

These top-level columns are faster than map access and are derived from different similar attributes:
- `http_method`, `http_url`, `http_host`
- `db_name`, `db_operation`
- `has_error`, `duration_nano`, `name`, `kind`
- `response_status_code`

---

## Attribute Access Syntax

### Resource attributes in SELECT / GROUP BY
```sql
resource.service.name::String
resource.namespace::String
```

### Resource attributes in WHERE (via CTE)
```sql
simpleJSONExtractString(labels, 'service.name') = 'myservice'
```

### Checking attribute existence
```sql
mapContains(attributes_string, 'http.method')
```

---

## Dashboard Panel Query Templates

### Timeseries Panel

Aggregates data over time intervals for chart visualization.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = '{{service}}')
    AND seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts,
    toFloat64(count()) AS value
FROM signoz_traces.distributed_signoz_index_v3
WHERE
    resource_fingerprint GLOBAL IN __resource_filter AND
    timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
    ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
GROUP BY ts
ORDER BY ts ASC;
```

### Value Panel

Returns a single aggregated number. Wrap the timeseries query and reduce with `avg()`, `sum()`, `min()`, `max()`, or `any()`.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = '{{service}}')
    AND seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    avg(value) as value,
    any(ts) as ts
FROM (
    SELECT
        toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts,
        toFloat64(count()) AS value
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE
        resource_fingerprint GLOBAL IN __resource_filter AND
        timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
        ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
    GROUP BY ts
    ORDER BY ts ASC
)
```

### Table Panel

Rows grouped by dimensions. Use `now() as ts` instead of a time interval column.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    now() as ts,
    resource.service.name::String as `service.name`,
    toFloat64(count()) AS value
FROM signoz_traces.distributed_signoz_index_v3
WHERE
    resource_fingerprint GLOBAL IN __resource_filter AND
    timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
    ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp AND
    `service.name` IS NOT NULL
GROUP BY `service.name`, ts
ORDER BY value DESC;
```

---

## Query Examples

### Timeseries — Error spans per service per minute

Shows `has_error` filtering, resource attribute in SELECT, and multi-series grouping.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts,
    resource.service.name::String as `service.name`,
    toFloat64(count()) AS value
FROM signoz_traces.distributed_signoz_index_v3
WHERE
    resource_fingerprint GLOBAL IN __resource_filter AND
    timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
    has_error = true AND
    `service.name` IS NOT NULL AND
    ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
GROUP BY `service.name`, ts
ORDER BY ts ASC;
```

### Value — Average duration of GET requests

Shows the value-panel wrapping pattern (`avg(value)` / `any(ts)`) with a service resource filter.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = 'api-service')
    AND seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    avg(value) as value,
    any(ts) as ts FROM (
        SELECT
            toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts,
            toFloat64(avg(duration_nano)) AS value
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE
            resource_fingerprint GLOBAL IN __resource_filter AND
            timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
            ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp AND
            http_method = 'GET'
        GROUP BY ts
        ORDER BY ts ASC
    )
```

### Table — Average duration by HTTP method

Shows `now() as ts` pattern, pre-extracted column usage, and non-null filtering.

```sql
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = 'api-gateway')
    AND seen_at_ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp
)
SELECT
    now() as ts,
    http_method,
    toFloat64(avg(duration_nano)) AS avg_duration_nano
FROM signoz_traces.distributed_signoz_index_v3
WHERE
    resource_fingerprint GLOBAL IN __resource_filter AND
    timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}} AND
    ts_bucket_start BETWEEN $start_timestamp - 1800 AND $end_timestamp AND
    http_method IS NOT NULL AND http_method != ''
GROUP BY http_method, ts
ORDER BY avg_duration_nano DESC;
```

### Advanced — Extract values from span events

Shows `arrayFilter`/`arrayMap` pattern for querying the `events` JSON array.

```sql
WITH arrayFilter(x -> JSONExtractString(x, 'name')='Getting customer', events) AS filteredEvents
SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS interval,
toFloat64(count()) AS count,
arrayJoin(arrayMap(x -> JSONExtractString(JSONExtractString(x, 'attributeMap'), 'customer_id'), filteredEvents)) AS resultArray
FROM signoz_traces.distributed_signoz_index_v3
WHERE not empty(filteredEvents)
AND timestamp > toUnixTimestamp(now() - INTERVAL 30 MINUTE)
AND ts_bucket_start >= toUInt64(toUnixTimestamp(now() - toIntervalMinute(30))) - 1800
GROUP BY (resultArray, interval) order by (resultArray, interval) ASC;
```

### Advanced — Average latency between two specific spans

Shows cross-span latency calculation using `minIf()` and indexed service columns.

```sql
SELECT
    interval,
    round(avg(time_diff), 2) AS result
FROM
(
    SELECT
        interval,
        traceID,
        if(startTime1 != 0, if(startTime2 != 0, (toUnixTimestamp64Nano(startTime2) - toUnixTimestamp64Nano(startTime1)) / 1000000, nan), nan) AS time_diff
    FROM
    (
        SELECT
            toStartOfInterval(timestamp, toIntervalMinute(1)) AS interval,
            traceID,
            minIf(timestamp, if(resource_string_service$$name='driver', if(name = '/driver.DriverService/FindNearest', if((resources_string['component']) = 'gRPC', true, false), false), false)) AS startTime1,
            minIf(timestamp, if(resource_string_service$$name='route', if(name = 'HTTP GET /route', true, false), false)) AS startTime2
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE (timestamp BETWEEN {{.start_datetime}} AND {{.end_datetime}})
            AND (ts_bucket_start BETWEEN {{.start_timestamp}} - 1800 AND {{.end_timestamp}})
            AND (resource_string_service$$name IN ('driver', 'route'))
        GROUP BY (interval, traceID)
        ORDER BY (interval, traceID) ASC
    )
)
WHERE isNaN(time_diff) = 0
GROUP BY interval
ORDER BY interval ASC;
```

---

## SigNoz Dashboard Variables

These template variables are automatically replaced by SigNoz when the query runs:

| Variable | Description |
|---|---|
| `{{.start_datetime}}` | Start of selected time range (DateTime64) |
| `{{.end_datetime}}` | End of selected time range (DateTime64) |
| `$start_timestamp` | Start as Unix timestamp (seconds) |
| `$end_timestamp` | End as Unix timestamp (seconds) |

---

## Query Optimization Checklist

Before finalizing any query, verify:

- [ ] **Resource filter CTE** is present when filtering by resource attributes (service.name, deployment.environment, etc.)
- [ ] **`ts_bucket_start`** filter is included alongside `timestamp` filter, with `- 1800` on start
- [ ] **`GLOBAL IN`** is used (not just `IN`) for the resource fingerprint subquery
- [ ] **Indexed columns** are used over map access where available (e.g., `attribute_string_http$$route']` over `attributes_string['http.route']`)
- [ ] **Pre-extracted columns** are used where available (`has_error`, `duration_nano`, `http_method`, `db_name`, `http_host`, etc.)
- [ ] **`seen_at_ts_bucket_start`** filter is included in the resource CTE
- [ ] For timeseries: results are ordered by time column ASC
