# RFC: Perses-Native Dashboard Schema for SigNoz

---

## 1. Summary

This RFC proposes adopting the [Perses](https://perses.dev/) (CNCF Sandbox) dashboard specification as the native format for SigNoz dashboards, replacing the current schemaless `map[string]interface{}` storage. SigNoz dashboards will be valid Perses dashboards with SigNoz-specific plugins for datasources, queries, and variables. The Perses structural model (`Plugin` pattern, panel/layout separation, `$ref` pointers) is adopted wholesale; the SigNoz query model (builder queries, formulas, joins, trace operators) lives inside plugin specs.

---

## 2. Motivation

The SigNoz dashboard JSON has grown organically across multiple versions (v3, v4, v5) without a formal schema. The backend stores it as `StorableDashboardData = map[string]interface{}` and the frontend defines partial TypeScript interfaces with nearly every field optional. This has led to:

- **No validation at any layer** - invalid dashboards are only caught when they fail to render
- **Two coexisting query formats** - v4 (`aggregateOperator` + `aggregateAttribute`) and v5 (`aggregations[]` + `filter.expression`) in the same codebase
- **Boilerplate explosion** - every widget carries `selectedLogFields`, `selectedTracesFields`, and all 3 query modes regardless of what it actually uses
- **Implicit coupling** - layout items reference widgets by matching UUID strings with no schema enforcement
- **Maintenance burden** - the `pkg/transition/migrate_common.go` layer converts between formats at runtime using chains of type assertions

The Perses-native schema eliminates these issues by defining a single, validated, forward-looking format.

---

## 3. Goals

### G1: Schema-enforced validation
Every dashboard must pass JSON Schema validation before being stored. Invalid dashboards are rejected at the API layer, not discovered when they fail to render.

### G2: Eliminate boilerplate
Panels carry only the data they need. A metrics time series panel does not carry `selectedLogFields`. A builder query does not carry empty `promql` and `clickhouse_sql` arrays.

### G3: Single query format
Unify on the v5 query model. No more detecting whether a query uses `aggregateOperator` or `aggregations[]`. One format, one code path.

### G4: Full v5 API alignment
The query content inside SigNoz plugin specs mirrors the v5 `QueryRangeRequest` structure. A thin conversion layer translates the Perses `Plugin` envelope to the v5 API request format.

### G5: Extensibility for new signals
Adding events, profiles, or other signals requires only extending the `Signal` enum in the SigNoz plugin CUE schema. No structural changes to the Perses dashboard model.

### G6: Human-readable and diff-friendly
Panels separated from layouts. Consistent naming. No UUIDs as map keys. Meaningful field names (`timePreference`, not `timePreferance`).

### G7: Perses-native from day one
The dashboard JSON is a valid Perses dashboard. `percli lint` validates it. The Perses Go SDK and CUE SDK can generate it. No export/import layer, no second format to maintain. SigNoz is Perses-compatible by default.

---

## 4. Non-Goals

### NG1: Running Perses as the dashboard engine
SigNoz adopts the Perses **dashboard specification** (JSON format, plugin model, validation tooling), NOT the Perses **application** (server, UI, API). SigNoz remains its own dashboard engine. The Perses server is not deployed alongside SigNoz. "Perses-native" means the format is compatible, not that Perses runs SigNoz's dashboards.

### NG2: Backward-compatible field names
We will NOT preserve misspelled or legacy field names (`timePreferance`, `aggregateOperator`, `isJSON`, `isColumn`). The migration will handle this. Clean breaks are better than permanent tech debt.

### NG3: Supporting v4 query format
The v4 query format (`aggregateOperator` + `aggregateAttribute` + structured `filters.items[]`) is not supported in the new schema. The migration converts v4 queries to v5 format. There is no reason to support both going forward.

### NG4: Grafana import compatibility
The dashboard format does not contort itself to accommodate Grafana conventions. Grafana import uses `percli migrate` with SigNoz-specific migration CUE files that convert Grafana panels to SigNoz query plugins, producing valid Perses-native SigNoz dashboards.

### NG5: Frontend rendering logic in the schema
Display defaults, chart rendering behavior, and interactive features (drag-and-drop, live editing) are frontend concerns. The schema defines the data contract, not the rendering behavior.

---

## 5. Design Choices

### 5.1 Perses `kind` + `metadata` + `spec` envelope

**Adopted from**: Perses dashboard model (`pkg/model/api/v1/dashboard.go`).

```json
{
  "kind": "Dashboard",
  "metadata": { "name": "redis-overview", "project": "signoz" },
  "spec": {
    "display": { "name": "Redis Overview" },
    "datasources": {},
    "panels": {},
    "layouts": [],
    "variables": [],
    "duration": "5m"
  }
}
```

**Rationale**: This is the Perses `DashboardSpec` structure. Adopting it directly means `percli lint` validates SigNoz dashboards, the Perses Go/CUE SDK can generate them, and no export/import layer is needed. The `metadata.name` field replaces SigNoz's `id`. Dashboard title and description move into `spec.display`.

**Alternative considered**: Custom envelope with a SigNoz-specific `apiVersion` field that borrows Perses patterns but uses SigNoz field names. Rejected because it creates a second format that requires a conversion layer for Perses compatibility, for no meaningful benefit — the engineering effort is the same either way.

### 5.2 Panels separated from layouts with `$ref` pointers

**Adopted from**: Perses's `panels` map + `layouts` array with JSON `$ref` pointers.

Panels are defined in a `panels: {id: PanelSpec}` map. Layouts reference panels via `$ref`:

```json
{
  "panels": {
    "cpu_usage": {
      "kind": "Panel",
      "spec": {
        "display": { "name": "CPU Usage" },
        "plugin": { "kind": "TimeSeriesChart", "spec": { ... } },
        "queries": [...]
      }
    }
  },
  "layouts": [
    {
      "kind": "Grid",
      "spec": {
        "display": { "title": "Resources" },
        "items": [{ "x": 0, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/cpu_usage" } }]
      }
    }
  ]
}
```

**Rationale**:
- Panels can be reused across layouts (e.g., collapsed vs. expanded views)
- Layout changes don't touch panel definitions and vice versa
- Eliminates the triple-coupling of current `widgets[]` + `layout[]` + `panelMap{}`
- Row grouping becomes a layout concern (Grid with `display.title`), not a panel type
- `$ref` pointers are the Perses convention, enabling `percli` to resolve and validate references

**Alternative considered**: Custom `panelId` string reference. Rejected because it's not Perses-compatible and `$ref` is a well-understood JSON standard.

### 5.3 Perses `Plugin` pattern for queries, panels, datasources, and variables

**Adopted from**: Perses `Plugin` struct (`pkg/model/api/v1/common/plugin.go`).

All extensible types use the Perses `Plugin` discriminated union: `{kind: string, spec: any}`:

```json
{
  "kind": "TimeSeriesQuery",
  "spec": {
    "plugin": {
      "kind": "SigNozCompositeQuery",
      "spec": {
        "queries": [
          { "name": "A", "signal": "metrics", "aggregations": [...] }
        ]
      }
    }
  }
}
```

**Rationale**: The `Plugin` pattern is how Perses supports extensibility. Using `kind` as the discriminator (not `type`) follows the Perses convention. Perses validates the outer structure (`TimeSeriesQuery`), SigNoz's CUE schemas validate the inner `spec`. A thin conversion layer in the SigNoz frontend maps the plugin spec to v5 API request format.

**Alternative considered**: Using `{type, spec}` to match SigNoz's internal v5 `QueryEnvelope` exactly. Rejected because it's not Perses-compatible, and the conversion between `kind` and `type` is trivial.

### 5.4 Perses variable model

**Adopted from**: Perses `Variable` types (`pkg/model/api/v1/dashboard/variable.go`).

Variables use Perses's `ListVariable` and `TextVariable` kinds with SigNoz-specific source plugins:

```json
"variables": [
  {
    "kind": "ListVariable",
    "spec": {
      "name": "host_name",
      "display": { "name": "Host Name" },
      "allowMultiple": true,
      "allowAllValue": true,
      "sort": "alphabetical-asc",
      "plugin": {
        "kind": "SigNozQueryVariable",
        "spec": { "signal": "metrics", "metricName": "redis.cpu.time", "attributeName": "host.name" }
      }
    }
  }
]
```

**Rationale**:
- Variable ordering matters (dependencies, display order) — Perses uses an ordered array
- Eliminates the inconsistency where some dashboards key by name and others by UUID
- Perses provides `ListVariable` (dynamic values from a plugin) and `TextVariable` (user input) — these map directly to SigNoz's `QUERY`/`CUSTOM` and `TEXTBOX` types
- The `plugin` field inside `ListVariable` is where SigNoz-specific variable resolution logic lives

**Alternative considered**: Custom variable types (`type: "QUERY"`, `type: "TEXTBOX"`). Rejected because it's not Perses-compatible and the Perses variable model already provides the needed structure.

### 5.5 Expression-based filters only

Filters use the v5 expression syntax:

```json
"filter": { "expression": "host.name = $host_name AND state != idle" }
```

**Rationale**:
- Eliminates the v4 structured filter format with its synthetic IDs (`"id": "host.name--string--tag--false"`)
- More compact and human-readable
- Already the format used in the v5 API
- No loss of expressiveness - all operators are supported

**Alternative considered**: Keep structured filters with `items[]` for programmatic construction. Rejected because the expression format is already the API format and structured filters can be built client-side from the expression.

### 5.6 No panel-type-specific widget fields at top level

In the current format, every widget has `bucketCount`, `bucketWidth`, `columnUnits`, `selectedLogFields`, `selectedTracesFields`, `stackedBarChart`, etc. regardless of panel type.

In the new schema, panel-specific display options live inside `Panel.spec.plugin.spec`:

```json
{
  "kind": "TimeSeriesPanel",
  "spec": {
    "display": {
      "yAxisUnit": "percentunit",
      "legend": { "position": "bottom" },
      "isStacked": false
    }
  }
}
```

**Rationale**: A value panel does not need `bucketCount`. A metrics graph does not need `selectedLogFields`. Keeping everything flat means every widget carries 30+ fields most of which are irrelevant.

### 5.7 `SigNozCompositeQuery` plugin for formulas, joins, and trace operators

Perses models queries as independent items: `Panel -> queries[] -> Query`, each with one plugin. SigNoz has formulas that reference other queries by name (`A/B`), joins across queries, and trace operators. These don't fit the "independent query" model.

**Solution**: A single `SigNozCompositeQuery` plugin that contains everything:

```json
"queries": [
  {
    "kind": "TimeSeriesQuery",
    "spec": {
      "plugin": {
        "kind": "SigNozCompositeQuery",
        "spec": {
          "queries": [
            { "name": "A", "signal": "metrics", "disabled": true, "aggregations": [...] },
            { "name": "B", "signal": "metrics", "disabled": true, "aggregations": [...] }
          ],
          "formulas": [
            { "name": "F1", "expression": "A/B" }
          ]
        }
      }
    }
  }
]
```

**Rationale**:
- Perses validates the outer envelope (`TimeSeriesQuery`). SigNoz CUE schemas validate the inner composite spec.
- Formulas have a natural home (they reference queries by name)
- No more carrying empty `promql: []` and `clickhouse_sql: []` on every builder panel
- Join and trace operator queries also fit naturally inside the composite
- Trade-off: Perses tools see one "query" per panel. Acceptable because `percli lint` still validates the full structure via CUE, and SigNoz's frontend decomposes it for rendering.

**When formulas are NOT needed** (most common case — single query, no cross-references), each query is a separate entry in `queries[]`:

```json
"queries": [
  {
    "kind": "TimeSeriesQuery",
    "spec": {
      "plugin": {
        "kind": "SigNozBuilderQuery",
        "spec": { "name": "A", "signal": "metrics", "aggregations": [...] }
      }
    }
  }
]
```

### 5.8 Row groups as Perses Grid layouts, not panel types

Current format uses a `"panelTypes": "row"` widget to define row headers. In the Perses model, each `Grid` layout can have a `display.title` and the `open` field controls collapse state:

```json
{
  "kind": "Grid",
  "spec": {
    "display": { "title": "Network", "collapse": { "open": true } },
    "items": [
      { "x": 0, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/network_in" } },
      { "x": 6, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/network_out" } }
    ]
  }
}
```

**Rationale**: Rows are a layout concern, not a content concern. A "row" is not a panel — it has no query, no data, no visualization. Using Perses Grid layouts with display titles eliminates the need for `panelMap` and the duplicated layout entries.

---

## 6. Considerations

### 6.1 Migration strategy

A Go migration function will convert existing dashboards to the Perses-native format:

1. **Structural wrapping**: Flat widgets → Perses `Panel` with `plugin` (e.g., `TimeSeriesChart`), queries wrapped in `{kind: "TimeSeriesQuery", spec: {plugin: {kind: "SigNozBuilderQuery", spec: {...}}}}`.
2. **Query conversion**: v4 `aggregateOperator` + `aggregateAttribute` → v5 `aggregations[]`. The existing `pkg/transition/migrate_common.go` logic already does most of this. Panels with formulas/joins → `SigNozCompositeQuery` plugin.
3. **Filter conversion**: Structured `filters.items[]` → expression string. Each item maps to `key op value` joined by the top-level `op` (AND/OR).
4. **Layout extraction**: Current `layout[]` + `panelMap{}` → Perses `Grid` layouts with `$ref` pointers and `display.title` for row groups.
5. **Variable conversion**: UUID-keyed variables → Perses `ListVariable` with `SigNozQueryVariable` plugin. Raw ClickHouse SQL → builder query where possible.
6. **Datasource injection**: Add `spec.datasources.signoz` with `SigNozDatasource` plugin.
7. **Boilerplate removal**: `selectedLogFields`, `selectedTracesFields`, empty `promql`/`clickhouse_sql` arrays, `timePreferance`, synthetic `id` fields → all dropped.

**Backward compatibility**: The API will accept legacy dashboards and auto-upgrade to the Perses-native format on save. Reading always returns the new format. This is a one-way migration.

### 6.2 Variable query decoupling

Current variables use raw ClickHouse SQL:
```sql
SELECT JSONExtractString(labels, 'host.name') AS `host.name`
FROM signoz_metrics.distributed_time_series_v4_1day
WHERE metric_name = 'system.cpu.time'
GROUP BY `host.name`
```

In the new schema, `ListVariable` uses SigNoz plugin sources (`SigNozQueryVariable` for builder queries, `SigNozAttributeValues` for attribute autocomplete). This decouples variable definitions from the internal storage schema. The builder mode becomes the recommended path, with raw ClickHouse SQL available through a separate plugin if needed.

### 6.3 Dot vs underscore metric naming

The current dashboards repo maintains pairs of files (`overview.json` / `overview_dot.json`) for both naming conventions. The schema does not solve this at the schema level — it remains a content-level concern. However, the expression-based filter format makes it easier to template metric names via variables.

### 6.4 Schema evolution

Schema versioning is managed through the SigNoz plugin CUE schemas, not a top-level `apiVersion` field (Perses does not use `apiVersion`). When the query model evolves:
1. Update the plugin CUE schemas with new fields
2. Add migration code for stored dashboards
3. Old dashboards auto-upgrade on read
4. `percli lint` validates against the updated schemas

### 6.5 Frontend impact

The frontend TypeScript interfaces must be updated to match the Perses dashboard model with SigNoz plugin specs. The Perses structural types (`Dashboard`, `Panel`, `PanelSpec`, `Query`, `Variable`, `Layout`) can be hand-written or generated from the Perses Go model. The SigNoz-specific plugin spec types (`SigNozBuilderQuerySpec`, `SigNozCompositeQuerySpec`, etc.) are generated from the CUE schemas. The existing `convertV5ResponseToLegacy` adapter can be removed once chart components accept v5 response shapes directly.

### 6.6 Performance

The schema validation adds negligible overhead to dashboard create/update operations (sub-millisecond for CUE validation). The elimination of the runtime type-assertion chains in `GetWidgetQuery` is a net performance improvement.

### 6.7 Panels as independent entities ([#4611](https://github.com/SigNoz/signoz/issues/4611))

There is a requirement for panels to be first-class entities that can be moved between dashboards, duplicated, used to create alerts, and referenced from context pages (service pages, span detail pages, correlation views).

The Perses-native format provides the right foundation for this:
- Panels are already self-contained definitions (query + display + title) in `spec.panels`, decoupled from layout
- Copying a panel between dashboards is a JSON operation: extract from one `spec.panels`, insert into another
- The panel definition carries everything needed to render and execute queries

However, the full "panel as entity" feature requires application-level work beyond the schema:

**Panel identity**: Panel keys in `spec.panels` are currently dashboard-scoped (e.g., `"cpu_used"`). For cross-dashboard references (correlation views, "add panel from dashboard X"), panels need a globally unique identifier. Options:
- UUID as the panel key (stable across renames, but less readable)
- Slug key + a separate `metadata.id` UUID inside the panel spec
- Namespaced reference: `{dashboard: "hostmetrics", panel: "cpu_used"}`

**Variable dependency**: A panel referencing `$host_name` only works if the target context has that variable. When moving/copying panels:
- Copy the panel's referenced variables along with it (automatic)
- Resolve variables at copy time (bake in the values)
- Require the target dashboard to define compatible variables (manual)

**Alert creation**: Creating an alert from a panel means extracting the panel's query and converting it to an alert rule. Since the query is already a structured `SigNozBuilderQuery`/`SigNozCompositeQuery` spec, this conversion is straightforward — the alert rule can reference the same query spec directly.

**Panel library**: A future extension could introduce panels as standalone Perses resources (`kind: "Panel"` at the API level, not just embedded in dashboards). Dashboards would reference shared panels via `$ref` pointers to external resources. This is not part of the initial schema but the Perses model's `$ref` pattern naturally supports it.

---

## 7. Transformation Examples

### 7.1 Example A: Redis Overview Dashboard

This example shows the full transformation of the Redis overview dashboard from `SigNoz/dashboards/redis/redis-overview.json`. It demonstrates:
- Variable key normalization (UUID key -> ordered array)
- v4 query to v5 query conversion
- Boilerplate elimination (empty promql/clickhouse_sql, timePreferance)
- Synthetic ID removal
- Layout flattening (no panelMap needed - no rows in this dashboard)

#### Current format (924 lines, showing 2 of 9 widgets):

```json
{
    "id": "redis-overview",
    "description": "This dashboard shows the Redis instance overview...",
    "title": "Redis overview",
    "tags": ["redis", "database"],
    "variables": {
        "94f19b3c-ad9f-4b47-a9b2-f312c09fa965": {
            "allSelected": true,
            "customValue": "",
            "description": "List of hosts sending Redis metrics",
            "id": "94f19b3c-ad9f-4b47-a9b2-f312c09fa965",
            "key": "94f19b3c-ad9f-4b47-a9b2-f312c09fa965",
            "modificationUUID": "4c5b0c03-9cbc-425b-8d8e-7152e5c39ba8",
            "multiSelect": true,
            "name": "host.name",
            "order": 0,
            "queryValue": "SELECT JSONExtractString(labels, 'host.name') AS `host.name`\nFROM signoz_metrics.distributed_time_series_v4_1day\nWHERE metric_name = 'redis.cpu.time'\nGROUP BY `host.name`",
            "selectedValue": [""],
            "showALLOption": true,
            "sort": "ASC",
            "textboxValue": "",
            "type": "QUERY"
        }
    },
    "layout": [
        { "h": 3, "i": "a77227c7-16f5-4353-952e-b183c715a61c", "moved": false, "static": false, "w": 6, "x": 0, "y": 0 },
        { "h": 3, "i": "d4c164bc-8fc2-4dbc-aadd-8d17479ca649", "moved": false, "static": false, "w": 6, "x": 0, "y": 9 }
    ],
    "widgets": [
        {
            "description": "Rate successful lookup of keys in the main dictionary",
            "fillSpans": false,
            "id": "a77227c7-16f5-4353-952e-b183c715a61c",
            "isStacked": false,
            "nullZeroValues": "zero",
            "opacity": "1",
            "panelTypes": "graph",
            "query": {
                "builder": {
                    "queryData": [{
                        "aggregateAttribute": {
                            "dataType": "float64",
                            "id": "redis.keyspace.hits--float64--Sum--true",
                            "isColumn": true,
                            "isJSON": false,
                            "key": "redis.keyspace.hits",
                            "type": "Sum"
                        },
                        "aggregateOperator": "sum_rate",
                        "dataSource": "metrics",
                        "disabled": false,
                        "expression": "A",
                        "filters": {
                            "items": [{
                                "id": "e99669ea",
                                "key": {
                                    "dataType": "string",
                                    "id": "host.name--string--tag--false",
                                    "isColumn": false,
                                    "isJSON": false,
                                    "key": "host.name",
                                    "type": "tag"
                                },
                                "op": "in",
                                "value": ["{{.host.name}}"]
                            }],
                            "op": "AND"
                        },
                        "groupBy": [],
                        "having": [],
                        "legend": "Hit/s across all hosts",
                        "limit": null,
                        "orderBy": [],
                        "queryName": "A",
                        "reduceTo": "sum",
                        "stepInterval": 60
                    }],
                    "queryFormulas": []
                },
                "clickhouse_sql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
                "id": "42c9c117-bfaf-49f7-b528-aad099392295",
                "promql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
                "queryType": "builder"
            },
            "softMax": null,
            "softMin": null,
            "thresholds": [],
            "timePreferance": "GLOBAL_TIME",
            "title": "Hits/s",
            "yAxisUnit": "none"
        },
        {
            "description": "",
            "fillSpans": false,
            "id": "d4c164bc-8fc2-4dbc-aadd-8d17479ca649",
            "isStacked": false,
            "nullZeroValues": "zero",
            "opacity": "1",
            "panelTypes": "graph",
            "query": {
                "builder": {
                    "queryData": [
                        {
                            "aggregateAttribute": { "dataType": "float64", "id": "redis.memory.used--float64--Gauge--true", "isColumn": true, "isJSON": false, "key": "redis.memory.used", "type": "Gauge" },
                            "aggregateOperator": "sum",
                            "dataSource": "metrics",
                            "disabled": false,
                            "expression": "A",
                            "filters": { "items": [{ "id": "394a537e", "key": { "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }, "op": "in", "value": ["{{.host.name}}"] }], "op": "AND" },
                            "groupBy": [{ "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }],
                            "having": [],
                            "legend": "Used::{{host.name}}",
                            "limit": null,
                            "orderBy": [],
                            "queryName": "A",
                            "reduceTo": "sum",
                            "stepInterval": 60
                        },
                        {
                            "aggregateAttribute": { "dataType": "float64", "id": "redis.maxmemory--float64--Gauge--true", "isColumn": true, "isJSON": false, "key": "redis.maxmemory", "type": "Gauge" },
                            "aggregateOperator": "max",
                            "dataSource": "metrics",
                            "disabled": false,
                            "expression": "B",
                            "filters": { "items": [{ "id": "0c0754da", "key": { "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }, "op": "in", "value": ["{{.host.name}}"] }], "op": "AND" },
                            "groupBy": [{ "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }],
                            "having": [],
                            "legend": "Max::{{host.name}}",
                            "limit": null,
                            "orderBy": [],
                            "queryName": "B",
                            "reduceTo": "sum",
                            "stepInterval": 60
                        }
                    ],
                    "queryFormulas": []
                },
                "clickhouse_sql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
                "id": "2f47df76-f09e-4152-8623-971f0fe66bfe",
                "promql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
                "queryType": "builder"
            },
            "softMax": null,
            "softMin": null,
            "thresholds": [],
            "timePreferance": "GLOBAL_TIME",
            "title": "Memory usage",
            "yAxisUnit": "bytes"
        }
    ]
}
```

**Problems visible in this snippet alone:**
- Variable keyed by UUID `94f19b3c-...` instead of name
- Variable query is raw ClickHouse SQL coupled to `signoz_metrics.distributed_time_series_v4_1day`
- `modificationUUID`, `key`, `selectedValue`, `textboxValue`, `customValue` are runtime/UI state, not definition
- Every widget has empty `clickhouse_sql` and `promql` arrays
- Every filter key has synthetic `id` like `"host.name--string--tag--false"`
- `aggregateAttribute` has `isColumn`, `isJSON` internal flags exposed in the dashboard JSON
- `timePreferance` misspelled everywhere
- Widget `opacity: "1"` is a string, should be number

#### Perses-native format (same 2 panels):

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "redis-overview",
    "project": "signoz"
  },
  "spec": {
    "display": {
      "name": "Redis overview",
      "description": "Redis instance overview with latency, hit/miss rate, connections, and memory."
    },
    "duration": "5m",
    "datasources": {
      "signoz": {
        "default": true,
        "plugin": {
          "kind": "SigNozDatasource",
          "spec": { "directUrl": "/api/v5" }
        }
      }
    },
    "variables": [
      {
        "kind": "ListVariable",
        "spec": {
          "name": "host_name",
          "display": {
            "name": "Host Name",
            "description": "List of hosts sending Redis metrics"
          },
          "allowMultiple": true,
          "allowAllValue": true,
          "sort": "alphabetical-asc",
          "plugin": {
            "kind": "SigNozQueryVariable",
            "spec": {
              "signal": "metrics",
              "metricName": "redis.cpu.time",
              "attributeName": "host.name"
            }
          }
        }
      }
    ],
    "panels": {
      "hits_per_sec": {
        "kind": "Panel",
        "spec": {
          "display": {
            "name": "Hits/s",
            "description": "Rate of successful key lookups in the main dictionary"
          },
          "plugin": {
            "kind": "TimeSeriesChart",
            "spec": {
              "yAxis": { "format": { "unit": "decimal" } }
            }
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "plugin": {
                  "kind": "SigNozBuilderQuery",
                  "spec": {
                    "name": "A",
                    "signal": "metrics",
                    "aggregations": [
                      { "metricName": "redis.keyspace.hits", "timeAggregation": "rate", "spaceAggregation": "sum" }
                    ],
                    "filter": { "expression": "host.name IN $host_name" },
                    "legend": "Hit/s across all hosts",
                    "reduceTo": "sum",
                    "stepInterval": 60
                  }
                }
              }
            }
          ]
        }
      },
      "memory_usage": {
        "kind": "Panel",
        "spec": {
          "display": { "name": "Memory usage" },
          "plugin": {
            "kind": "TimeSeriesChart",
            "spec": {
              "yAxis": { "format": { "unit": "bytes" } }
            }
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "plugin": {
                  "kind": "SigNozBuilderQuery",
                  "spec": {
                    "name": "A",
                    "signal": "metrics",
                    "aggregations": [
                      { "metricName": "redis.memory.used", "timeAggregation": "latest", "spaceAggregation": "sum" }
                    ],
                    "filter": { "expression": "host.name IN $host_name" },
                    "groupBy": [{ "name": "host.name" }],
                    "legend": "Used::{{host.name}}",
                    "stepInterval": 60
                  }
                }
              }
            },
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "plugin": {
                  "kind": "SigNozBuilderQuery",
                  "spec": {
                    "name": "B",
                    "signal": "metrics",
                    "aggregations": [
                      { "metricName": "redis.maxmemory", "timeAggregation": "latest", "spaceAggregation": "max" }
                    ],
                    "filter": { "expression": "host.name IN $host_name" },
                    "groupBy": [{ "name": "host.name" }],
                    "legend": "Max::{{host.name}}",
                    "stepInterval": 60
                  }
                }
              }
            }
          ]
        }
      }
    },
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "items": [
            { "x": 0, "y": 0, "width": 6, "height": 3, "content": { "$ref": "#/spec/panels/hits_per_sec" } },
            { "x": 0, "y": 9, "width": 6, "height": 3, "content": { "$ref": "#/spec/panels/memory_usage" } }
          ]
        }
      }
    ]
  }
}
```

**What changed:**

| Aspect | Before | After |
|--------|--------|-------|
| Lines (2 panels) | ~160 | ~100 |
| Top-level structure | Custom `id`, `title`, `tags` | Perses `metadata.name`, `spec.display` |
| Datasource | Implicit | Explicit `SigNozDatasource` plugin |
| Variable key | UUID `94f19b3c-...` | Perses `ListVariable` with `name: "host_name"` |
| Variable query | Raw ClickHouse SQL | `SigNozQueryVariable` plugin |
| Panel wrapper | Custom `kind: "TimeSeriesPanel"` | Perses `kind: "Panel"` + `plugin.kind: "TimeSeriesChart"` |
| Query wrapper | Custom `{type, spec}` | Perses `{kind: "TimeSeriesQuery", spec: {plugin: ...}}` |
| Filter format | Structured with synthetic IDs | Expression string |
| Empty query modes | `promql: [...]`, `clickhouse_sql: [...]` on every widget | Absent |
| Layout references | UUID string matching | JSON `$ref` pointers |
| `timePreferance` | On every widget | Removed (use `spec.duration`) |
| `opacity`, `nullZeroValues`, `fillSpans` | On every widget | Only when non-default |
| Panel ID | UUID | Human-readable slug |
| Perses-compatible | No | Yes — `percli lint` validates it |

---

### 7.2 Example B: Host Metrics Dashboard (with rows, formulas, value panels)

This example shows a more complex dashboard from `SigNoz/dashboards/hostmetrics/hostmetrics.json`. It demonstrates:
- Row widgets + `panelMap` -> `LayoutSection` with `collapsible`
- Formula queries (`A/B` for CPU utilization percentage)
- Value panels (single-stat) with `reduceTo`
- `selectedLogFields` / `selectedTracesFields` boilerplate removal

#### Current format (showing 1 row + 1 value panel with formula, 3156 lines total):

```json
{
  "description": "This dashboard uses the system metrics collected from the hostmetrics receiver...",
  "layout": [
    { "h": 1, "i": "f8abf828-...", "maxH": 1, "minH": 1, "minW": 12, "w": 12, "x": 0, "y": 0 },
    { "h": 3, "i": "b33f0bad-...", "w": 3, "x": 0, "y": 1 },
    { "h": 3, "i": "0ce16128-...", "w": 3, "x": 3, "y": 1 },
    { "h": 3, "i": "6e6f8eea-...", "w": 3, "x": 6, "y": 1 },
    { "h": 3, "i": "622849bd-...", "w": 3, "x": 9, "y": 1 },
    { "h": 1, "i": "f9d3d624-...", "maxH": 1, "minH": 1, "minW": 12, "w": 12, "x": 0, "y": 4 },
    { "h": 6, "i": "5f43aa0f-...", "w": 6, "x": 0, "y": 5 }
  ],
  "panelMap": {
    "f8abf828-...": {
      "collapsed": false,
      "widgets": [
        { "h": 3, "i": "b33f0bad-...", "w": 3, "x": 0, "y": 1 },
        { "h": 3, "i": "0ce16128-...", "w": 3, "x": 3, "y": 1 },
        { "h": 3, "i": "6e6f8eea-...", "w": 3, "x": 6, "y": 1 },
        { "h": 3, "i": "622849bd-...", "w": 3, "x": 9, "y": 1 }
      ]
    },
    "f9d3d624-...": {
      "collapsed": false,
      "widgets": [
        { "h": 6, "i": "5f43aa0f-...", "w": 6, "x": 0, "y": 5 }
      ]
    }
  },
  "variables": {
    "251c0d09-804b-46fa-b3bf-6498251a53b1": {
      "description": "The name of the host machine",
      "id": "251c0d09-804b-46fa-b3bf-6498251a53b1",
      "modificationUUID": "5c32cabe-0ac6-4423-9044-0469199e8d27",
      "multiSelect": false,
      "name": "host.name",
      "order": 1,
      "queryValue": "SELECT JSONExtractString(labels, 'host.name') AS `host.name` FROM signoz_metrics.distributed_time_series_v4_1day WHERE metric_name = 'system.cpu.time' GROUP BY `host.name`",
      "sort": "DISABLED",
      "type": "QUERY"
    }
  },
  "widgets": [
    { "id": "f8abf828-...", "panelTypes": "row", "title": "Overview" },
    {
      "bucketCount": 30,
      "bucketWidth": 0,
      "columnUnits": {},
      "description": "CPU utilization",
      "fillSpans": false,
      "id": "b33f0bad-...",
      "isStacked": false,
      "mergeAllActiveQueries": false,
      "nullZeroValues": "zero",
      "opacity": "1",
      "panelTypes": "value",
      "query": {
        "builder": {
          "queryData": [
            {
              "aggregateAttribute": { "dataType": "float64", "id": "system.cpu.time--float64--Sum--true", "isColumn": true, "isJSON": false, "key": "system.cpu.time", "type": "Sum" },
              "aggregateOperator": "rate",
              "dataSource": "metrics",
              "disabled": true,
              "expression": "A",
              "filters": { "items": [
                { "id": "b36d1580", "key": { "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }, "op": "=", "value": "$host.name" },
                { "id": "04c00b59", "key": { "dataType": "string", "id": "state--string--tag--false", "isColumn": false, "isJSON": false, "key": "state", "type": "tag" }, "op": "!=", "value": "idle" }
              ], "op": "AND" },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "A",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            },
            {
              "aggregateAttribute": { "dataType": "float64", "id": "system.cpu.time--float64--Sum--true", "isColumn": true, "isJSON": false, "key": "system.cpu.time", "type": "Sum" },
              "aggregateOperator": "rate",
              "dataSource": "metrics",
              "disabled": true,
              "expression": "B",
              "filters": { "items": [
                { "id": "9db53117", "key": { "dataType": "string", "id": "host.name--string--tag--false", "isColumn": false, "isJSON": false, "key": "host.name", "type": "tag" }, "op": "=", "value": "$host.name" }
              ], "op": "AND" },
              "functions": [],
              "groupBy": [],
              "having": [],
              "legend": "",
              "limit": null,
              "orderBy": [],
              "queryName": "B",
              "reduceTo": "avg",
              "spaceAggregation": "sum",
              "stepInterval": 60,
              "timeAggregation": "rate"
            }
          ],
          "queryFormulas": [
            { "disabled": false, "expression": "A/B", "legend": "", "queryName": "F1" }
          ]
        },
        "clickhouse_sql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
        "id": "9bcfa405-...",
        "promql": [{ "disabled": false, "legend": "", "name": "A", "query": "" }],
        "queryType": "builder"
      },
      "selectedLogFields": [
        { "dataType": "string", "name": "body", "type": "" },
        { "dataType": "string", "name": "timestamp", "type": "" }
      ],
      "selectedTracesFields": [
        { "dataType": "string", "id": "serviceName--string--tag--true", "isColumn": true, "isJSON": false, "key": "serviceName", "type": "tag" },
        { "dataType": "string", "id": "name--string--tag--true", "isColumn": true, "isJSON": false, "key": "name", "type": "tag" },
        { "dataType": "float64", "id": "durationNano--float64--tag--true", "isColumn": true, "isJSON": false, "key": "durationNano", "type": "tag" },
        { "dataType": "string", "id": "httpMethod--string--tag--true", "isColumn": true, "isJSON": false, "key": "httpMethod", "type": "tag" },
        { "dataType": "string", "id": "responseStatusCode--string--tag--true", "isColumn": true, "isJSON": false, "key": "responseStatusCode", "type": "tag" }
      ],
      "softMax": 0,
      "softMin": 0,
      "stackedBarChart": false,
      "thresholds": [],
      "timePreferance": "GLOBAL_TIME",
      "title": "CPU Used",
      "yAxisUnit": "percentunit"
    }
  ]
}
```

**Problems in this snippet:**
- `panelMap` duplicates layout coordinates from `layout[]` for every row group
- Row widget `f8abf828-...` is a fake "panel" with no query
- `selectedLogFields` (2 items) and `selectedTracesFields` (5 items) appear on every widget - 7 objects x 20+ widgets = 140+ useless objects
- `bucketCount`, `bucketWidth`, `columnUnits`, `stackedBarChart` on a value panel (irrelevant)
- Query A and B are both `disabled: true` because only the formula F1 is active - but they must still carry all fields
- `opacity: "1"` is a string

#### Perses-native format (same content):

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "hostmetrics",
    "project": "signoz"
  },
  "spec": {
    "display": {
      "name": "Host Metrics",
      "description": "System metrics from the hostmetrics receiver: CPU, Memory, Disk, Network and Filesystem usage"
    },
    "duration": "5m",
    "datasources": {
      "signoz": {
        "default": true,
        "plugin": {
          "kind": "SigNozDatasource",
          "spec": { "directUrl": "/api/v5" }
        }
      }
    },
    "variables": [
      {
        "kind": "ListVariable",
        "spec": {
          "name": "host_name",
          "display": { "name": "Host Name", "description": "The name of the host machine" },
          "allowMultiple": false,
          "allowAllValue": false,
          "plugin": {
            "kind": "SigNozQueryVariable",
            "spec": {
              "signal": "metrics",
              "metricName": "system.cpu.time",
              "attributeName": "host.name"
            }
          }
        }
      }
    ],
    "panels": {
      "cpu_used": {
        "kind": "Panel",
        "spec": {
          "display": { "name": "CPU Used", "description": "CPU utilization" },
          "plugin": {
            "kind": "StatChart",
            "spec": { "format": { "unit": "percent" } }
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "plugin": {
                  "kind": "SigNozCompositeQuery",
                  "spec": {
                    "queries": [
                      {
                        "name": "A",
                        "signal": "metrics",
                        "disabled": true,
                        "aggregations": [
                          { "metricName": "system.cpu.time", "timeAggregation": "rate", "spaceAggregation": "sum" }
                        ],
                        "filter": { "expression": "host.name = $host_name AND state != idle" },
                        "reduceTo": "avg",
                        "stepInterval": 60
                      },
                      {
                        "name": "B",
                        "signal": "metrics",
                        "disabled": true,
                        "aggregations": [
                          { "metricName": "system.cpu.time", "timeAggregation": "rate", "spaceAggregation": "sum" }
                        ],
                        "filter": { "expression": "host.name = $host_name" },
                        "reduceTo": "avg",
                        "stepInterval": 60
                      }
                    ],
                    "formulas": [
                      { "name": "F1", "expression": "A/B" }
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      "cpu_usage_graph": {
        "kind": "Panel",
        "spec": {
          "display": { "name": "CPU Usage" },
          "plugin": {
            "kind": "TimeSeriesChart",
            "spec": {
              "yAxis": { "format": { "unit": "percent" } }
            }
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "plugin": {
                  "kind": "SigNozCompositeQuery",
                  "spec": {
                    "queries": [
                      {
                        "name": "A",
                        "signal": "metrics",
                        "disabled": true,
                        "aggregations": [
                          { "metricName": "system.cpu.time", "timeAggregation": "rate", "spaceAggregation": "sum" }
                        ],
                        "filter": { "expression": "host.name = $host_name" },
                        "groupBy": [{ "name": "state" }],
                        "legend": "{{state}}",
                        "reduceTo": "avg",
                        "stepInterval": 60
                      },
                      {
                        "name": "B",
                        "signal": "metrics",
                        "disabled": true,
                        "aggregations": [
                          { "metricName": "system.cpu.time", "timeAggregation": "rate", "spaceAggregation": "sum" }
                        ],
                        "filter": { "expression": "host.name = $host_name" },
                        "legend": "{{state}}",
                        "reduceTo": "avg",
                        "stepInterval": 60
                      }
                    ],
                    "formulas": [
                      { "name": "F1", "expression": "A/B", "legend": "{{state}}" }
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    },
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "display": { "title": "Overview", "collapse": { "open": true } },
          "items": [
            { "x": 0, "y": 0, "width": 3, "height": 3, "content": { "$ref": "#/spec/panels/cpu_used" } },
            { "x": 3, "y": 0, "width": 3, "height": 3, "content": { "$ref": "#/spec/panels/mem_used" } },
            { "x": 6, "y": 0, "width": 3, "height": 3, "content": { "$ref": "#/spec/panels/disk_used" } },
            { "x": 9, "y": 0, "width": 3, "height": 3, "content": { "$ref": "#/spec/panels/net_bytes" } }
          ]
        }
      },
      {
        "kind": "Grid",
        "spec": {
          "display": { "title": "Resources", "collapse": { "open": true } },
          "items": [
            { "x": 0, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/cpu_usage_graph" } },
            { "x": 6, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/mem_usage_graph" } }
          ]
        }
      },
      {
        "kind": "Grid",
        "spec": {
          "display": { "title": "Network", "collapse": { "open": true } },
          "items": [
            { "x": 0, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/net_bytes_in" } },
            { "x": 6, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/net_bytes_out" } }
          ]
        }
      },
      {
        "kind": "Grid",
        "spec": {
          "display": { "title": "Disk", "collapse": { "open": true } },
          "items": [
            { "x": 0, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/disk_read" } },
            { "x": 6, "y": 0, "width": 6, "height": 6, "content": { "$ref": "#/spec/panels/disk_write" } }
          ]
        }
      },
      {
        "kind": "Grid",
        "spec": {
          "display": { "title": "File system", "collapse": { "open": true } },
          "items": [
            { "x": 0, "y": 0, "width": 6, "height": 11, "content": { "$ref": "#/spec/panels/fs_usage" } },
            { "x": 6, "y": 0, "width": 6, "height": 11, "content": { "$ref": "#/spec/panels/fs_inodes" } }
          ]
        }
      }
    ]
  }
}
```

**What changed:**

| Aspect | Before | After |
|--------|--------|-------|
| Row handling | Row widgets in `widgets[]` + `panelMap{}` duplicating layout data | Perses `Grid` with `display.title` and `collapse.open` |
| `panelMap` | Separate structure duplicating layout coordinates | Eliminated entirely |
| Panel wrapper | Custom `kind: "ValuePanel"` | Perses `kind: "Panel"` + `plugin.kind: "StatChart"` |
| Formula queries | Separate `queryData[]` + `queryFormulas[]` | `SigNozCompositeQuery` plugin with `queries[]` + `formulas[]` |
| Layout references | UUID string matching | JSON `$ref` pointers |
| `selectedLogFields` | 2 objects on every widget | Absent |
| `selectedTracesFields` | 5 objects on every widget | Absent |
| `bucketCount`, `bucketWidth`, `columnUnits`, `stackedBarChart` | On value panel (irrelevant) | Absent |
| Total dashboard size | 3,156 lines | ~450 lines (estimated for full dashboard) |
| Size reduction | - | ~85% fewer lines |
| Perses-compatible | No | Yes — `percli lint` validates it |

---

## 8. Appendix: Schema Reference

The dashboard structure follows the Perses `DashboardSpec` model. SigNoz-specific types are defined as Perses plugin CUE schemas in [`signoz-perses-plugins.cue`](./signoz-perses-plugins.cue).

### Perses structural types (from Perses core):

| Category | Types |
|----------|-------|
| **Top-level** | `Dashboard`, `DashboardSpec`, `Display` |
| **Panels** | `Panel`, `PanelSpec`, `PanelDisplay`, `Plugin` |
| **Layout** | `Layout` (Grid kind), `GridLayoutSpec`, `GridItem` |
| **Variables** | `ListVariable`, `TextVariable`, `ListVariableSpec`, `TextVariableSpec` |
| **Queries** | `Query` (TimeSeriesQuery kind), `QuerySpec` |
| **Datasource** | `DatasourceSpec`, `DatasourceSelector` |

### SigNoz plugin types (CUE schemas):

| Category | Plugin kinds |
|----------|-------------|
| **Datasource** | `SigNozDatasource` |
| **Queries** | `SigNozBuilderQuery`, `SigNozCompositeQuery`, `SigNozPromQL`, `SigNozClickHouseSQL` |
| **Variables** | `SigNozQueryVariable`, `SigNozAttributeValues` |
| **Query internals** | `MetricAggregation`, `ExpressionAggregation`, `Filter`, `GroupByKey`, `OrderBy`, `Having`, `PostProcessingFunction` (18 functions), `Signal` (metrics, traces, logs) |

---

## 9. Perses-Native Architecture

### 9.1 What "Perses-native" means for SigNoz

SigNoz adopts the Perses **dashboard specification** as its native storage format. This means:

1. Every SigNoz dashboard is a valid Perses dashboard with SigNoz-specific plugins
2. `percli lint` validates SigNoz dashboards (using SigNoz's CUE schemas)
3. The Perses Go SDK and CUE SDK can generate SigNoz dashboards
4. A Perses instance with SigNoz plugins installed can render SigNoz dashboards

This is **not** the same as "adopting Perses wholesale" (running Perses as SigNoz's dashboard engine). SigNoz remains its own dashboard engine. The Perses server is not deployed alongside SigNoz. What changes is the **JSON format** — it follows the Perses specification with SigNoz-specific plugins instead of a custom schema.

**Why Perses-native from day one?** The engineering effort to build a custom schema vs. a Perses-native schema is essentially the same. The bulk of the work (migration code, frontend updates, backend type changes) is identical. The schema structure itself — whether queries use `{type, spec}` or `{kind, spec}` Plugin wrappers — is a superficial difference. Going Perses-native from day one avoids maintaining two formats and gets the Perses tooling benefits immediately.

### 9.2 What SigNoz needs to build

#### Plugin Module: `signoz-perses-plugins`

A single Perses plugin module (distributed as `.tar.gz`) containing:

```
signoz-perses-plugins/
├── package.json                          # Module metadata
├── cue.mod/
├── schemas/
│   ├── datasources/
│   │   └── SigNozDatasource/
│   │       ├── SigNozDatasource.cue      # CUE schema for datasource config
│   │       └── SigNozDatasource.json     # Example
│   ├── queries/
│   │   ├── SigNozBuilderQuery/
│   │   │   ├── SigNozBuilderQuery.cue    # CUE schema for builder queries
│   │   │   └── SigNozBuilderQuery.json
│   │   ├── SigNozFormula/
│   │   │   ├── SigNozFormula.cue
│   │   │   └── SigNozFormula.json
│   │   ├── SigNozTraceOperator/
│   │   │   ├── SigNozTraceOperator.cue
│   │   │   └── SigNozTraceOperator.json
│   │   └── SigNozJoin/
│   │       ├── SigNozJoin.cue
│   │       └── SigNozJoin.json
│   ├── variables/
│   │   ├── SigNozAttributeValues/
│   │   │   ├── SigNozAttributeValues.cue
│   │   │   └── SigNozAttributeValues.json
│   │   └── SigNozQueryVariable/
│   │       ├── SigNozQueryVariable.cue
│   │       └── SigNozQueryVariable.json
│   └── panels/                           # Can reuse Perses built-in panels
│       └── (optional SigNoz-specific panels)
├── src/                                  # React components (frontend)
│   ├── datasources/SigNozDatasource/
│   ├── queries/SigNozBuilderQuery/
│   └── variables/SigNozAttributeValues/
└── migrate/                              # Optional: Grafana migration logic
    └── (charts, queries, variables folders)
```

#### CUE Schema Example: `SigNozBuilderQuery.cue`

```cue
package model

kind: "SigNozBuilderQuery"

spec: close({
    name:    =~"^[A-Za-z][A-Za-z0-9_]*$"
    signal:  "metrics" | "traces" | "logs"
    disabled?: bool | *false

    // Metrics use structured aggregations
    aggregations?: [...close({
        metricName:       string & !=""
        temporality?:     "delta" | "cumulative" | "unspecified"
        timeAggregation?: "latest" | "sum" | "avg" | "min" | "max" | "count" | "rate" | "increase"
        spaceAggregation?: "sum" | "avg" | "min" | "max" | "count" | "p50" | "p75" | "p90" | "p95" | "p99"
        reduceTo?:        "sum" | "count" | "avg" | "min" | "max" | "last" | "median"
    })]

    // Traces/logs use expression-based aggregations
    expressionAggregations?: [...close({
        expression: string & !=""
        alias?:     string
    })]

    filter?: close({
        expression: string
    })

    groupBy?: [...close({
        name:           string & !=""
        fieldDataType?: string
        fieldContext?:   string
    })]

    legend?:       string
    stepInterval?: number
    limit?:        int & >=0 & <=10000

    functions?: [...close({
        name: "cutOffMin" | "cutOffMax" | "clampMin" | "clampMax" |
              "absolute" | "runningDiff" | "log2" | "log10" |
              "cumulativeSum" | "ewma3" | "ewma5" | "ewma7" |
              "median3" | "median5" | "median7" | "timeShift" |
              "anomaly" | "fillZero"
        args?: [...{value: number | string | bool}]
    })]
})
```

#### CUE Schema Example: `SigNozDatasource.cue`

```cue
package model

kind: "SigNozDatasource"

spec: close({
    proxy?: close({
        kind: "HTTPProxy"
        spec: close({
            url: =~"^https?://"
            allowedEndpoints?: [...close({
                endpointPattern: string
                method:          "GET" | "POST" | "PUT" | "DELETE"
            })]
        })
    })
    directUrl?: =~"^https?://"
})
```

### 9.3 SigNoz plugin types summary

The full transformation examples in Section 7 show what Perses-native SigNoz dashboards look like. The SigNoz-specific plugin types are:

| Plugin kind | Perses wrapper | Purpose |
|-------------|---------------|---------|
| `SigNozDatasource` | `DatasourceSpec.plugin` | Connection to SigNoz query service |
| `SigNozBuilderQuery` | `TimeSeriesQuery.spec.plugin` | Single builder query (metrics/traces/logs) |
| `SigNozCompositeQuery` | `TimeSeriesQuery.spec.plugin` | Multiple queries + formulas/joins/trace operators |
| `SigNozPromQL` | `TimeSeriesQuery.spec.plugin` | Raw PromQL query |
| `SigNozClickHouseSQL` | `TimeSeriesQuery.spec.plugin` | Raw ClickHouse SQL query |
| `SigNozQueryVariable` | `ListVariable.spec.plugin` | Variable values from builder query |
| `SigNozAttributeValues` | `ListVariable.spec.plugin` | Variable values from attribute autocomplete |

Perses built-in panel plugins are reused directly: `TimeSeriesChart`, `BarChart`, `StatChart`, `Table`, `GaugeChart`. SigNoz-specific panel types (trace flamegraph, log list) would be additional panel plugins if needed.

### 9.4 What SigNoz gets from Perses-native

| Benefit | Details |
|---------|---------|
| **`percli lint`** | Validate SigNoz dashboards in CI. Structural validation (Perses core) + query validation (SigNoz CUE schemas). |
| **Dashboard-as-Code** | Use the Perses **Go SDK** to generate dashboards programmatically. The SDK handles the structural boilerplate; SigNoz plugins fill in query content. |
| **CUE SDK** | Define dashboards in CUE with full type-checking. Import SigNoz plugin schemas for local validation without a running server. |
| **GitHub Actions** | Automate dashboard validation and deployment in CI/CD pipelines using Perses-provided actions. |
| **Grafana migration** | Use `percli migrate` with custom migration CUE files that convert Grafana panels to SigNoz query plugins. |
| **CNCF ecosystem** | Recognized as a Perses-compatible tool. Interoperability with other Perses adopters. |
| **Panel reuse** | Reuse Perses built-in panel plugins (TimeSeriesChart, BarChart, StatChart, Table, etc.) instead of building custom rendering. |
| **No export/import layer** | One format. No conversion between "internal" and "Perses-compatible" representations. |

### 9.5 What it costs

| Cost | Details |
|------|---------|
| **Plugin module** | CUE schemas for all SigNoz query types. Must update when query model changes. This replaces (not adds to) the JSON Schema that would be needed for a custom format. |
| **Plugin wrapper verbosity** | Queries are wrapped in `{kind: "TimeSeriesQuery", spec: {plugin: {kind: "SigNozBuilderQuery", spec: {...}}}}`. More nesting than a flat `{type, spec}` but the content is the same. |
| **Perses conventions** | Must follow Perses panel/query/layout structure. Formulas and joins use `SigNozCompositeQuery` (see 9.6). |
| **Upstream tracking** | Perses is a CNCF Sandbox project. Spec may evolve. SigNoz needs to track changes. |
| **CUE toolchain** | Build system needs CUE tooling for schema validation. |
| **React plugin components** | Only needed if dashboards should render in a standalone Perses instance. Not needed for SigNoz's own frontend. |

### 9.6 The formula/join/trace-operator problem (and solution)

Perses models queries as independent items: `Panel -> queries[] -> Query`. Each query has one plugin. There's no built-in concept of formulas that reference other queries.

**Solution**: Model the composite query as a **single query plugin** that contains everything:

```json
{
  "kind": "TimeSeriesQuery",
  "spec": {
    "plugin": {
      "kind": "SigNozCompositeQuery",
      "spec": {
        "queries": [
          { "name": "A", "signal": "metrics", "aggregations": [...], "disabled": true },
          { "name": "B", "signal": "metrics", "aggregations": [...], "disabled": true }
        ],
        "formulas": [
          { "name": "F1", "expression": "A/B" }
        ]
      }
    }
  }
}
```

This puts the entire composite query inside a single Perses query slot. Perses validates the envelope. The SigNoz CUE schema validates the internals. The formula, join, and trace operator semantics are fully preserved.

The trade-off: Perses tools see one "query" per panel rather than individual queries. This is acceptable because:
- `percli lint` still validates the full structure via CUE
- The Dashboard-as-Code SDK works with the composite as a unit
- SigNoz's own frontend decomposes it for rendering

### 9.7 SigNoz Datasource Architecture

A Perses datasource defines **where** to connect and **what endpoints are allowed**. The query plugin's frontend component knows **which endpoint to call** and **what request body to send**. The Perses backend acts as a reverse proxy between the browser and the datasource.

#### How Perses routes requests

```
Browser → POST /api/v1/projects/{project}/proxy/{datasource-name}/{path}
       → Perses Backend matches {path} against allowedEndpoints
       → Reverse proxy to {datasource-url}/{path}
```

For Prometheus, the `PrometheusTimeSeriesQuery` frontend plugin knows to call `/api/v1/query_range`. The datasource just tells it *where* Prometheus is. The endpoint knowledge is hardcoded in the plugin, not configured in the datasource.

#### The SigNoz-specific wrinkle

SigNoz **IS** the backend. In Perses's model, the datasource is always an external system (Prometheus, Tempo, Loki). But SigNoz serves both the dashboard UI and the query API from the same process. This creates two possible architectures:

**Option A: SigNoz as external datasource (Perses-idiomatic)**

Used when a standalone Perses instance connects to SigNoz:

```json
{
  "kind": "SigNozDatasource",
  "spec": {
    "proxy": {
      "kind": "HTTPProxy",
      "spec": {
        "url": "http://signoz-query-service:8080",
        "allowedEndpoints": [
          { "endpointPattern": "/api/v5/query_range", "method": "POST" },
          { "endpointPattern": "/api/v5/substitute_vars", "method": "POST" },
          { "endpointPattern": "/api/v3/autocomplete/attribute_keys", "method": "GET" },
          { "endpointPattern": "/api/v3/autocomplete/attribute_values", "method": "GET" }
        ]
      }
    }
  }
}
```

Flow: `Browser → Perses → (proxy) → SigNoz Query Service`

**Option B: SigNoz as embedded datasource (practical, recommended)**

Used when SigNoz serves its own dashboards (the normal case):

```json
{
  "kind": "SigNozDatasource",
  "spec": {
    "directUrl": "/api/v5"
  }
}
```

Flow: `Browser → SigNoz Backend (same process, no proxy)`

The frontend calls SigNoz's API endpoints directly. The proxy is unnecessary overhead when the dashboard server and query engine are the same process.

#### How the query plugin knows which endpoint

The endpoint mapping is **hardcoded in the query plugin's frontend code**, determined by context:

| Operation | Endpoint | Decision factor |
|-----------|----------|----------------|
| Time series query | `POST /api/v5/query_range` (`requestType: "time_series"`) | Panel type is `graph` or `bar` |
| Scalar query | `POST /api/v5/query_range` (`requestType: "scalar"`) | Panel type is `value`, `table`, or `pie` |
| Raw logs/traces | `POST /api/v5/query_range` (`requestType: "raw"`) | Panel type is `list` |
| Trace query | `POST /api/v5/query_range` (`requestType: "trace"`) | Panel type is `trace` |
| Distribution | `POST /api/v5/query_range` (`requestType: "distribution"`) | Panel type is `histogram` |
| Variable values | `POST /api/v5/query_range` (`requestType: "scalar"`) | Variable type is `QUERY` |
| Attribute keys | `GET /api/v3/autocomplete/attribute_keys` | Builder UI autocomplete |
| Attribute values | `GET /api/v3/autocomplete/attribute_values` | Builder UI autocomplete |

Key insight: SigNoz uses a single endpoint (`/api/v5/query_range`) for all query operations. What varies is the `requestType` and query content in the body. This is simpler than Prometheus (which has separate `/query`, `/query_range`, `/labels`, `/series` endpoints).

#### Why Option B is recommended

1. SigNoz is typically a single deployment — there's no separate datasource server to proxy to
2. The proxy adds latency for zero security benefit (same backend)
3. The frontend already calls `/api/v5/query_range` directly today
4. The datasource *abstraction* is still valuable for:
   - Perses-compatible export format (datasource is a required Perses concept)
   - Multi-instance SigNoz setups (one SigNoz querying another)
   - Federated dashboards across SigNoz installations

### 9.8 Implementation plan

**Phase 1: Perses-native storage format**
- Define SigNoz plugin CUE schemas (`SigNozBuilderQuery`, `SigNozCompositeQuery`, `SigNozDatasource`, `SigNozQueryVariable`, etc.)
- Implement Go structs for the Perses dashboard model with SigNoz plugins (can import `github.com/perses/perses/pkg/model/api/v1` directly)
- Build migration code: current schemaless format → Perses-native format
- Update frontend TypeScript types to match the Perses panel/query/variable structure
- Add `percli lint` to CI

**Phase 2: Plugin module distribution**
- Package CUE schemas as a `signoz-perses-plugins` module
- Build React plugin components for standalone Perses rendering (optional — only if there's demand)
- Build `percli migrate` CUE files for Grafana → SigNoz conversion

**Phase 3: Dashboard-as-Code**
- Use the Perses Go SDK to generate SigNoz dashboards programmatically
- Provide CUE SDK examples for SigNoz dashboard authoring
- GitHub Actions for dashboard validation and deployment

---

## 10. Open Questions

1. **Variable name restrictions**: Should variable names allow dots (e.g., `host.name`) or should migration normalize to underscores (`host_name`)? Dots conflict with template syntax (`$host.name` is ambiguous — is it variable `host` with field `name`, or variable `host.name`?). Perses uses `spec.name` for variable identity, which avoids the key-format problem, but the template substitution syntax still needs a decision.

2. **Layout coordinate system**: Should the new schema use the same 12-column grid as current react-grid-layout, or adopt the Perses Grid coordinate system? Perses uses `width`/`height` (not `w`/`h`), but the column count and coordinate model should be verified for compatibility with SigNoz's existing frontend grid library.

3. **Panel ID format**: Should panel IDs (keys in `spec.panels`) be UUIDs (stable across renames) or human-readable slugs (better for diffs/DaC)? The RFC proposes slugs but existing dashboards use UUIDs. Perses uses `metadata.name` which is typically a slug.

4. **Migration rollout**: Should migration be one-shot (all dashboards upgraded at deploy time) or lazy (upgraded on first access/save)?

5. **ClickHouse SQL in variables**: Should `SigNozQueryVariable` support raw ClickHouse SQL as a fallback, or only builder queries? The builder mode is recommended but may not cover all current variable queries. A `SigNozClickHouseSQLVariable` plugin could be added for advanced users.

6. **SigNozCompositeQuery vs individual queries**: The RFC uses `SigNozCompositeQuery` for panels with formulas/joins and `SigNozBuilderQuery` for single-query panels. Should all panels use `SigNozCompositeQuery` for consistency, or is the split approach better for simplicity in the common case?

7. **Perses Go model dependency**: Should SigNoz import `github.com/perses/perses/pkg/model/api/v1` directly, or redefine compatible Go structs locally? Importing gives automatic compatibility but adds a dependency. Local structs give more control but may drift.

8. **Perses panel plugin mapping**: The RFC maps SigNoz panel types to Perses built-in panel plugins (`graph` → `TimeSeriesChart`, `value` → `StatChart`, `table` → `Table`). Should SigNoz panels like `list` (log list) and `trace` (flamegraph) be custom SigNoz panel plugins, or should they map to a generic Perses panel type?

9. **Panel as entity identity model** ([#4611](https://github.com/SigNoz/signoz/issues/4611)): For cross-dashboard panel references (correlation views, "add panel from another dashboard"), panels need globally unique identity. Should this be solved at the schema level (UUID panel keys, external `$ref` pointers) or at the application level (panel library API that stores panels independently and dashboards embed copies)?
