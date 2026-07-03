#!/usr/bin/env python3
"""Generate v1 dashboard JSON fixtures for hand-testing the v1->v2 (Perses) migration:
import each into the v1 UI, migrate, compare in the v2 UI. Each file isolates ONE genuine
malformation/legacy shape (see ../../LEGACY_DASHBOARD_HANDLING.md) — a pre-v5 shape the v5
converter does NOT read natively, or structurally corrupt data. Canonical current fields
(read as-is by the converter, e.g. textboxValue, spanGaps) are NOT malformations and are
excluded. Query/widget fixtures are stamped version:"v5" so the v4->v5 SQL migrator skips
them (the mislabeled-v5 case), forcing the pre-v5 bodies through the converter's
normalizePreV5* handlers.

Run from the repo root; every fixture needs an expectedFixtureOutcomes entry in
perses_v1_to_v2_fixtures_test.go. Output: pkg/types/dashboardtypes/testdata/malformed_v1/."""
import json, os

OUT = "pkg/types/dashboardtypes/testdata/malformed_v1"
os.makedirs(OUT, exist_ok=True)

def widget(wid, title, panel, query, **extra):
    w = {
        "id": wid, "title": title, "description": title,
        "panelTypes": panel, "opacity": "1", "nullZeroValues": "zero",
        "timePreferance": "GLOBAL_TIME", "softMin": None, "softMax": None,
        "selectedLogFields": None, "selectedTracesFields": None,
        "query": {"queryType": "builder",
                  "builder": {"queryData": query.get("queryData", []),
                              "queryFormulas": query.get("queryFormulas", [])},
                  "promql": [], "clickhouse_sql": [], "id": wid + "-q"},
    }
    w.update(extra)
    return w

def grid(*ids):
    return [{"i": i, "x": (n % 2) * 6, "y": (n // 2) * 6, "w": 6, "h": 6, "moved": False, "static": False}
            for n, i in enumerate(ids)]

def dash(name, title, widgets, layout, panelMap=None, variables=None, version="v5"):
    d = {"id": name, "uuid": name, "title": title, "description": title, "tags": ["malformed-fixture"],
         "version": version, "widgets": widgets, "layout": layout,
         "panelMap": panelMap or {}, "variables": variables or {}}
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump(d, f, indent=2)
    print("wrote", name + ".json")

# ---- authentic pre-v5 builder-query pieces ----
def metrics_qd(**over):
    q = {"queryName": "A", "expression": "A", "dataSource": "metrics", "disabled": False,
         "legend": "", "stepInterval": 60, "groupBy": [], "orderBy": [],
         "aggregations": [{"metricName": "system.cpu.time", "temporality": "",
                           "timeAggregation": "avg", "spaceAggregation": "sum", "reduceTo": "avg"}],
         "filter": {"expression": ""}, "having": {"expression": ""}, "limit": None, "functions": []}
    q.update(over); return q

def logs_qd(**over):
    q = {"queryName": "A", "expression": "A", "dataSource": "logs", "disabled": False,
         "legend": "", "stepInterval": 60, "groupBy": [], "orderBy": [],
         "aggregations": [{"expression": "count()"}],
         "filter": {"expression": ""}, "having": {"expression": ""}, "limit": None, "functions": []}
    q.update(over); return q

# 01 — having as a v4 array [{columnName,op,value}]
dash("01_having_array", "01 having array (v4)",
     [widget("w1", "having array", "graph",
             {"queryData": [metrics_qd(having=[{"columnName": "A", "op": ">", "value": 100}])]})],
     grid("w1"))

# 02 — filters {items:[...]} with deprecated operators (nin, regex, nlike)
filters = {"op": "AND", "items": [
    {"key": {"key": "service.name", "dataType": "string", "type": "tag"}, "op": "=", "value": "frontend"},
    {"key": {"key": "http.status_code", "dataType": "int64", "type": "tag"}, "op": "nin", "value": [500, 502]},
    {"key": {"key": "http.route", "dataType": "string", "type": "tag"}, "op": "regex", "value": "^/api"},
    {"key": {"key": "body", "dataType": "string", "type": ""}, "op": "nlike", "value": "%health%"},
]}
d = logs_qd(); d.pop("filter"); d["filters"] = filters
dash("02_filters_items_deprecated_ops", "02 filters{items} + deprecated ops",
     [widget("w1", "filters items", "graph", {"queryData": [d]})], grid("w1"))

# 03 — logs aggregations array with messy expressions (inline alias / multi-part / junk / empty)
dash("03_logs_agg_expression_messy", "03 logs agg expression parsing",
     [widget("w1", "messy agg expressions", "graph",
             {"queryData": [logs_qd(aggregations=[
                 {"expression": "count() as 'total'"},
                 {"expression": "sum(bytes), avg(duration_ms)"},
                 {"expression": "p95(duration_ms) ) )"},
                 {"expression": ""},
             ])]})],
     grid("w1"))

# 04 — metric flat v4 aggregation fields (no aggregations[]) -> normalizePreV5MetricAggregations
d = metrics_qd(); d.pop("aggregations")
d.update({"aggregateOperator": "avg",
          "aggregateAttribute": {"key": "system.cpu.time", "dataType": "float64", "type": "", "isColumn": True},
          "timeAggregation": "avg", "spaceAggregation": "sum", "temporality": "", "reduceTo": "avg"})
dash("04_flat_metric_aggregation", "04 flat metric aggregation (v4)",
     [widget("w1", "flat metric agg", "graph", {"queryData": [d]})], grid("w1"))

# 05 — logs flat v4 aggregation fields (no aggregations[]) -> reveals whether logs flat is handled
d = logs_qd(); d.pop("aggregations")
d.update({"aggregateOperator": "count", "aggregateAttribute": {"key": "", "dataType": "", "type": ""}})
dash("05_flat_logs_aggregation", "05 flat logs aggregation (v4)",
     [widget("w1", "flat logs agg", "graph", {"queryData": [d]})], grid("w1"))

# 06 — pageSize (legacy) instead of limit, on a table panel
dash("06_pagesize_to_limit", "06 pageSize -> limit (table)",
     [widget("w1", "pageSize", "table",
             {"queryData": [logs_qd(aggregations=[{"expression": "count()"}], pageSize=25)]})],
     grid("w1"))

# 07 — trace list panel whose selectedTracesFields use the legacy {key,dataType,type} shape
# (+ an empty entry). Dashboard list columns come from the widget-level selectedTracesFields
# (getListColumns reads name ?? key), NOT query.selectColumns; the v1->v2 field-key rename
# (normalizePreV5FieldKeys) maps key->name and mapV1SelectFields drops the empty. Traces analog
# of 08 (logs), exercising the selectedTracesFields fallback branch.
tq = {"queryName": "A", "expression": "A", "dataSource": "traces", "disabled": False,
      "legend": "", "stepInterval": 60, "groupBy": [],
      "orderBy": [{"columnName": "timestamp", "order": "desc"}],
      "aggregations": [], "filter": {"expression": ""}, "having": {"expression": ""},
      "limit": None, "functions": []}
dash("07_trace_list_old_field_keys", "07 trace list selectedTracesFields old {key,...} + empty",
     [widget("w1", "trace list fields", "list", {"queryData": [tq]},
             selectedTracesFields=[
                 {"key": "service.name", "dataType": "string", "type": "resource"},
                 {"key": "http.method", "dataType": "string", "type": "tag"},
                 {"key": "", "dataType": "", "type": ""},
             ])],
     grid("w1"))

# 08 — list panel with selectedLogFields in old {key,dataType,type} shape
dash("08_old_field_keys_list_panel", "08 old field keys (selectedLogFields)",
     [widget("w1", "old field keys", "list",
             {"queryData": [logs_qd(aggregations=[])]},
             selectedLogFields=[{"key": "body", "dataType": "string", "type": ""},
                                {"key": "trace_id", "dataType": "string", "type": ""}])],
     grid("w1"))

# 09 — DYNAMIC variable missing dynamicVariablesAttribute (expected: that variable is
# skipped, the rest of the dashboard still migrates)
variables = {
    "dyn": {"id": "dyn", "order": 0, "type": "DYNAMIC", "name": "node", "description": "",
            "dynamicVariablesSource": "Traces", "sort": "DISABLED", "multiSelect": True, "showALLOption": True},
}
dash("09_variable_dynamic_missing_attribute", "09 DYNAMIC missing dynamicVariablesAttribute",
     [widget("w1", "uses dyn var", "graph", {"queryData": [metrics_qd()]})], grid("w1"), variables=variables)

# 10 — duplicate layout `i` (same widget, two different rectangles)
dash("10_layout_duplicate_i", "10 duplicate layout id",
     [widget("w1", "dup layout", "graph", {"queryData": [metrics_qd()]}),
      widget("w2", "clean", "graph", {"queryData": [metrics_qd()]})],
     [{"i": "w1", "x": 0, "y": 0, "w": 6, "h": 6},
      {"i": "w1", "x": 6, "y": 0, "w": 3, "h": 9},
      {"i": "w2", "x": 0, "y": 6, "w": 6, "h": 6}])

# 11 — orphan layout entries: a deleted widget + react-grid's __dropping-elem__
# placeholder, alongside one real widget. Expect: orphans dropped, real kept.
dash("11_layout_orphan_entries", "11 orphan layout entries (deleted / dropping-elem)",
     [widget("w-real", "real", "graph", {"queryData": [metrics_qd()]})],
     [{"i": "w-real", "x": 0, "y": 0, "w": 6, "h": 6},
      {"i": "w-deleted", "x": 6, "y": 0, "w": 6, "h": 6},
      {"i": "__dropping-elem__", "x": 0, "y": 6, "w": 6, "h": 6}])

# 12 — collapsed section with a ghost child (deleted) + a bare-array panelMap entry
widgets = [
    {"id": "row-1", "panelTypes": "row", "title": "Collapsed section", "description": ""},
    widget("p-1", "in collapsed", "graph", {"queryData": [metrics_qd()]}),
    {"id": "row-2", "panelTypes": "row", "title": "Bare-array section", "description": ""},
    widget("p-2", "in bare-array", "graph", {"queryData": [metrics_qd()]}),
]
layout = [{"i": "row-1", "x": 0, "y": 0, "w": 12, "h": 1},
          {"i": "row-2", "x": 0, "y": 1, "w": 12, "h": 1},
          {"i": "p-2", "x": 0, "y": 2, "w": 6, "h": 6}]
panelMap = {
    "row-1": {"collapsed": True, "widgets": [
        {"i": "p-1", "x": 0, "y": 2, "w": 6, "h": 6},
        {"i": "ghost", "x": 6, "y": 2, "w": 6, "h": 6}]},
    "row-2": ["p-2"],  # non-canonical bare array
}
dash("12_layout_collapsed_ghost_child_bare_panelmap", "12 collapsed ghost child + bare-array panelMap",
     widgets, layout, panelMap=panelMap)

# 13 — an unrenderable widget type (EMPTY_WIDGET) with a layout entry. Expect:
# the unknown panel type records a malformed-field note, so ConvertV1ToV2 rejects
# the WHOLE dashboard (it never reaches the layout's dangling-ref handling).
dash("13_unrenderable_widget_type", "13 unrenderable widget type (whole-dashboard reject)",
     [widget("w-real", "real", "graph", {"queryData": [metrics_qd()]}),
      widget("w-empty", "empty widget", "EMPTY_WIDGET", {"queryData": []})],
     grid("w-real", "w-empty"))

# 14 — overlapping layout rectangles. The v1 UI (react-grid-layout) compacts these on
# load; the converter mirrors that, so migration yields a valid non-overlapping grid.
dash("14_layout_overlapping", "14 overlapping layout rectangles",
     [widget("w1", "a", "graph", {"queryData": [metrics_qd()]}),
      widget("w2", "b", "graph", {"queryData": [metrics_qd()]})],
     [{"i": "w1", "x": 0, "y": 0, "w": 6, "h": 6},
      {"i": "w2", "x": 3, "y": 3, "w": 6, "h": 6}])

print("done")
