package dashboardtypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// basePostableJSON is the postable shape of a small but realistic v2
// dashboard used as the base document for patch tests. Each panel carries
// one builder query in the same shape production dashboards use
// (aggregations, filter, groupBy populated), and the dashboard has one
// variable — the variable is not patched in any test here, that's
// covered in a separate variable-focused suite.
const basePostableJSON = `{
	"schemaVersion": "v6",
	"name": "service-overview",
	"tags": [{"key": "team", "value": "alpha"}, {"key": "env", "value": "prod"}],
	"spec": {
		"display": {"name": "Service overview"},
		"variables": [
			{
				"kind": "ListVariable",
				"spec": {
					"name": "service",
					"allowAllValue": true,
					"allowMultiple": false,
					"plugin": {
						"kind": "signoz/DynamicVariable",
						"spec": {"name": "service.name", "signal": "metrics"}
					}
				}
			}
		],
		"panels": {
			"p1": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
					"queries": [
						{
							"kind": "time_series",
							"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
								"name": "A",
								"signal": "metrics",
								"aggregations": [{
									"metricName": "signoz_calls_total",
									"temporality": "cumulative",
									"timeAggregation": "rate",
									"spaceAggregation": "sum"
								}],
								"filter": {"expression": "service.name IN $service"},
								"groupBy": [{"name": "service.name", "fieldDataType": "string", "fieldContext": "tag"}]
							}}}
						}
					]
				}
			},
			"p2": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/NumberPanel", "spec": {}},
					"queries": [
						{
							"kind": "time_series",
							"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
								"name": "X",
								"signal": "metrics",
								"aggregations": [{
									"metricName": "signoz_latency_count",
									"temporality": "cumulative",
									"timeAggregation": "rate",
									"spaceAggregation": "sum"
								}]
							}}}
						}
					]
				}
			}
		},
		"layouts": [
			{
				"kind": "Grid",
				"spec": {
					"display": {"title": "Row 1"},
					"items": [
						{"x": 0, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p1"}},
						{"x": 6, "y": 0, "width": 6, "height": 6, "content": {"$ref": "#/spec/panels/p2"}}
					]
				}
			}
		],
		"duration": "1h"
	}
}`

func TestPatchableDashboardV2_Apply(t *testing.T) {
	// Apply doesn't mutate the input *DashboardV2 — it marshals it to
	// JSON, applies the patch, and unmarshals the result into a fresh
	// struct. Sharing one base across subtests is safe.
	var p PostableDashboardV2
	require.NoError(t, json.Unmarshal([]byte(basePostableJSON), &p), "base postable JSON must validate")
	testOrgID := valuer.GenerateUUID()
	base := p.NewDashboardV2(testOrgID, "somecreatedthisiguess@signoz.io", SourceUser)
	base.Tags = []*tagtypes.Tag{
		{Key: "team", Value: "alpha"},
		{Key: "env", Value: "prod"},
	}

	decode := func(t *testing.T, body string) PatchableDashboardV2 {
		t.Helper()
		var patch PatchableDashboardV2
		require.NoError(t, json.Unmarshal([]byte(body), &patch))
		return patch
	}

	// jsonOf marshals the patched dashboard back to JSON so subtests can
	// assert on field values without reaching into the typed plugin specs.
	jsonOf := func(t *testing.T, out *UpdatableDashboardV2) string {
		t.Helper()
		raw, err := json.Marshal(out)
		require.NoError(t, err)
		return string(raw)
	}

	// ─────────────────────────────────────────────────────────────────
	// Successful patches
	// ─────────────────────────────────────────────────────────────────

	t.Run("no-op preserves all fields", func(t *testing.T) {
		out, err := decode(t, `[]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, base.DashboardV2MetadataBase, out.DashboardV2MetadataBase)
		assert.Equal(t, tagtypes.NewPostableTagsFromTags(base.Tags), out.Tags)
		assert.Equal(t, base.Spec.Display.Name, out.Spec.Display.Name)
		require.Equal(t, len(base.Spec.Panels), len(out.Spec.Panels))
		for k, panel := range base.Spec.Panels {
			require.Contains(t, out.Spec.Panels, k)
			assert.Equal(t, panel.Spec.Plugin.Kind, out.Spec.Panels[k].Spec.Plugin.Kind)
		}
		assert.Len(t, out.Tags, len(base.Tags))
		assert.Len(t, out.Spec.Variables, len(base.Spec.Variables))
		assert.Len(t, out.Spec.Layouts, len(base.Spec.Layouts))
	})

	t.Run("add metadata image", func(t *testing.T) {
		out, err := decode(t, `[{"op": "add", "path": "/image", "value": "https://example.com/img.png"}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "https://example.com/img.png", out.Image)
		assert.Equal(t, SchemaVersion, out.SchemaVersion, "schemaVersion preserved")
	})

	t.Run("replace display name", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/spec/display/name", "value": "Renamed"}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "Renamed", out.Spec.Display.Name)
	})

	// Per RFC 6902 § 4.1, `add` on an existing object member replaces the
	// existing value rather than erroring — same effect as `replace`.
	t.Run("add overwrites existing display name", func(t *testing.T) {
		out, err := decode(t, `[{"op": "add", "path": "/spec/display/name", "value": "Overwritten"}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "Overwritten", out.Spec.Display.Name)
	})

	t.Run("add data refreshInterval", func(t *testing.T) {
		out, err := decode(t, `[{"op": "add", "path": "/spec/refreshInterval", "value": "30s"}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "30s", string(out.Spec.RefreshInterval))
	})

	t.Run("add panel leaves others untouched", func(t *testing.T) {
		out, err := decode(t, `[{
			"op": "add",
			"path": "/spec/panels/p3",
			"value": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TablePanel", "spec": {}},
					"queries": [{
						"kind": "time_series",
						"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
							"name": "A",
							"signal": "logs",
							"aggregations": [{"expression": "count()"}]
						}}}
					}]
				}
			}
		}]`).Apply(base)
		require.NoError(t, err)
		assert.Len(t, out.Spec.Panels, 3)
		assert.Contains(t, out.Spec.Panels, "p3")
		// Plugin specs round-trip through MarshalJSON which resolves defaults
		// (e.g. timePreference → "global_time"), so compare the serialized
		// shape rather than the in-memory structs to skip that normalization.
		for _, id := range []string{"p1", "p2"} {
			wantJSON, err := json.Marshal(base.Spec.Panels[id])
			require.NoError(t, err)
			gotJSON, err := json.Marshal(out.Spec.Panels[id])
			require.NoError(t, err)
			assert.JSONEq(t, string(wantJSON), string(gotJSON), "panel %s untouched", id)
		}
	})

	t.Run("replace single panel", func(t *testing.T) {
		out, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p2",
			"value": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/BarChartPanel", "spec": {}},
					"queries": [{
						"kind": "time_series",
						"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
							"name": "A",
							"signal": "metrics",
							"aggregations": [{
								"metricName": "signoz_calls_total",
								"temporality": "cumulative",
								"timeAggregation": "rate",
								"spaceAggregation": "sum"
							}]
						}}}
					}]
				}
			}
		}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, PanelPluginKind("signoz/BarChartPanel"), out.Spec.Panels["p2"].Spec.Plugin.Kind)
		assert.Equal(t, PanelPluginKind("signoz/TimeSeriesPanel"), out.Spec.Panels["p1"].Spec.Plugin.Kind, "p1 untouched")
	})

	// Removing a panel realistically also drops its layout item — exercise
	// the multi-op shape the UI sends.
	t.Run("remove panel and its layout item", func(t *testing.T) {
		out, err := decode(t, `[
			{"op": "remove", "path": "/spec/panels/p2"},
			{"op": "remove", "path": "/spec/layouts/0/spec/items/1"}
		]`).Apply(base)
		require.NoError(t, err)
		assert.Len(t, out.Spec.Panels, 1)
		assert.Contains(t, out.Spec.Panels, "p1")
		assert.NotContains(t, out.Spec.Panels, "p2")
		raw := jsonOf(t, out)
		assert.NotContains(t, raw, `"$ref":"#/spec/panels/p2"`)
		assert.Contains(t, raw, `"$ref":"#/spec/panels/p1"`)
	})

	// The headline use case: edit a single field of a single query inside
	// one panel without re-sending any other part of the dashboard.
	t.Run("rename single query inside panel", func(t *testing.T) {
		out, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p1/spec/queries/0/spec/plugin/spec/name",
			"value": "renamed"
		}]`).Apply(base)
		require.NoError(t, err)

		require.Len(t, out.Spec.Panels["p1"].Spec.Queries, 1)
		assert.Contains(t, jsonOf(t, out), `"name":"renamed"`)
	})

	// Replace a query at a specific index — swaps query "A" out for "B"
	// without re-sending the rest of the panel.
	t.Run("replace query at index", func(t *testing.T) {
		out, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p1/spec/queries/0",
			"value": {
				"kind": "time_series",
				"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
					"name": "B",
					"signal": "metrics",
					"aggregations": [{
						"metricName": "signoz_db_calls_total",
						"temporality": "cumulative",
						"timeAggregation": "rate",
						"spaceAggregation": "sum"
					}]
				}}}
			}
		}]`).Apply(base)
		require.NoError(t, err)
		require.Len(t, out.Spec.Panels["p1"].Spec.Queries, 1)
		raw := jsonOf(t, out)
		assert.Contains(t, raw, `"name":"B"`)
		assert.NotContains(t, raw, `"name":"A"`)
	})

	// ─────────────────────────────────────────────────────────────────
	// Layout edits
	// ─────────────────────────────────────────────────────────────────

	t.Run("move panel by editing layout x coordinate", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/spec/layouts/0/spec/items/0/x", "value": 6}]`).Apply(base)
		require.NoError(t, err)
		raw := jsonOf(t, out)
		// The first item used to live at x=0, now lives at x=6.
		assert.Contains(t, raw, `"x":6,"y":0,"width":6,"height":6,"content":{"$ref":"#/spec/panels/p1"}`)
	})

	t.Run("resize panel by editing layout width", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/spec/layouts/0/spec/items/0/width", "value": 12}]`).Apply(base)
		require.NoError(t, err)
		raw := jsonOf(t, out)
		assert.Contains(t, raw, `"width":12`)
	})

	t.Run("rename layout row title", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/spec/layouts/0/spec/display/title", "value": "Latency"}]`).Apply(base)
		require.NoError(t, err)
		assert.Contains(t, jsonOf(t, out), `"title":"Latency"`)
	})

	t.Run("append layout item", func(t *testing.T) {
		out, err := decode(t, `[{
			"op": "add",
			"path": "/spec/layouts/0/spec/items/-",
			"value": {"x": 0, "y": 6, "width": 12, "height": 6, "content": {"$ref": "#/spec/panels/p1"}}
		}]`).Apply(base)
		require.NoError(t, err)
		// Item count went 2 → 3.
		raw := jsonOf(t, out)
		assert.Equal(t, 3, strings.Count(raw, `"$ref":"#/spec/panels/`))
	})

	// Composing add-panel + add-layout-item is the realistic shape of the
	// "add a new chart to my dashboard" UI flow — exercise it end-to-end.
	t.Run("add panel and corresponding layout item", func(t *testing.T) {
		out, err := decode(t, `[
			{
				"op": "add",
				"path": "/spec/panels/p3",
				"value": {
					"kind": "Panel",
					"spec": {
						"plugin": {"kind": "signoz/TablePanel", "spec": {}},
						"queries": [{
							"kind": "time_series",
							"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
								"name": "A",
								"signal": "logs",
								"aggregations": [{"expression": "count()"}]
							}}}
						}]
					}
				}
			},
			{
				"op": "add",
				"path": "/spec/layouts/0/spec/items/-",
				"value": {"x": 0, "y": 6, "width": 12, "height": 6, "content": {"$ref": "#/spec/panels/p3"}}
			}
		]`).Apply(base)
		require.NoError(t, err)
		assert.Len(t, out.Spec.Panels, 3)
		raw := jsonOf(t, out)
		assert.Contains(t, raw, `"$ref":"#/spec/panels/p3"`)
	})

	t.Run("append tag", func(t *testing.T) {
		out, err := decode(t, `[{"op": "add", "path": "/tags/-", "value": {"key": "env", "value": "staging"}}]`).Apply(base)
		require.NoError(t, err)
		require.Len(t, out.Tags, 3)
		assert.Equal(t, "env", out.Tags[2].Key)
		assert.Equal(t, "staging", out.Tags[2].Value)
	})

	t.Run("append tag when none exist", func(t *testing.T) {
		noTagsBase := &DashboardV2{
			DashboardV2MetadataBase: base.DashboardV2MetadataBase,
			Name:                    base.Name,
			Tags:                    nil,
			Spec:                    base.Spec,
		}
		out, err := decode(t, `[{"op": "add", "path": "/tags/-", "value": {"key": "team", "value": "new"}}]`).Apply(noTagsBase)
		require.NoError(t, err)
		require.Len(t, out.Tags, 1)
		assert.Equal(t, "team", out.Tags[0].Key)
		assert.Equal(t, "new", out.Tags[0].Value)
	})

	t.Run("replace tag value", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/tags/0/value", "value": "beta"}]`).Apply(base)
		require.NoError(t, err)
		require.Len(t, out.Tags, 2)
		assert.Equal(t, "team", out.Tags[0].Key)
		assert.Equal(t, "beta", out.Tags[0].Value)
		assert.Equal(t, "env", out.Tags[1].Key, "tag at index 1 untouched")
		assert.Equal(t, "prod", out.Tags[1].Value, "tag at index 1 untouched")
		for _, tag := range out.Tags {
			assert.NotEqual(t, "alpha", tag.Value, "old tag value must be gone")
		}
	})

	t.Run("multiple ops applied in order", func(t *testing.T) {
		out, err := decode(t, `[
			{"op": "replace", "path": "/spec/display/name", "value": "Multi-step"},
			{"op": "remove",  "path": "/spec/panels/p2"},
			{"op": "remove",  "path": "/spec/layouts/0/spec/items/1"},
			{"op": "add",     "path": "/tags/-", "value": {"key": "env", "value": "staging"}}
		]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "Multi-step", out.Spec.Display.Name)
		assert.Len(t, out.Spec.Panels, 1)
		assert.Len(t, out.Tags, 3)
	})

	// `test` is an RFC 6902 precondition op: aborts the patch if the value
	// at the path doesn't equal the supplied value. Used for optimistic
	// concurrency. Here it matches, so the subsequent ops apply.
	t.Run("test op passes", func(t *testing.T) {
		out, err := decode(t, `[
			{"op": "test",    "path": "/spec/display/name", "value": "Service overview"},
			{"op": "replace", "path": "/spec/display/name", "value": "Confirmed"}
		]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, "Confirmed", out.Spec.Display.Name)
	})

	// ─────────────────────────────────────────────────────────────────
	// Failure cases
	// ─────────────────────────────────────────────────────────────────

	t.Run("decode rejects non-array body", func(t *testing.T) {
		var patch PatchableDashboardV2
		err := json.Unmarshal([]byte(`{"op": "replace"}`), &patch)
		require.Error(t, err)
	})

	t.Run("decode rejects malformed JSON", func(t *testing.T) {
		var patch PatchableDashboardV2
		// Outer json.Unmarshal rejects non-JSON before PatchableDashboardV2's
		// UnmarshalJSON runs, so the error is a stdlib SyntaxError rather
		// than the InvalidInput-classified wrap.
		err := json.Unmarshal([]byte(`not json`), &patch)
		require.Error(t, err)
	})

	// `test` precondition fails — the whole patch is rejected, including
	// the subsequent replace.
	t.Run("test op failure rejected", func(t *testing.T) {
		_, err := decode(t, `[
			{"op": "test", "path": "/spec/display/name", "value": "Wrong"},
			{"op": "replace", "path": "/spec/display/name", "value": "Should not apply"}
		]`).Apply(base)
		require.Error(t, err)
	})

	// Lenient apply (AllowMissingPathOnRemove): removing a path that doesn't
	// exist is a no-op rather than an error, so removes are idempotent.
	t.Run("remove at missing path is a no-op", func(t *testing.T) {
		out, err := decode(t, `[{"op": "remove", "path": "/spec/panels/does-not-exist"}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, len(base.Spec.Panels), len(out.Spec.Panels), "existing panels untouched")
	})

	t.Run("remove schemaVersion rejected", func(t *testing.T) {
		_, err := decode(t, `[{"op": "remove", "path": "/schemaVersion"}]`).Apply(base)
		require.Error(t, err)
	})

	t.Run("wrong schemaVersion rejected", func(t *testing.T) {
		_, err := decode(t, `[{"op": "replace", "path": "/schemaVersion", "value": "v5"}]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), SchemaVersion)
	})

	t.Run("empty display name defaults to dashboard name", func(t *testing.T) {
		out, err := decode(t, `[{"op": "replace", "path": "/spec/display/name", "value": ""}]`).Apply(base)
		require.NoError(t, err)
		assert.Equal(t, base.Name, out.Spec.Display.Name, "empty display.name should default from name")
	})

	t.Run("unknown top-level field rejected", func(t *testing.T) {
		_, err := decode(t, `[{"op": "add", "path": "/bogus", "value": 42}]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), "bogus")
	})

	t.Run("invalid panel kind rejected", func(t *testing.T) {
		_, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p1",
			"value": {
				"kind": "Panel",
				"spec": {"plugin": {"kind": "signoz/NotAPanel", "spec": {}}}
			}
		}]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), "NotAPanel")
	})

	t.Run("query kind incompatible with panel rejected", func(t *testing.T) {
		// PromQLQuery is not allowed on ListPanel — verify the cross-check
		// in Validate still runs after a patch.
		_, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p2",
			"value": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/ListPanel", "spec": {}},
					"queries": [{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}}]
				}
			}
		}]`).Apply(base)
		require.Error(t, err)
	})

	t.Run("removing the only query rejected", func(t *testing.T) {
		// Validate requires exactly one query per panel — leaving zero is rejected.
		_, err := decode(t, `[{"op": "remove", "path": "/spec/panels/p2/spec/queries/0"}]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), "panel must have one query")
	})

	t.Run("two direct queries rejected", func(t *testing.T) {
		// Validate requires exactly one query per panel. To display multiple
		// data sources in one panel, wrap them in a CompositeQuery (see the
		// "replace query with composite" subtest below).
		_, err := decode(t, `[{
			"op": "replace",
			"path": "/spec/panels/p1",
			"value": {
				"kind": "Panel",
				"spec": {
					"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
					"queries": [
						{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
							"name": "A", "signal": "metrics",
							"aggregations": [{"metricName": "signoz_calls_total", "temporality": "cumulative", "timeAggregation": "rate", "spaceAggregation": "sum"}]
						}}}},
						{"kind": "time_series", "spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": {
							"name": "B", "signal": "metrics",
							"aggregations": [{"metricName": "signoz_db_calls_total", "temporality": "cumulative", "timeAggregation": "rate", "spaceAggregation": "sum"}]
						}}}}
					]
				}
			}
		}]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), "panel must have one query")
	})

	t.Run("too many tags rejected", func(t *testing.T) {
		// Base already has 2 tags; add 9 more to exceed MaxTagsPerDashboard (10).
		_, err := decode(t, `[
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "1"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "2"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "3"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "4"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "5"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "6"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "7"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "8"}},
			{"op": "add", "path": "/tags/-", "value": {"key": "t", "value": "9"}}
		]`).Apply(base)
		require.Error(t, err)
		require.Contains(t, err.Error(), "at most")
	})
}
