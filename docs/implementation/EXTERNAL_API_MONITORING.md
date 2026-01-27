# External API Monitoring - Developer Guide

## Overview

External API Monitoring tracks outbound HTTP calls from your services to external APIs. It groups spans by domain (e.g., `api.example.com`) and displays metrics like endpoint count, request rate, error rate, latency, and last seen time.

**Key Requirement**: Spans must have `kind_string = 'Client'` and either `http.url`/`url.full` AND `net.peer.name`/`server.address` attributes.

---

## Architecture Flow

```
Frontend (DomainList) 
  → useListOverview hook
  → POST /api/v1/third-party-apis/overview/list
  → getDomainList handler
  → BuildDomainList (7 queries)
  → QueryRange (ClickHouse)
  → Post-processing (merge semconv, filter IPs)
  → formatDataForTable
  → UI Display
```

---

## Key APIs

### 1. Domain List API

**Endpoint**: `POST /api/v1/third-party-apis/overview/list`

**Request**:
```json
{
  "start": 1699123456789,      // Unix timestamp (ms)
  "end": 1699127056789,
  "show_ip": false,             // Filter IP addresses
  "filter": {
    "expression": "kind_string = 'Client' AND service.name = 'api'"
  }
}
```

**Response**: Table with columns:
- `net.peer.name` (domain name)
- `endpoints` (count_distinct with fallback: http.url or url.full)
- `rps` (rate())
- `error_rate` (formula: error/total_span * 100)
- `p99` (p99(duration_nano))
- `lastseen` (max(timestamp))

**Handler**: `pkg/query-service/app/http_handler.go::getDomainList()`

---

### 2. Domain Info API

**Endpoint**: `POST /api/v1/third-party-apis/overview/domain`

**Request**: Same as Domain List, but includes `domain` field

**Response**: Endpoint-level metrics for a specific domain

**Handler**: `pkg/query-service/app/http_handler.go::getDomainInfo()`

---

## Query Building

### Location
`pkg/modules/thirdpartyapi/translator.go`

### BuildDomainList() - Creates 7 Sub-queries

1. **endpoints**: `count_distinct(if(http.url exists, http.url, url.full))` - Unique endpoint count (handles both semconv attributes)
2. **lastseen**: `max(timestamp)` - Last access time
3. **rps**: `rate()` - Requests per second
4. **error**: `count() WHERE has_error = true` - Error count
5. **total_span**: `count()` - Total spans (for error rate)
6. **p99**: `p99(duration_nano)` - 99th percentile latency
7. **error_rate**: Formula `(error/total_span)*100`

### Base Filter
```go
"(http.url EXISTS OR url.full EXISTS) AND kind_string = 'Client'"
```

### GroupBy
- Groups by `server.address` + `net.peer.name` (dual semconv support)

---

## Key Files

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/container/ApiMonitoring/Explorer/Domains/DomainList.tsx` | Main list view component |
| `frontend/src/container/ApiMonitoring/Explorer/Domains/DomainDetails/DomainDetails.tsx` | Domain details drawer |
| `frontend/src/hooks/thirdPartyApis/useListOverview.ts` | Data fetching hook |
| `frontend/src/api/thirdPartyApis/listOverview.ts` | API client |
| `frontend/src/container/ApiMonitoring/utils.tsx` | Utilities (formatting, query building) |

### Backend

| File | Purpose |
|------|---------|
| `pkg/query-service/app/http_handler.go` | API handlers (`getDomainList`, `getDomainInfo`) |
| `pkg/modules/thirdpartyapi/translator.go` | Query builder & response processing |
| `pkg/types/thirdpartyapitypes/thirdpartyapi.go` | Request/response types |

---

## Data Tables

### Primary Table
- **Table**: `signoz_traces.distributed_signoz_index_v3`
- **Key Columns**:
  - `kind_string` - Filter for `'Client'` spans
  - `duration_nano` - For latency calculations
  - `has_error` - For error rate
  - `timestamp` - For last seen
  - `attributes_string` - Map containing `http.url`, `net.peer.name`, etc.
  - `resources_string` - Map containing `server.address`, `service.name`, etc.

### Attribute Access
```sql
-- Check existence
mapContains(attributes_string, 'http.url') = 1

-- Get value
attributes_string['http.url']

-- Materialized (if exists)
attribute_string_http$$url
```

---

## Post-Processing

### 1. MergeSemconvColumns()
- Merges `server.address` and `net.peer.name` into single column
- Location: `pkg/modules/thirdpartyapi/translator.go:117`

### 2. FilterIntermediateColumns()
- Removes intermediate formula columns from response
- Location: `pkg/modules/thirdpartyapi/translator.go:70`

### 3. FilterResponse()
- Filters out IP addresses if `show_ip = false`
- Uses `net.ParseIP()` to detect IPs
- Location: `pkg/modules/thirdpartyapi/translator.go:214`

---

## Required Attributes

### For Domain Grouping
- `net.peer.name` OR `server.address` (required)

### For Filtering
- `http.url` OR `url.full` (required)
- `kind_string = 'Client'` (required)

### Not Required
- `http.target` - Not used in external API monitoring

### Known Bug
The `buildEndpointsQuery()` uses `count_distinct(http.url)` but filter allows `url.full`. If spans only have `url.full`, they pass filter but don't contribute to endpoint count.

**Fix Needed**: Update aggregation to handle both attributes:
```go
// Current (buggy)
{Expression: "count_distinct(http.url)"}

// Should be
{Expression: "count_distinct(coalesce(http.url, url.full))"}
```

---

## Frontend Data Flow

### 1. Domain List View
```
DomainList component
  → useListOverview({ start, end, show_ip, filter })
  → listOverview API call
  → formatDataForTable(response)
  → Table display
```

### 2. Domain Details View
```
User clicks domain
  → DomainDetails drawer opens
  → Multiple queries:
    - DomainMetrics (overview cards)
    - AllEndpoints (endpoint table)
    - TopErrors (error table)
    - EndPointDetails (when endpoint selected)
```

### 3. Data Formatting
- `formatDataForTable()` - Converts API response to table format
- Handles `n/a` values, converts nanoseconds to milliseconds
- Maps column names to display fields

---

## Query Examples

### Domain List Query
```sql
SELECT 
  multiIf(
    mapContains(attributes_string, 'server.address'),
    attributes_string['server.address'],
    mapContains(attributes_string, 'net.peer.name'),
    attributes_string['net.peer.name'],
    NULL
  ) AS domain,
  count_distinct(attributes_string['http.url']) AS endpoints,
  rate() AS rps,
  p99(duration_nano) AS p99,
  max(timestamp) AS lastseen
FROM signoz_traces.distributed_signoz_index_v3
WHERE 
  (mapContains(attributes_string, 'http.url') = 1 
   OR mapContains(attributes_string, 'url.full') = 1)
  AND kind_string = 'Client'
  AND timestamp >= ? AND timestamp < ?
GROUP BY domain
```

---

## Testing

### Key Test Files
- `frontend/src/container/ApiMonitoring/__tests__/AllEndpointsWidgetV5Migration.test.tsx`
- `frontend/src/container/ApiMonitoring/__tests__/EndpointDropdownV5Migration.test.tsx`
- `pkg/modules/thirdpartyapi/translator_test.go`

### Test Scenarios
1. Domain filtering with both semconv attributes
2. URL handling (http.url vs url.full)
3. IP address filtering
4. Error rate calculation
5. Empty state handling

---

## Common Issues

### Empty State
**Symptom**: No domains shown despite data existing

**Causes**:
1. Missing `net.peer.name` or `server.address`
2. Missing `http.url` or `url.full`
3. Spans not marked as `kind_string = 'Client'`
4. Bug: Only `url.full` present but query uses `count_distinct(http.url)`

### Performance
- Queries use `ts_bucket_start` for time partitioning
- Resource filtering uses separate `distributed_traces_v3_resource` table
- Materialized columns improve performance for common attributes

---

## Quick Start Checklist

- [ ] Understand trace table schema (`signoz_index_v3`)
- [ ] Review `BuildDomainList()` in `translator.go`
- [ ] Check `getDomainList()` handler in `http_handler.go`
- [ ] Review frontend `DomainList.tsx` component
- [ ] Understand semconv attribute mapping (legacy vs current)
- [ ] Test with spans that have required attributes
- [ ] Review post-processing functions (merge, filter)

---

## References

- **Trace Schema**: `pkg/telemetrytraces/field_mapper.go`
- **Query Builder**: `pkg/telemetrytraces/statement_builder.go`
- **API Routes**: `pkg/query-service/app/http_handler.go:2157`
- **Constants**: `pkg/modules/thirdpartyapi/translator.go:14-20`
