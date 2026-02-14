# Feasibility Analysis: Adopting Perses.dev Specification for SigNoz Dashboards

## Executive Summary

SigNoz's dashboard JSON has been a free-form `map[string]interface{}` with no schema enforcement. This document evaluates adopting [Perses.dev](https://perses.dev/) (a CNCF Sandbox project) as a structured dashboard specification. The conclusion is that **wholesale adoption is not recommended**, but several Perses design patterns should be borrowed into a SigNoz-native v6 dashboard schema.

---

## 1. Current State: SigNoz Dashboard JSON

### 1.1 Structure Overview

The dashboard is stored as `StorableDashboardData = map[string]interface{}` in Go (see `pkg/types/dashboardtypes/dashboard.go`). Top-level fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Dashboard display name |
| `description` | `string` | Dashboard description text |
| `tags` | `string[]` | Categorization tags (e.g., `["redis", "database"]`) |
| `image` | `string` | Base64 or URL-encoded SVG for dashboard icon/thumbnail |
| `version` | `string` | Schema version: `"v4"` or `"v5"` |
| `layout` | `Layout[]` | React-grid-layout positioning for each widget |
| `panelMap` | `Record<string, {widgets: Layout[], collapsed: boolean}>` | Groups panels under row widgets for collapsible sections |
| `widgets` | `Widget[]` | Array of panel/widget definitions |
| `variables` | `Record<string, IDashboardVariable>` | Dashboard variable definitions |
| `uploadedGrafana` | `boolean` | Flag indicating if imported from Grafana |

### 1.2 Panel/Widget Types

| Panel Type | Constant | API Request Type |
|-----------|----------|-----------------|
| Time Series | `graph` | `time_series` |
| Bar Chart | `bar` | `time_series` |
| Table | `table` | `scalar` |
| Pie Chart | `pie` | `scalar` |
| Single Value | `value` | `scalar` |
| List/Logs | `list` | `raw` |
| Trace | `trace` | `trace` |
| Histogram | `histogram` | `distribution` |
| Row (group header) | `row` | N/A |

### 1.3 Query System

Each widget carries a `query` object with three modes simultaneously:

```json
{
  "queryType": "builder|clickhouse_sql|promql",
  "builder": {
    "queryData": [],
    "queryFormulas": []
  },
  "clickhouse_sql": [],
  "promql": []
}
```

Only `queryType` determines which mode is active; the other sections carry empty placeholder defaults.

#### Builder Query v4 (legacy, widely used)
- `aggregateOperator` + `aggregateAttribute` as separate fields
- `filters` with structured `items[]` containing key objects with synthetic IDs
- `having: []` as array

#### Builder Query v5 (newer, integration dashboards)
- `aggregations[]` array with `metricName`, `timeAggregation`, `spaceAggregation` combined
- `filter` with expression string (e.g., `"host_name IN $host_name"`)
- `having: {expression: ""}` as object

### 1.4 Query Range V5 API

The V5 execution API wraps queries in a `QueryEnvelope` discriminated union:

```
QueryEnvelope = {type: QueryType, spec: any}
```

Seven query types: `builder_query`, `builder_formula`, `builder_sub_query`, `builder_join`, `builder_trace_operator`, `promql`, `clickhouse_sql`

Six request types: `scalar`, `time_series`, `raw`, `raw_stream`, `trace`, `distribution`

Three signals with distinct aggregation models:
- **Metrics**: `metricName + temporality + timeAggregation + spaceAggregation`
- **Traces**: Expression-based (e.g., `"COUNT()"`, `"p99(duration_nano)"`)
- **Logs**: Expression-based (e.g., `"COUNT()"`, `"count_distinct(host.name)"`)

17 post-processing functions, server-side formula evaluation, SQL-style joins, and trace span relationship operators.

### 1.5 Documented Pain Points

1. **`StorableDashboardData` is `map[string]interface{}`**: All nested property access requires manual type assertions with fragile `ok` checks.

2. **Two incompatible query schema versions coexisting**: v4 and v5 query formats coexist in the same codebase. The backend migration layer (`pkg/transition/migrate_common.go`) converts at execution time.

3. **Massive boilerplate**: Every widget carries `selectedLogFields` and `selectedTracesFields` arrays even for metrics-only panels. Identical 5-element arrays copy-pasted hundreds of times.

4. **Duplicate query slots**: Every widget carries all three query types (`builder`, `clickhouse_sql`, `promql`) with empty placeholders for inactive types.

5. **Variable key inconsistency**: Variables keyed by human-readable name (e.g., `"Account"`) OR UUID depending on dashboard.

6. **Variables coupled to ClickHouse SQL**: Variable queries use raw `SELECT ... FROM signoz_metrics.distributed_time_series_v4_1day`, coupling dashboard definitions to internal storage schema.

7. **Redundant synthetic IDs**: Filter keys contain derived `id` fields like `"cloud_account_id--string--tag--false"`.

8. **Spelling errors baked in**: `"timePreferance"` (misspelled) is embedded in the serialized JSON contract.

9. **Layout/widget coupling implicit**: Layout items reference widgets by matching `i` to `id` with no schema enforcement. `panelMap` adds another implicit layer.

10. **No schema validation**: Dashboard data has no Go struct for validation. Relies entirely on frontend TypeScript types with extensive optional markers.

---

## 2. Perses.dev Specification Overview

### 2.1 What is Perses?

Perses is a CNCF Sandbox project providing:
- An **open dashboard specification** (implemented in Go, CUE, TypeScript)
- A **plugin-based extension model** for panels, queries, datasources, and variables
- **Dashboard-as-Code** via CUE and Go SDKs
- **Static validation** via `percli` CLI
- **Grafana migration** tooling

Adopters: Chronosphere, RedHat, SAP, Amadeus.

### 2.2 Dashboard Structure

```yaml
kind: Dashboard
metadata:
  name: "..."
  project: "..."
spec:
  display: {name, description}
  datasources: {name: DatasourceSpec}    # inline or referenced
  variables: [Variable]                   # ordered list
  panels: {id: Panel}                     # map of panel definitions
  layouts: [Layout]                       # separate from panels
  duration: "5m"
  refreshInterval: "30s"
```

### 2.3 Core Design: Plugin = `{kind: string, spec: any}`

The universal extension point. Panels, queries, datasources, and variables are all plugins:

```go
type Plugin struct {
    Kind     string          `json:"kind"`
    Metadata *PluginMetadata `json:"metadata,omitempty"`
    Spec     any             `json:"spec"`
}
```

### 2.4 Panel Structure

```yaml
kind: Panel
spec:
  display: {name, description}
  plugin: {kind: "TimeSeriesChart", spec: {...}}
  queries:
    - kind: TimeSeriesQuery
      spec:
        plugin:
          kind: PrometheusTimeSeriesQuery
          spec: {query: "up", datasource: "$ds"}
```

### 2.5 Layout System

Panels separated from layout. Grid-based positioning with JSON `$ref` pointers:

```yaml
kind: Grid
spec:
  display:
    title: "Section Name"
    collapse: {open: true}
  items:
    - x: 0, y: 0, width: 6, height: 6
      content: {"$ref": "#/spec/panels/my_panel"}
```

### 2.6 Supported Datasources

| Datasource | Plugin Kind | Protocol |
|---|---|---|
| Prometheus | `PrometheusDatasource` | PromQL |
| Tempo | `TempoDatasource` | TraceQL |
| Loki | `LokiDatasource` | LogQL |
| Pyroscope | `PyroscopeDatasource` | Pyroscope API |
| ClickHouse | Community plugin | SQL |
| VictoriaLogs | Community plugin | VictoriaLogs API |

### 2.7 Plugin System

Five plugin categories: datasource, query, panel, variable, explore. Each distributes as a compressed archive with CUE schemas, React components (via module federation), and optional Grafana migration logic.

---

## 3. Feasibility Assessment

### 3.1 Support for Logs/Metrics/Traces/Events/Profiles

| Signal | Perses Status | SigNoz Requirement | Gap |
|---|---|---|---|
| **Metrics** | Prometheus plugin (mature) | ClickHouse-backed with dual aggregation model (time + space) | **Significant** - Perses assumes PromQL |
| **Traces** | Tempo plugin (exists) | ClickHouse-backed with trace operators, span-level queries, joins | **Significant** - Perses Tempo does basic TraceQL |
| **Logs** | Loki plugin (exists) | ClickHouse-backed with builder queries, raw list views, streaming | **Moderate** - Perses Loki uses LogQL |
| **Profiles** | Pyroscope plugin (exists) | Not yet core in SigNoz dashboards | Low gap |
| **Events** | No plugin | Future SigNoz need | Would require custom plugin |

Perses has plugins for all four pillars, but each assumes a specific backend protocol (PromQL, TraceQL, LogQL). SigNoz uses a **unified query builder** abstracting over ClickHouse. This is a fundamental architectural mismatch.

### 3.2 Extensibility

Perses's plugin architecture is genuinely extensible. SigNoz could create custom plugins (`SigNozDatasource`, `SigNozBuilderQuery`, etc.). However, this means:
- Writing and maintaining a **full Perses plugin ecosystem** for SigNoz
- Plugin must handle all 7 query types and 3 signal types
- CUE schema definitions for all SigNoz query structures
- Tracking Perses upstream changes (still a Sandbox project, not graduated)

### 3.3 Coupling Analysis

| Dimension | Current SigNoz | With Perses | Assessment |
|---|---|---|---|
| Dashboard to Storage | Variables use raw ClickHouse SQL | Would need SigNoz query plugin | Improvement possible |
| Dashboard to Frontend | Widget types tightly coupled to React | Perses separates panel spec from rendering | Improvement |
| Dashboard to Query API | Widgets carry full query objects | Plugin-typed, referenced via datasource | Improvement, but adds indirection |
| Dashboard to Perses | N/A | Depends on Perses versioning, plugin compat, CUE toolchain | **New coupling** |

### 3.4 Support for Query Range V5

This is the **most critical gap**:

| SigNoz V5 Feature | Perses Equivalent | Plugin Solvable? |
|---|---|---|
| `builder_query` with signal-specific aggregation | Plugin `spec: any` | Yes, but SigNoz-specific |
| `builder_formula` (cross-query math) | No formula concept | **Partially** - needs custom panel logic |
| `builder_join` (SQL-style cross-signal joins) | No equivalent | **No** - fundamentally different model |
| `builder_trace_operator` (span relationships) | No equivalent | **No** - unique to SigNoz |
| `builder_sub_query` (nested queries) | No equivalent | Would need plugin extension |
| Multiple query types per panel | Single-typed queries | Would need wrapper plugin |
| Post-processing functions (ewma, anomaly, timeShift) | No equivalent | Would need to be in plugin spec |

---

## 4. Why NOT Adopt Perses Wholesale

### 4.1 SigNoz-inside-Perses

Every SigNoz query feature would live inside `spec: any` blobs within Perses plugin wrappers:

```json
{
  "kind": "TimeSeriesQuery",
  "spec": {
    "plugin": {
      "kind": "SigNozBuilderQuery",
      "spec": { /* ALL SigNoz-specific content here */ }
    }
  }
}
```

Perses validates the envelope (`kind: TimeSeriesQuery` exists, `plugin.kind` is registered). But the actual content is opaque to Perses. You'd still need your own validation for everything inside `spec`.

### 4.2 Formulas, Joins, and Trace Operators Have No Home

Perses model: `Panel -> queries[] -> Query`. Each query is independent.

SigNoz model: `Panel -> compositeQuery -> {queries[], formulas[], joins[], traceOperators[]}`. Queries reference each other by name. Formulas combine results. Joins cross signals.

You'd have to either:
- Shove the entire compositeQuery into a single plugin spec (making Perses query structure meaningless)
- Fork/extend Perses core spec (ongoing merge conflicts)

### 4.3 Plugin Maintenance Burden

Required custom plugins:

| Plugin | Purpose |
|---|---|
| `SigNozDatasource` | Points to SigNoz query-service |
| `SigNozBuilderQuery` | Wraps v5 builder queries for metrics/logs/traces |
| `SigNozFormulaQuery` | Wraps formula evaluation |
| `SigNozTraceOperatorQuery` | Wraps trace structural operators |
| `SigNozJoinQuery` | Wraps cross-signal joins |
| `SigNozSubQuery` | Wraps nested queries |
| `SigNozAttributeValuesVariable` | Variable from attribute values |
| `SigNozQueryVariable` | Variable from query results |

Each needs: CUE schema, React component, Grafana migration handler, and tests. Every v5 feature addition requires plugin schema updates.

### 4.4 Community Mismatch

Perses adopters are primarily Prometheus-centric. A `SigNozDatasource` plugin is useful only to SigNoz. You'd be the sole maintainer of the plugin suite.

### 4.5 The Counterargument

The one strong argument FOR wholesale adoption: **you get out of the "dashboard spec" business entirely**. Even if 80% is SigNoz-specific plugins, the 20% Perses handles (metadata, layout, display, variable ordering, versioning, RBAC scoping) is real work you don't have to maintain. If Perses graduates from CNCF sandbox, ecosystem benefits compound.

This trade-off doesn't justify the ongoing plugin maintenance tax, especially since those patterns are straightforward to implement natively. However, if SigNoz plans to eventually expose PromQL/TraceQL/LogQL-compatible endpoints, the calculus changes significantly.

---

## 5. Recommendation: Borrow Patterns, Build Native

### 5.1 Patterns to Adopt from Perses

| Perses Pattern | SigNoz Adoption |
|---|---|
| **`kind` + `spec` envelope** | Use for query types, panel types, variables. Consistent with v5 `QueryEnvelope`. |
| **Panels separated from Layout** | `panels: {}` map + `layouts: []` referencing by ID. |
| **Ordered variables as array** | Move from `variables: {name: {...}}` to `variables: [...]`. |
| **CUE or JSON Schema validation** | Define formal schema for dashboards. Use for CI and import/export. |
| **Dashboard-as-Code SDK** | Go/TypeScript SDK for programmatic dashboard generation. |
| **Metadata structure** | `kind` + `apiVersion` + `metadata` + `spec` top-level (Kubernetes-style). |

### 5.2 Proposed v6 Dashboard Structure

```json
{
  "kind": "Dashboard",
  "apiVersion": "signoz.io/v1",
  "metadata": {
    "name": "redis-overview",
    "title": "Redis Overview",
    "description": "...",
    "tags": ["redis", "database"],
    "image": "..."
  },
  "spec": {
    "defaults": {
      "timeRange": "5m",
      "refreshInterval": "30s"
    },
    "variables": [
      {
        "kind": "QueryVariable",
        "spec": {
          "name": "host_name",
          "signal": "metrics",
          "attributeName": "host_name",
          "multiSelect": true
        }
      }
    ],
    "panels": {
      "hit_rate": {
        "kind": "TimeSeriesPanel",
        "spec": {
          "title": "Hit Rate",
          "description": "Cache hit rate across hosts",
          "display": {
            "yAxisUnit": "percent",
            "legend": {"position": "bottom"}
          },
          "query": {
            "type": "composite",
            "spec": {
              "queries": [
                {
                  "type": "builder_query",
                  "spec": {
                    "name": "A",
                    "signal": "metrics",
                    "aggregations": [{"metricName": "redis_keyspace_hits", "timeAggregation": "rate", "spaceAggregation": "sum"}],
                    "filter": {"expression": "host_name IN $host_name"}
                  }
                }
              ],
              "formulas": [
                {"type": "builder_formula", "spec": {"expression": "A / (A + B) * 100"}}
              ]
            }
          }
        }
      }
    },
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "title": "Overview",
          "collapsible": true,
          "collapsed": false,
          "items": [
            {"panel": "hit_rate", "x": 0, "y": 0, "w": 6, "h": 6}
          ]
        }
      }
    ]
  }
}
```

### 5.3 Key Improvements Over Current Format

| Issue | Current | v6 |
|---|---|---|
| No validation | `map[string]interface{}` | JSON Schema enforced |
| Boilerplate | Every widget has selectedLogFields, all query modes | Only active query mode stored, display options per panel type |
| Variable ordering | `order` field inside map entries | Array position |
| Variable keys | Name or UUID inconsistently | `name` field in spec, array position |
| Layout coupling | Implicit `i` matches `id` | Explicit `panel` reference in layout items |
| Spelling errors | `timePreferance` | `timePreference` (fixed) |
| Query structure | Flat list of all queries + formulas | Typed envelope matching v5 API |
| Row grouping | Separate `panelMap` with duplicate layout entries | Integrated into `layouts[]` with `collapsible` flag |

### 5.4 Migration Path

1. **v4/v5 to v6 migration**: Build a Go migration function that transforms existing dashboards to v6 format. Handle both v4 and v5 query formats.
2. **Backward compatibility**: Support reading v4/v5 dashboards with automatic upgrade to v6 on save.
3. **Frontend**: Update TypeScript interfaces to match v6 schema. Remove legacy response converters once v5 API is fully adopted.
4. **Validation**: Add JSON Schema validation on dashboard create/update API endpoints.
5. **Integration dashboards**: Regenerate all dashboards in `SigNoz/dashboards` repo using v6 format.

---

## References

- [Perses Homepage](https://perses.dev/)
- [Perses Dashboard API](https://perses.dev/perses/docs/api/dashboard/)
- [Perses Open Specification](https://perses.dev/perses/docs/concepts/open-specification/)
- [Perses Plugin Creation](https://perses.dev/perses/docs/plugins/creation/)
- [Perses Prometheus Plugin Model](https://perses.dev/plugins/docs/prometheus/model/)
- [Perses GitHub Repository](https://github.com/perses/perses)
- [SigNoz Dashboards Repository](https://github.com/SigNoz/dashboards)
- SigNoz source: `pkg/types/dashboardtypes/dashboard.go`
- SigNoz source: `pkg/types/querybuildertypes/querybuildertypesv5/`
- SigNoz source: `frontend/src/types/api/dashboard/getAll.ts`
- SigNoz source: `frontend/src/types/api/queryBuilder/queryBuilderData.ts`
- SigNoz source: `frontend/src/types/api/v5/queryRange.ts`
- SigNoz source: `pkg/transition/migrate_common.go`
