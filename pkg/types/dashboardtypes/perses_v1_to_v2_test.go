package dashboardtypes

import (
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/perses/spec/go/dashboard"
	"github.com/perses/spec/go/dashboard/variable"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConvertV1TagsForOrg(t *testing.T) {
	orgID := valuer.GenerateUUID()

	type kv struct{ key, value string }

	cases := []struct {
		scenario     string
		rawTags      any
		expectedTags []kv
	}{
		{
			scenario:     "no separator uses the default key",
			rawTags:      []any{"apm", "latency", "throughput"},
			expectedTags: []kv{{"tag", "apm"}, {"tag", "latency"}, {"tag", "throughput"}},
		},
		{
			scenario:     "colon splits into key and value",
			rawTags:      []any{"env:prod", "team : backend"},
			expectedTags: []kv{{"env", "prod"}, {"team", "backend"}},
		},
		{
			scenario:     "slash splits into key and value when no colon present",
			rawTags:      []any{"team/backend"},
			expectedTags: []kv{{"team", "backend"}},
		},
		{
			scenario:     "colon takes precedence over slash and slash is scrubbed",
			rawTags:      []any{"team/eng:prod", "team/eng:my/path"},
			expectedTags: []kv{{"team_eng", "prod"}, {"team_eng", "my_path"}},
		},
		{
			scenario:     "empty left side falls back to the default key",
			rawTags:      []any{":prod"},
			expectedTags: []kv{{"tag", "prod"}},
		},
		{
			scenario:     "empty right side keeps the left side as the value",
			rawTags:      []any{"env:"},
			expectedTags: []kv{{"tag", "env"}},
		},
		{
			scenario:     "extra colons in the value collapse to underscores",
			rawTags:      []any{"a:b:c"},
			expectedTags: []kv{{"a", "b_c"}},
		},
		{
			scenario:     "extra slashes in the value are scrubbed",
			rawTags:      []any{"a/b/c"},
			expectedTags: []kv{{"a", "b_c"}},
		},
		{
			scenario:     "reserved key gets an underscore prefix",
			rawTags:      []any{"name:foo", "Source:bar"},
			expectedTags: []kv{{"_name", "foo"}, {"_Source", "bar"}},
		},
		{
			scenario:     "drops empty, whitespace-only, and bare-separator entries",
			rawTags:      []any{"", "  ", ":", "/", "apm"},
			expectedTags: []kv{{"tag", "apm"}},
		},
		{
			scenario:     "dedupes case-insensitive duplicates, first casing wins",
			rawTags:      []any{"Env:Prod", "env:PROD"},
			expectedTags: []kv{{"Env", "Prod"}},
		},
		{
			scenario:     "spaces in key and value collapse to underscores",
			rawTags:      []any{"env:spaced out", "spaced key:prod", "spaced out"},
			expectedTags: []kv{{"env", "spaced_out"}, {"spaced_key", "prod"}, {"tag", "spaced_out"}},
		},
		{
			scenario:     "runs of disallowed punctuation collapse to a single underscore",
			rawTags:      []any{"team (eng):prod!!one"},
			expectedTags: []kv{{"team_eng", "prod_one"}},
		},
		{
			scenario:     "key that would start with a non-leading char is prefixed with underscore",
			rawTags:      []any{"2nd tier:x"},
			expectedTags: []kv{{"_2nd_tier", "x"}},
		},
		{
			scenario:     "a side that molds to empty falls back to the default key with the survivor",
			rawTags:      []any{"(:x", "y:!!!", "good:tag"},
			expectedTags: []kv{{"tag", "x"}, {"tag", "y"}, {"good", "tag"}},
		},
		{
			scenario:     "pairs with no representable content on either side are skipped",
			rawTags:      []any{"(:!!!", "()", "ok"},
			expectedTags: []kv{{"tag", "ok"}},
		},
		{
			scenario:     "returns nil for missing tags field",
			rawTags:      nil,
			expectedTags: nil,
		},
	}

	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			d := &v1Decoder{}
			tags := d.convertV1TagsForOrg(orgID, tc.rawTags)
			require.NoError(t, d.errIfHasMalformedFields())
			require.Len(t, tags, len(tc.expectedTags))
			for i, expected := range tc.expectedTags {
				assert.Equal(t, expected.key, tags[i].Key)
				assert.Equal(t, expected.value, tags[i].Value)
				assert.Equal(t, orgID, tags[i].OrgID)
				assert.Equal(t, coretypes.KindDashboard, tags[i].Kind)
			}
		})
	}
}

// TestConvertV1DetectsMalformedFields verifies a field present with the wrong
// type at any depth (not just top-level containers) makes the conversion fail,
// so the migration logs and skips the dashboard. Absent fields are not errors.
func TestConvertV1DetectsMalformedFields(t *testing.T) {
	cases := []struct {
		scenario string
		data     map[string]any
	}{
		{"variables not a map", map[string]any{"variables": "nope"}},
		{"widgets not an array", map[string]any{"widgets": "nope"}},
		{"tags not an array", map[string]any{"tags": "nope"}},
		{"non-string tag element", map[string]any{"tags": []any{"ok", 42}}},
		{"scalar widget field wrong type", map[string]any{
			"widgets": []any{map[string]any{"id": "w1", "panelTypes": "graph", "title": float64(3)}},
			"layout":  []any{map[string]any{"i": "w1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)}},
		}},
		{"nested query wrong type", map[string]any{
			"widgets": []any{map[string]any{"id": "w1", "panelTypes": "graph", "query": "nope"}},
			"layout":  []any{map[string]any{"i": "w1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)}},
		}},
		{"deep layout coordinate wrong type", map[string]any{
			"widgets": []any{map[string]any{"id": "w1", "panelTypes": "graph", "query": singleLogsBuilderQuery()}},
			"layout":  []any{map[string]any{"i": "w1", "x": "0", "y": float64(0)}},
		}},
	}
	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			_, err := StorableDashboard{Data: tc.data}.ConvertV1ToV2()
			require.Error(t, err)
		})
	}
}

// TestMoldedV1TagsPassValidation guards against the mold rules drifting from
// the tag validators: every tag the converter emits for messy input must pass
// the real tagtypes.ValidatePostableTag, and over-long fields must be capped.
func TestMoldedV1TagsPassValidation(t *testing.T) {
	orgID := valuer.GenerateUUID()

	raw := []any{
		"env:spaced out",
		"team (eng):prod!!one",
		"2nd tier:x",
		"k:" + strings.Repeat("a", 50),
		strings.Repeat("verylongkeysegment ", 4) + ":v",
		"weird*&^chars:val#1",
	}

	d := &v1Decoder{}
	tags := d.convertV1TagsForOrg(orgID, raw)
	require.NoError(t, d.errIfHasMalformedFields())
	require.NotEmpty(t, tags)
	for _, tag := range tags {
		_, _, err := tagtypes.ValidatePostableTag(tagtypes.PostableTag{Key: tag.Key, Value: tag.Value})
		assert.NoError(t, err, "molded tag %q=%q must pass validation", tag.Key, tag.Value)
		assert.LessOrEqual(t, len(tag.Key), tagtypes.MAX_LEN_TAG_KEY)
		assert.LessOrEqual(t, len(tag.Value), tagtypes.MAX_LEN_TAG_VALUE)
	}
}

// singleLogsBuilderQuery is a minimal renderable widget query — one logs builder
// query (defaults to count()). Stand-in widgets in the layout tests attach it so
// they produce a v2 query and aren't dropped as query-less. Fresh map per call:
// conversion mutates the query in place.
func singleLogsBuilderQuery() map[string]any {
	return map[string]any{
		"queryType": "builder",
		"builder": map[string]any{
			"queryData": []any{
				map[string]any{"queryName": "A", "expression": "A", "dataSource": "logs"},
			},
		},
	}
}

// TestConvertV1Panels covers the dispatcher itself: panels are keyed by widget
// id, and row and empty-id widgets are dropped.
func TestConvertV1Panels(t *testing.T) {
	widgets := []any{
		map[string]any{"id": "g1", "panelTypes": "graph", "title": "CPU", "query": singleLogsBuilderQuery()},
		map[string]any{"id": "t1", "panelTypes": "table", "query": singleLogsBuilderQuery()},
		map[string]any{"id": "row1", "panelTypes": "row", "title": "section"},
		map[string]any{"id": "", "panelTypes": "graph"},
	}

	d := &v1Decoder{}
	panels := d.convertV1Panels(widgets)
	require.NoError(t, d.errIfHasMalformedFields())

	require.Len(t, panels, 2)
	require.Contains(t, panels, "g1")
	require.Contains(t, panels, "t1")
	assert.Equal(t, PanelKindTimeSeries, panels["g1"].Spec.Plugin.Kind)
	assert.Equal(t, "CPU", panels["g1"].Spec.Display.Name)
	assert.Equal(t, PanelKindTable, panels["t1"].Spec.Plugin.Kind)
	assert.NotContains(t, panels, "row1", "row widgets are handled by the layout pass")
}

// TestConvertV1PanelsSkipsUnknownType verifies an unrecognized panelTypes is
// dropped silently (v1 can't render it either) without failing the migration.
func TestConvertV1PanelsSkipsUnknownType(t *testing.T) {
	d := &v1Decoder{}
	panels := d.convertV1Panels([]any{map[string]any{"id": "u1", "panelTypes": "somethingelse"}})
	assert.NotContains(t, panels, "u1")
	require.NoError(t, d.errIfHasMalformedFields())
}

func TestConvertGraphWidgetToTimeSeriesPanel(t *testing.T) {
	widget := map[string]any{
		"id":                 "widget-1",
		"panelTypes":         "graph",
		"title":              "Request rate",
		"description":        "RPS over time",
		"timePreferance":     "LAST_1_HR",
		"fillSpans":          true,
		"yAxisUnit":          "reqps",
		"decimalPrecision":   float64(3),
		"lineInterpolation":  "linear",
		"lineStyle":          "dashed",
		"fillMode":           "gradient",
		"showPoints":         true,
		"spanGaps":           float64(60),
		"softMin":            float64(0),
		"softMax":            float64(100),
		"isLogScale":         true,
		"legendPosition":     "right",
		"customLegendColors": map[string]any{"A": "#ff0000", "B": "#00ff00"},
		"thresholds": []any{
			map[string]any{
				"thresholdValue": float64(90),
				"thresholdUnit":  "reqps",
				"thresholdColor": "#ff0000",
				"thresholdLabel": "high",
			},
			map[string]any{
				"thresholdValue": float64(50),
				"thresholdColor": "", // missing — must be dropped
				"thresholdLabel": "missing-color",
			},
		},
	}

	panel := (&v1Decoder{}).convertGraphWidget(widget)
	require.NotNil(t, panel)

	assert.Equal(t, PanelKindPanel, panel.Kind)
	assert.Equal(t, "Request rate", panel.Spec.Display.Name)
	assert.Equal(t, "RPS over time", panel.Spec.Display.Description)

	assert.Equal(t, PanelKindTimeSeries, panel.Spec.Plugin.Kind)
	spec, ok := panel.Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	require.True(t, ok, "panel plugin spec should be *TimeSeriesPanelSpec")

	assert.Equal(t, TimePreferenceLast1Hr, spec.Visualization.TimePreference)
	assert.True(t, spec.Visualization.FillSpans)

	assert.Equal(t, "reqps", spec.Formatting.Unit)
	assert.Equal(t, PrecisionOption3, spec.Formatting.DecimalPrecision)

	assert.Equal(t, LineInterpolationLinear, spec.ChartAppearance.LineInterpolation)
	assert.True(t, spec.ChartAppearance.ShowPoints)
	assert.Equal(t, LineStyleDashed, spec.ChartAppearance.LineStyle)
	assert.Equal(t, FillModeGradient, spec.ChartAppearance.FillMode)
	assert.True(t, spec.ChartAppearance.SpanGaps.FillOnlyBelow)
	assert.Equal(t, "1m0s", spec.ChartAppearance.SpanGaps.FillLessThan)

	require.NotNil(t, spec.Axes.SoftMin)
	assert.Equal(t, float64(0), *spec.Axes.SoftMin)
	require.NotNil(t, spec.Axes.SoftMax)
	assert.Equal(t, float64(100), *spec.Axes.SoftMax)
	assert.True(t, spec.Axes.IsLogScale)

	assert.Equal(t, LegendPositionRight, spec.Legend.Position)
	assert.Equal(t, map[string]string{"A": "#ff0000", "B": "#00ff00"}, spec.Legend.CustomColors)

	require.Len(t, spec.Thresholds, 1, "threshold with missing color should be dropped")
	threshold := spec.Thresholds[0]
	require.NotNil(t, threshold.Value)
	assert.Equal(t, float64(90), threshold.Value)
	assert.Equal(t, "reqps", threshold.Unit)
	assert.Equal(t, "#ff0000", threshold.Color)
	assert.Equal(t, "high", threshold.Label)
}

func TestConvertGraphWidgetDefaultsForMissingFields(t *testing.T) {
	widget := map[string]any{
		"id":         "widget-1",
		"panelTypes": "graph",
		"title":      "minimal",
	}

	panel := (&v1Decoder{}).convertGraphWidget(widget)
	require.NotNil(t, panel)

	spec, ok := panel.Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	require.True(t, ok)

	assert.Equal(t, TimePreferenceGlobalTime, spec.Visualization.TimePreference)
	assert.Equal(t, PrecisionOption2, spec.Formatting.DecimalPrecision)
	assert.Equal(t, LineInterpolationSpline, spec.ChartAppearance.LineInterpolation)
	assert.Equal(t, LineStyleSolid, spec.ChartAppearance.LineStyle)
	assert.Equal(t, FillModeNone, spec.ChartAppearance.FillMode)
	assert.Equal(t, LegendPositionBottom, spec.Legend.Position)
	assert.False(t, spec.ChartAppearance.SpanGaps.FillOnlyBelow)
	assert.Nil(t, spec.Axes.SoftMin)
	assert.Nil(t, spec.Axes.SoftMax)
	assert.Empty(t, spec.Thresholds)
}

func TestConvertV1ToV2HappyPath(t *testing.T) {
	orgID := valuer.GenerateUUID()
	storable := &StorableDashboard{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: time.Now(), UpdatedAt: time.Now()},
		UserAuditable: types.UserAuditable{CreatedBy: "alice", UpdatedBy: "bob"},
		OrgID:         orgID,
		Source:        SourceUser,
		Name:          "apm-metrics",
		Data: StorableDashboardData{
			"title":       "APM Metrics",
			"description": "service overview",
			"image":       "data:image/png;base64,abc",
			"tags":        []any{"apm", "team:platform"},
			"widgets": []any{
				// section header — owned by the layout pass, not a panel
				map[string]any{"id": "row-1", "panelTypes": "row", "title": "Overview"},
				// graph widget → TimeSeries panel
				map[string]any{
					"id":         "panel-1",
					"panelTypes": "graph",
					"title":      "Latency",
					"query": map[string]any{
						"queryType":      "clickhouse_sql",
						"clickhouse_sql": []any{map[string]any{"name": "A", "query": "SELECT now(), 1"}},
					},
				},
				// table widget → Table panel
				map[string]any{
					"id":         "panel-2",
					"panelTypes": "table",
					"query": map[string]any{
						"queryType":      "clickhouse_sql",
						"clickhouse_sql": []any{map[string]any{"name": "A", "query": "SELECT now(), 1"}},
					},
				},
				// widget with missing id — dropped
				map[string]any{"panelTypes": "graph", "title": "no id"},
			},
			"layout": []any{
				map[string]any{"i": "panel-1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)},
				map[string]any{"i": "panel-2", "x": float64(6), "y": float64(0), "w": float64(6), "h": float64(6)},
			},
		},
	}

	dashboard, err := storable.ConvertV1ToV2()
	require.NoError(t, err)
	require.NotNil(t, dashboard)

	assert.Equal(t, storable.ID, dashboard.ID)
	assert.Equal(t, storable.OrgID, dashboard.OrgID)
	assert.Equal(t, storable.Source, dashboard.Source)
	assert.Equal(t, SchemaVersion, dashboard.SchemaVersion)
	assert.Equal(t, "data:image/png;base64,abc", dashboard.Image)
	assert.Contains(t, dashboard.Name, "apm-metrics")

	assert.Equal(t, "APM Metrics", dashboard.Spec.Display.Name)
	assert.Equal(t, "service overview", dashboard.Spec.Display.Description)

	require.Len(t, dashboard.Tags, 2)
	assert.Equal(t, "tag", dashboard.Tags[0].Key)
	assert.Equal(t, "apm", dashboard.Tags[0].Value)
	assert.Equal(t, "team", dashboard.Tags[1].Key)
	assert.Equal(t, "platform", dashboard.Tags[1].Value)

	require.Len(t, dashboard.Spec.Panels, 2, "graph and table map; row and no-id widgets are dropped")
	require.Contains(t, dashboard.Spec.Panels, "panel-1")
	require.Contains(t, dashboard.Spec.Panels, "panel-2")
	assert.Equal(t, PanelKindTimeSeries, dashboard.Spec.Panels["panel-1"].Spec.Plugin.Kind)
	assert.Equal(t, PanelKindTable, dashboard.Spec.Panels["panel-2"].Spec.Plugin.Kind)
}

func TestConvertV1ToV2RejectsAlreadyV2(t *testing.T) {
	storable := &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        valuer.GenerateUUID(),
		Source:       SourceUser,
		Name:         "already-v2",
		Data: StorableDashboardData{
			"metadata": map[string]any{"schemaVersion": SchemaVersion},
			"spec":     map[string]any{},
		},
	}

	dashboard, err := storable.ConvertV1ToV2()
	assert.Nil(t, dashboard)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "already in")
}

func TestSpanGapsMapping(t *testing.T) {
	cases := []struct {
		scenario              string
		rawSpanGaps           any
		expectedFillOnlyBelow bool
		expectedFillLessThan  string
	}{
		{scenario: "true spans every gap", rawSpanGaps: true, expectedFillOnlyBelow: false, expectedFillLessThan: ""},
		{scenario: "false has no threshold so fill-only-below stays off", rawSpanGaps: false, expectedFillOnlyBelow: false, expectedFillLessThan: ""},
		{scenario: "number is seconds threshold", rawSpanGaps: float64(30), expectedFillOnlyBelow: true, expectedFillLessThan: "30s"},
		{scenario: "missing defaults to span all", rawSpanGaps: nil, expectedFillOnlyBelow: false, expectedFillLessThan: ""},
	}

	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			got := mapV1SpanGaps(tc.rawSpanGaps)
			assert.Equal(t, tc.expectedFillOnlyBelow, got.FillOnlyBelow)
			assert.Equal(t, tc.expectedFillLessThan, got.FillLessThan)
		})
	}
}

// ══════════════════════════════════════════════
// Other panel-kind converters
// ══════════════════════════════════════════════

func TestConvertBarWidgetToBarChartPanel(t *testing.T) {
	widget := map[string]any{
		"id":              "bar-1",
		"panelTypes":      "bar",
		"title":           "Requests by status",
		"fillSpans":       true,
		"stackedBarChart": true,
		"yAxisUnit":       "reqps",
		"softMin":         float64(0),
		"isLogScale":      true,
		"legendPosition":  "right",
	}

	panel := (&v1Decoder{}).convertBarWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindBarChart, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*BarChartPanelSpec)
	require.True(t, ok)
	assert.True(t, spec.Visualization.FillSpans)
	assert.True(t, spec.Visualization.StackedBarChart)
	assert.Equal(t, "reqps", spec.Formatting.Unit)
	require.NotNil(t, spec.Axes.SoftMin)
	assert.Equal(t, float64(0), *spec.Axes.SoftMin)
	assert.True(t, spec.Axes.IsLogScale)
	assert.Equal(t, LegendPositionRight, spec.Legend.Position)
}

func TestConvertValueWidgetToNumberPanel(t *testing.T) {
	widget := map[string]any{
		"id":         "val-1",
		"panelTypes": "value",
		"title":      "Active services",
		"yAxisUnit":  "count",
		"thresholds": []any{
			map[string]any{
				"thresholdValue":    float64(100),
				"thresholdOperator": ">=",
				"thresholdColor":    "#ff0000",
				"thresholdFormat":   "Background",
				"thresholdUnit":     "count",
			},
			map[string]any{
				// missing color — must be dropped
				"thresholdValue": float64(10),
			},
		},
	}

	panel := (&v1Decoder{}).convertValueWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindNumber, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*NumberPanelSpec)
	require.True(t, ok)
	require.Len(t, spec.Thresholds, 1)
	require.NotNil(t, spec.Thresholds[0].Value)
	assert.Equal(t, float64(100), spec.Thresholds[0].Value)
	assert.Equal(t, ComparisonOperatorAboveOrEqual, spec.Thresholds[0].Operator)
	assert.Equal(t, "#ff0000", spec.Thresholds[0].Color)
	assert.Equal(t, ThresholdFormatBackground, spec.Thresholds[0].Format)
}

// TestConvertV1ThresholdFlagsUnknownOperator verifies an unrecognized threshold
// comparison operator is recorded as a problem rather than silently defaulting
// to ">".
func TestConvertV1ThresholdFlagsUnknownOperator(t *testing.T) {
	widget := map[string]any{
		"id":         "val-1",
		"panelTypes": "value",
		"thresholds": []any{
			map[string]any{"thresholdColor": "#fff", "thresholdOperator": "BOGUS", "thresholdValue": float64(1)},
		},
	}
	d := &v1Decoder{}
	d.convertValueWidget(widget)
	require.Error(t, d.errIfHasMalformedFields())
}

func TestConvertTableWidgetToTablePanel(t *testing.T) {
	widget := map[string]any{
		"id":         "tbl-1",
		"panelTypes": "table",
		"title":      "Top services",
		"columnUnits": map[string]any{
			"latency": "ms",
			"errors":  "count",
		},
		"thresholds": []any{
			map[string]any{
				"thresholdValue":        float64(500),
				"thresholdColor":        "#ff0000",
				"thresholdTableOptions": "latency",
				"thresholdOperator":     ">",
			},
			map[string]any{
				// missing columnName — dropped
				"thresholdValue": float64(1),
				"thresholdColor": "#00ff00",
			},
		},
	}

	panel := (&v1Decoder{}).convertTableWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindTable, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*TablePanelSpec)
	require.True(t, ok)
	assert.Equal(t, "ms", spec.Formatting.ColumnUnits["latency"])
	assert.Equal(t, "count", spec.Formatting.ColumnUnits["errors"])
	require.Len(t, spec.Thresholds, 1)
	assert.Equal(t, "latency", spec.Thresholds[0].ColumnName)
	assert.Equal(t, ComparisonOperatorAbove, spec.Thresholds[0].Operator)
}

func TestConvertPieWidgetToPieChartPanel(t *testing.T) {
	widget := map[string]any{
		"id":             "pie-1",
		"panelTypes":     "pie",
		"title":          "Share",
		"legendPosition": "right",
	}

	panel := (&v1Decoder{}).convertPieWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindPieChart, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*PieChartPanelSpec)
	require.True(t, ok)
	assert.Equal(t, LegendPositionRight, spec.Legend.Position)
}

func TestConvertHistogramWidget(t *testing.T) {
	bucketCount := float64(20)
	widget := map[string]any{
		"id":                    "hist-1",
		"panelTypes":            "histogram",
		"title":                 "Latency distribution",
		"bucketCount":           bucketCount,
		"mergeAllActiveQueries": true,
	}

	panel := (&v1Decoder{}).convertHistogramWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindHistogram, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*HistogramPanelSpec)
	require.True(t, ok)
	require.NotNil(t, spec.HistogramBuckets.BucketCount)
	assert.Equal(t, bucketCount, *spec.HistogramBuckets.BucketCount)
	assert.Nil(t, spec.HistogramBuckets.BucketWidth)
	assert.True(t, spec.HistogramBuckets.MergeAllActiveQueries)
}

func TestConvertListWidget(t *testing.T) {
	widget := map[string]any{
		"id":         "list-1",
		"panelTypes": "list",
		"title":      "Recent logs",
		"selectedLogFields": []any{
			map[string]any{"name": "body", "fieldDataType": "string", "fieldContext": "log"},
			map[string]any{"name": "severity_text", "fieldDataType": "string", "fieldContext": "log"},
		},
	}

	panel := (&v1Decoder{}).convertListWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindList, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*ListPanelSpec)
	require.True(t, ok)
	require.Len(t, spec.SelectFields, 2)
	assert.Equal(t, "body", spec.SelectFields[0].Name)
}

// ══════════════════════════════════════════════
// Query translation
// ══════════════════════════════════════════════

func TestConvertV1WidgetQuerySinglePromQL(t *testing.T) {
	widget := map[string]any{
		"id":         "p-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "promql",
			"promql": []any{
				map[string]any{"name": "A", "query": "up", "legend": "{{job}}"},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeTimeSeries, queries[0].Kind)
	assert.Equal(t, QueryKindPromQL, queries[0].Spec.Plugin.Kind)

	prom, ok := queries[0].Spec.Plugin.Spec.(*qb.PromQuery)
	require.True(t, ok)
	assert.Equal(t, "A", prom.Name)
	assert.Equal(t, "up", prom.Query)
	assert.Equal(t, "{{job}}", prom.Legend)
}

func TestConvertV1WidgetQuerySingleClickHouse(t *testing.T) {
	widget := map[string]any{
		"id":         "c-1",
		"panelTypes": "table",
		"query": map[string]any{
			"queryType": "clickhouse_sql",
			"clickhouse_sql": []any{
				map[string]any{"name": "Q", "query": "SELECT 1", "legend": "x"},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTable)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeScalar, queries[0].Kind)
	assert.Equal(t, QueryKindClickHouseSQL, queries[0].Spec.Plugin.Kind)

	ch, ok := queries[0].Spec.Plugin.Spec.(*qb.ClickHouseQuery)
	require.True(t, ok)
	assert.Equal(t, "Q", ch.Name)
	assert.Equal(t, "SELECT 1", ch.Query)
}

func TestConvertV1WidgetQuerySingleBuilderUsesBuilderDirectly(t *testing.T) {
	widget := map[string]any{
		"id":         "b-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":    "A",
						"expression":   "A",
						"dataSource":   "metrics",
						"aggregations": []any{map[string]any{"metricName": "signoz_calls_total"}},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeTimeSeries, queries[0].Kind)
	assert.Equal(t, QueryKindBuilder, queries[0].Spec.Plugin.Kind, "a lone builder query is not wrapped in a CompositeQuery")
	assert.Equal(t, "A", queries[0].Spec.Name)

	_, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
}

func TestConvertV1WidgetQueryMultipleBuilderWrapsInComposite(t *testing.T) {
	widget := map[string]any{
		"id":         "b-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":    "A",
						"expression":   "A",
						"dataSource":   "metrics",
						"aggregations": []any{map[string]any{"metricName": "signoz_calls_total"}},
					},
					map[string]any{
						"queryName":    "B",
						"expression":   "B",
						"dataSource":   "logs",
						"aggregations": []any{map[string]any{"expression": "count()"}},
					},
				},
				"queryFormulas": []any{
					map[string]any{"queryName": "F1", "expression": "A + B"},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeTimeSeries, queries[0].Kind)
	assert.Equal(t, QueryKindComposite, queries[0].Spec.Plugin.Kind)

	composite, ok := queries[0].Spec.Plugin.Spec.(*CompositeQuerySpec)
	require.True(t, ok)
	require.Len(t, composite.Queries, 3)
	assert.Equal(t, qb.QueryTypeBuilder, composite.Queries[0].Type)
	assert.Equal(t, qb.QueryTypeBuilder, composite.Queries[1].Type)
	assert.Equal(t, qb.QueryTypeFormula, composite.Queries[2].Type)
}

func TestConvertV1WidgetQueryListPanelUsesBuilderDirectly(t *testing.T) {
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "list",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "logs",
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeRaw, queries[0].Kind)
	assert.Equal(t, QueryKindBuilder, queries[0].Spec.Plugin.Kind)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list builder query should dispatch to LogAggregation, got %T", wrapper.Spec)
	assert.Equal(t, "A", spec.Name)
}

func TestConvertV1WidgetQueryNormalizesV4FiltersAndPageSize(t *testing.T) {
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "list",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "logs",
						"pageSize":   float64(50),
						"filters": map[string]any{
							"op": "AND",
							"items": []any{
								map[string]any{
									"key":   map[string]any{"key": "service.name", "dataType": "string", "type": "tag"},
									"op":    "=",
									"value": "frontend",
								},
								map[string]any{
									"key":   map[string]any{"key": "status.code", "dataType": "int64", "type": "tag"},
									"op":    "nin",
									"value": []any{float64(4), float64(5)},
								},
							},
						},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.NotNil(t, spec.Filter, "v4 filters should become a v5 filter expression")
	assert.Equal(t, "(service.name = 'frontend' AND status.code NOT IN [4, 5])", spec.Filter.Expression, "v4 filters normalize to a v5 expression and the deprecated nin folds to NOT IN")
	assert.Equal(t, 50, spec.Limit, "pageSize backfills limit on a list panel")
}

// When a query carries both a v5 filter ({expression}) and the legacy filters
// ({items, op}), the v5 filter wins and the legacy filters is dropped — matching
// v1's UI, which only ever reads filter.expression.
func TestConvertV1WidgetQueryPrefersV5FilterOverLegacyFilters(t *testing.T) {
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "list",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "logs",
						"filter":     map[string]any{"expression": "service.name = 'checkout'"},
						"filters": map[string]any{
							"op": "AND",
							"items": []any{
								map[string]any{
									"key":   map[string]any{"key": "service.name", "dataType": "string", "type": "tag"},
									"op":    "=",
									"value": "frontend",
								},
							},
						},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.NotNil(t, spec.Filter)
	assert.Equal(t, "service.name = 'checkout'", spec.Filter.Expression, "the v5 filter wins; the legacy filters ('frontend') is dropped")
}

// An uppercase EXISTS op migrates to a bare EXISTS, not "host.name EXISTS ”".
func TestConvertV1WidgetQueryNormalizesUppercaseExistsOp(t *testing.T) {
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "list",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "logs",
						"filters": map[string]any{
							"op": "AND",
							"items": []any{
								map[string]any{
									"key":   map[string]any{"key": "host.name", "dataType": "string", "type": "resource"},
									"op":    "EXISTS",
									"value": "",
								},
							},
						},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.NotNil(t, spec.Filter)
	assert.Equal(t, "host.name EXISTS", spec.Filter.Expression, `uppercase EXISTS op migrates to a bare EXISTS, not "EXISTS ''"`)
}

func TestConvertV1WidgetQueryIgnoresPageSizeOnNonRowLimitPanel(t *testing.T) {
	widget := map[string]any{
		"id":         "b-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":    "A",
						"expression":   "A",
						"dataSource":   "logs",
						"pageSize":     float64(50),
						"aggregations": []any{map[string]any{"expression": "count()"}},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "got %T", wrapper.Spec)
	assert.Zero(t, spec.Limit, "pageSize is a list/table concern; a graph panel must not adopt it as limit")
}

func TestConvertV1WidgetQueryRebuildsFlatMetricAggregation(t *testing.T) {
	// A metric query stored in the flat v4 shape (aggregateOperator/
	// aggregateAttribute/timeAggregation/… instead of aggregations[]) — the shape
	// a dashboard mislabeled version:"v5" carries when it skips the v4→v5 migrator.
	widget := map[string]any{
		"id":         "m-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":          "A",
						"expression":         "A",
						"dataSource":         "metrics",
						"aggregateOperator":  "avg",
						"aggregateAttribute": map[string]any{"key": "signoz_calls_total"},
						"timeAggregation":    "rate",
						"spaceAggregation":   "sum",
						"temporality":        "cumulative",
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.MetricAggregation])
	require.True(t, ok, "metric query should dispatch to MetricAggregation, got %T", wrapper.Spec)

	require.Len(t, spec.Aggregations, 1, "flat v4 metric fields should rebuild into one aggregation")
	assert.Equal(t, "signoz_calls_total", spec.Aggregations[0].MetricName)
	assert.Equal(t, "rate", spec.Aggregations[0].TimeAggregation.StringValue())
	assert.Equal(t, "sum", spec.Aggregations[0].SpaceAggregation.StringValue())
}

func TestConvertV1WidgetQueryRebuildsFlatLogsAggregation(t *testing.T) {
	// A logs query stored in the flat v4 shape (aggregateOperator/
	// aggregateAttribute instead of aggregations[]). Without a flat-field builder
	// the aggregation is dropped entirely (empty panel); it must rebuild into an
	// expression aggregation, mirroring the migrator's createAggregations.
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":          "A",
						"expression":         "A",
						"dataSource":         "logs",
						"aggregateOperator":  "sum",
						"aggregateAttribute": map[string]any{"key": "bytes"},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.Len(t, spec.Aggregations, 1, "flat v4 logs fields should rebuild into one aggregation")
	assert.Equal(t, "sum(bytes)", spec.Aggregations[0].Expression)
}

// The v5 shape-safe path preserves an explicit count(attribute) in aggregations[],
// so no dashboardtypes-level normalization is needed for v5 dashboards. (The v4
// full-migrate path clobbers it to count() — that needs a separate fix.)
func TestConvertV1WidgetQueryPreservesCountAttributeOnV5(t *testing.T) {
	testCases := []struct {
		scenario           string
		queryData          map[string]any
		expectedExpression string
	}{
		{
			scenario: "aggregations[] count(attribute) only",
			queryData: map[string]any{
				"queryName":    "A",
				"expression":   "A",
				"dataSource":   "logs",
				"aggregations": []any{map[string]any{"expression": "count(service.name)"}},
			},
			expectedExpression: "count(service.name)",
		},
		{
			scenario: "flat count+attr alongside aggregations[] count(attribute)",
			queryData: map[string]any{
				"queryName":          "A",
				"expression":         "A",
				"dataSource":         "logs",
				"aggregateOperator":  "count",
				"aggregateAttribute": map[string]any{"key": "service.name"},
				"aggregations":       []any{map[string]any{"expression": "count(service.name)"}},
			},
			expectedExpression: "count(service.name)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.scenario, func(t *testing.T) {
			widget := map[string]any{
				"id":         "l-1",
				"panelTypes": "graph",
				"query": map[string]any{
					"queryType": "builder",
					"builder":   map[string]any{"queryData": []any{testCase.queryData}},
				},
			}

			queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
			require.Len(t, queries, 1)

			wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
			require.True(t, ok)
			spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
			require.True(t, ok, "logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

			require.Len(t, spec.Aggregations, 1)
			assert.Equal(t, testCase.expectedExpression, spec.Aggregations[0].Expression)
		})
	}
}

// A logs query with no aggregations and an orderBy of #SIGNOZ_VALUE: the value-order
// key must be rewritten to the injected default aggregation (count()), which requires
// normalizeOrderByKeys to run after ensureDefaultAggregation.
func TestConvertV1WidgetQueryRewritesValueOrderKeyAfterDefaultAggregation(t *testing.T) {
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "logs",
						"orderBy": []any{
							map[string]any{"columnName": "#SIGNOZ_VALUE", "order": "desc"},
						},
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.Len(t, spec.Aggregations, 1)
	assert.Equal(t, "count()", spec.Aggregations[0].Expression)
	require.Len(t, spec.Order, 1)
	assert.Equal(t, "count()", spec.Order[0].Key.Name, "#SIGNOZ_VALUE resolves to the injected default aggregation")
}

func TestConvertV1WidgetQueryInjectsCountForNoopOnAggregationPanel(t *testing.T) {
	// A logs query with the list-style "noop" operator placed on an aggregation
	// panel (graph). createAggregationsShapeSafe drops noop, leaving no aggregation;
	// an aggregation panel requires one, so it must default to count() (mirrors the
	// frontend's noop→count rewrite).
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":         "A",
						"expression":        "A",
						"dataSource":        "logs",
						"aggregateOperator": "noop",
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	require.Len(t, spec.Aggregations, 1, "noop on an aggregation panel should default to count()")
	assert.Equal(t, "count()", spec.Aggregations[0].Expression)
}

func TestConvertV1WidgetQueryInjectsCountForMissingAggregation(t *testing.T) {
	// A traces query with no aggregation fields at all on an aggregation panel:
	// the migrator produces no aggregations[], which the v5 backend rejects. It must
	// default to count().
	widget := map[string]any{
		"id":         "t-1",
		"panelTypes": "graph",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":  "A",
						"expression": "A",
						"dataSource": "traces",
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	require.Len(t, queries, 1)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.TraceAggregation])
	require.True(t, ok, "traces query should dispatch to TraceAggregation, got %T", wrapper.Spec)

	require.Len(t, spec.Aggregations, 1, "a missing aggregation on an aggregation panel should default to count()")
	assert.Equal(t, "count()", spec.Aggregations[0].Expression)
}

func TestConvertV1WidgetQueryListPanelKeepsNoAggregation(t *testing.T) {
	// A list panel legitimately has no aggregation; the default-count() injection must
	// not touch it (the raw request type skips aggregation validation on the backend).
	widget := map[string]any{
		"id":         "l-1",
		"panelTypes": "list",
		"query": map[string]any{
			"queryType": "builder",
			"builder": map[string]any{
				"queryData": []any{
					map[string]any{
						"queryName":         "A",
						"expression":        "A",
						"dataSource":        "logs",
						"aggregateOperator": "noop",
					},
				},
			},
		},
	}

	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeRaw, queries[0].Kind)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list logs query should dispatch to LogAggregation, got %T", wrapper.Spec)

	assert.Empty(t, spec.Aggregations, "a list panel must keep its bare (no-aggregation) query")
}

func TestConvertV1WidgetQueryNoQuery(t *testing.T) {
	widget := map[string]any{"id": "x", "panelTypes": "graph"}
	queries := (&v1Decoder{}).convertV1WidgetQuery(widget, PanelKindTimeSeries)
	assert.Nil(t, queries)
}

// ══════════════════════════════════════════════
// Layouts and sections
// ══════════════════════════════════════════════

func TestConvertV1LayoutsRootOnly(t *testing.T) {
	data := StorableDashboardData{
		"layout": []any{
			map[string]any{"i": "p-1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "p-2", "x": float64(6), "y": float64(0), "w": float64(6), "h": float64(6)},
		},
		"widgets": []any{
			map[string]any{"id": "p-1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "p-2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 1)
	assert.Equal(t, dashboard.KindGridLayout, layouts[0].Kind)

	spec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, spec.Items, 2)
	assert.Equal(t, "#/spec/panels/p-1", spec.Items[0].Content.Ref)
	assert.Equal(t, 6, spec.Items[1].Width)
	assert.Nil(t, spec.Display, "root-only grid should have no display block")
}

func TestConvertV1LayoutsDropsDuplicateWidgetIDs(t *testing.T) {
	// Two layout entries reference the same widget id with different geometry.
	// Mirroring the frontend's getUpdatedLayout, the first in stored order wins
	// and the rest are dropped whole — the loser's geometry is discarded, not
	// merged.
	data := StorableDashboardData{
		"layout": []any{
			map[string]any{"i": "p-1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "p-1", "x": float64(6), "y": float64(0), "w": float64(3), "h": float64(9)},
			map[string]any{"i": "p-2", "x": float64(6), "y": float64(0), "w": float64(6), "h": float64(6)},
		},
		"widgets": []any{
			map[string]any{"id": "p-1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "p-2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 1)

	spec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, spec.Items, 2, "the duplicate p-1 entry should be dropped, leaving p-1 and p-2")

	var p1 *dashboard.GridItem
	for i := range spec.Items {
		if spec.Items[i].Content.Ref == "#/spec/panels/p-1" {
			p1 = &spec.Items[i]
		}
	}
	require.NotNil(t, p1)
	assert.Equal(t, 6, p1.Width, "first occurrence (w=6) wins, not the dropped duplicate (w=3)")
	assert.Equal(t, 6, p1.Height, "first occurrence (h=6) wins, not the dropped duplicate (h=9)")
}

func TestConvertV1LayoutsWithCollapsedSection(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "row-1", "panelTypes": "row", "title": "Latency"},
			map[string]any{"id": "p-1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "p-2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "row-1", "x": float64(0), "y": float64(0), "w": float64(12), "h": float64(1)},
			map[string]any{"i": "p-1", "x": float64(0), "y": float64(1), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "p-2", "x": float64(0), "y": float64(7), "w": float64(6), "h": float64(6)},
		},
		"panelMap": map[string]any{
			"row-1": map[string]any{
				"collapsed": true,
				"widgets": []any{
					map[string]any{"i": "p-1", "x": float64(0), "y": float64(1), "w": float64(6), "h": float64(6)},
				},
			},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 2, "root grid (p-1 and p-2, both placed from layout) + empty collapsed section")

	// p-1 appears in both `layout` and the collapsed row's panelMap. The layout entry
	// wins — the frontend renders it under the open layout, not the collapsed row — so
	// p-1 and p-2 both land in the root grid and the collapsed section is left empty.
	rootSpec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, rootSpec.Items, 2)
	assert.Equal(t, "#/spec/panels/p-1", rootSpec.Items[0].Content.Ref)
	assert.Equal(t, "#/spec/panels/p-2", rootSpec.Items[1].Content.Ref)
	assert.Nil(t, rootSpec.Display)

	sectionSpec, ok := layouts[1].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.NotNil(t, sectionSpec.Display)
	assert.Equal(t, "Latency", sectionSpec.Display.Title)
	require.NotNil(t, sectionSpec.Display.Collapse)
	assert.False(t, sectionSpec.Display.Collapse.Open, "collapsed=true → open=false")
	assert.Empty(t, sectionSpec.Items, "p-1 is rendered from layout, not the collapsed section")
}

// TestConvertV1LayoutsExpandedSectionsNoPanelMap covers the common real-world
// shape: multiple expanded row sections, each with its own panels, and no
// panelMap at all. Section membership must come from the layout y/x positions —
// each row owns the panels below it until the next row.
func TestConvertV1LayoutsExpandedSectionsNoPanelMap(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "row_s1", "panelTypes": "row", "title": "section 1"},
			map[string]any{"id": "s1p1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "s1p2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "row_s2", "panelTypes": "row", "title": "section 2"},
			map[string]any{"id": "s2p1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "s2p2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "row_s1", "x": float64(0), "y": float64(0), "w": float64(12), "h": float64(1)},
			map[string]any{"i": "s1p1", "x": float64(0), "y": float64(1), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "s1p2", "x": float64(6), "y": float64(1), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "row_s2", "x": float64(0), "y": float64(7), "w": float64(12), "h": float64(1)},
			map[string]any{"i": "s2p1", "x": float64(0), "y": float64(8), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "s2p2", "x": float64(6), "y": float64(8), "w": float64(6), "h": float64(6)},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 2, "two row sections, no root grid")

	s1, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.NotNil(t, s1.Display)
	assert.Equal(t, "section 1", s1.Display.Title)
	require.NotNil(t, s1.Display.Collapse)
	assert.True(t, s1.Display.Collapse.Open)
	require.Len(t, s1.Items, 2)
	assert.Equal(t, "#/spec/panels/s1p1", s1.Items[0].Content.Ref)
	assert.Equal(t, "#/spec/panels/s1p2", s1.Items[1].Content.Ref)
	// y normalized within the section: the row header's row is dropped.
	assert.Equal(t, 0, s1.Items[0].Y)
	assert.Equal(t, 0, s1.Items[1].Y)
	assert.Equal(t, 6, s1.Items[1].X)

	s2, ok := layouts[1].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	assert.Equal(t, "section 2", s2.Display.Title)
	require.Len(t, s2.Items, 2)
	assert.Equal(t, "#/spec/panels/s2p1", s2.Items[0].Content.Ref)
	assert.Equal(t, "#/spec/panels/s2p2", s2.Items[1].Content.Ref)
	assert.Equal(t, 0, s2.Items[0].Y)
	assert.Equal(t, 0, s2.Items[1].Y)
}

func TestConvertV1LayoutsCompactsOverlapping(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "w1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "w2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "w1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "w2", "x": float64(3), "y": float64(3), "w": float64(6), "h": float64(6)},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 1)

	grid, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, grid.Items, 2)
	// w1 stays top-left; the overlapping w2 is pushed below it, keeping its x.
	assert.Equal(t, "#/spec/panels/w1", grid.Items[0].Content.Ref)
	assert.Equal(t, 0, grid.Items[0].Y)
	assert.Equal(t, "#/spec/panels/w2", grid.Items[1].Content.Ref)
	assert.Equal(t, 3, grid.Items[1].X)
	assert.Equal(t, 6, grid.Items[1].Y)
}

func TestConvertV1LayoutsClampsNegativeY(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{map[string]any{"id": "w1", "panelTypes": "graph", "query": singleLogsBuilderQuery()}},
		"layout": []any{
			map[string]any{"i": "w1", "x": float64(0), "y": float64(-1), "w": float64(6), "h": float64(6)},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 1)

	grid, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, grid.Items, 1)
	assert.Equal(t, 0, grid.Items[0].Y) // negative y clamped, as react-grid-layout does
}

func TestConvertV1LayoutsClampsXBounds(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "w1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "w2", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "w1", "x": float64(-2), "y": float64(0), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "w2", "x": float64(10), "y": float64(1), "w": float64(6), "h": float64(6)},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, layouts, 1)

	grid, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, grid.Items, 2)
	assert.Equal(t, "#/spec/panels/w1", grid.Items[0].Content.Ref)
	assert.Equal(t, 0, grid.Items[0].X) // x=-2 clamped to 0
	assert.Equal(t, "#/spec/panels/w2", grid.Items[1].Content.Ref)
	assert.Equal(t, 6, grid.Items[1].X) // x+w=16>12 shifted left to 12-6
}

// TestConvertV1LayoutsToleratesNonObjectPanelMap covers templates that store
// panelMap as {rowID: []widgetID} instead of the canonical {rowID: {widgets,
// collapsed}}. The frontend reads such an entry as "not collapsed" (it accesses
// .collapsed/.widgets, which are absent on an array — see GridCardLayout), so the
// migration must match: no malformed-field error, and the row becomes an
// expanded section grouping its panels positionally.
func TestConvertV1LayoutsToleratesNonObjectPanelMap(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "row_overview", "panelTypes": "row", "title": "Overview"},
			map[string]any{"id": "v_up", "panelTypes": "value", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "v_version", "panelTypes": "value", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "row_overview", "x": float64(0), "y": float64(0), "w": float64(12), "h": float64(1)},
			map[string]any{"i": "v_up", "x": float64(0), "y": float64(1), "w": float64(4), "h": float64(5)},
			map[string]any{"i": "v_version", "x": float64(4), "y": float64(1), "w": float64(4), "h": float64(5)},
		},
		"panelMap": map[string]any{
			// non-canonical: a bare []widgetID instead of {widgets, collapsed}.
			"row_overview": []any{"v_up", "v_version"},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields(), "a non-object panelMap entry must not be flagged malformed")
	require.Len(t, layouts, 1, "one expanded section grid for row_overview")

	section, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.NotNil(t, section.Display)
	assert.Equal(t, "Overview", section.Display.Title)
	require.NotNil(t, section.Display.Collapse)
	assert.True(t, section.Display.Collapse.Open, "non-object panelMap entry → row treated as not collapsed")
	require.Len(t, section.Items, 2, "both panels grouped under the section positionally")
	assert.Equal(t, "#/spec/panels/v_up", section.Items[0].Content.Ref)
	assert.Equal(t, "#/spec/panels/v_version", section.Items[1].Content.Ref)
}

func TestConvertV1LayoutsDropsEntryForUnrenderableWidget(t *testing.T) {
	// e-1 is a widget that exists but produces no panel (unknown/EMPTY_WIDGET
	// type). Its layout entry must not become a grid item — the ref would point
	// at a panel that was never created. (Through ConvertV1ToV2 such a widget also
	// records a malformed-field note; here we exercise the layout pass directly.)
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "p-1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
			map[string]any{"id": "e-1", "panelTypes": "EMPTY_WIDGET"},
		},
		"layout": []any{
			map[string]any{"i": "p-1", "x": float64(0), "y": float64(0), "w": float64(6), "h": float64(6)},
			map[string]any{"i": "e-1", "x": float64(6), "y": float64(0), "w": float64(6), "h": float64(6)},
		},
	}

	d := &v1Decoder{}
	panels := d.convertV1Panels(data["widgets"])
	require.NotContains(t, panels, "e-1", "an unknown widget type produces no panel")

	layouts := d.convertV1Layouts(data, panels)
	require.Len(t, layouts, 1)
	spec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, spec.Items, 1, "e-1 has no panel → its layout entry is dropped, not emitted as a dangling ref")
	assert.Equal(t, "#/spec/panels/p-1", spec.Items[0].Content.Ref)
}

func TestConvertV1LayoutsDropsCollapsedChildWithNoPanel(t *testing.T) {
	// A collapsed section lists a child ("ghost") that has no widget at all — a
	// deleted widget still referenced in panelMap. It produces no panel and no
	// malformed-field note, so the dashboard is NOT skipped; the section grid
	// must drop it rather than emit a dangling ref. Collapsed children bypass the
	// main layout loop, so this exercises the extractValidLayoutItemsForCollapsedSection filter.
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "row-1", "panelTypes": "row", "title": "S"},
			map[string]any{"id": "p-1", "panelTypes": "graph", "query": singleLogsBuilderQuery()},
		},
		"layout": []any{
			map[string]any{"i": "row-1", "x": float64(0), "y": float64(0), "w": float64(12), "h": float64(1)},
		},
		"panelMap": map[string]any{
			"row-1": map[string]any{
				"collapsed": true,
				"widgets": []any{
					map[string]any{"i": "p-1", "x": float64(0), "y": float64(1), "w": float64(6), "h": float64(6)},
					map[string]any{"i": "ghost", "x": float64(6), "y": float64(1), "w": float64(6), "h": float64(6)},
				},
			},
		},
	}

	d := &v1Decoder{}
	layouts := d.convertV1Layouts(data, d.convertV1Panels(data["widgets"]))
	require.NoError(t, d.errIfHasMalformedFields(), "a stale collapsed-child ref must not be flagged malformed")
	require.Len(t, layouts, 1, "the collapsed section")

	spec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, spec.Items, 1, "ghost has no panel → dropped; only p-1 remains")
	assert.Equal(t, "#/spec/panels/p-1", spec.Items[0].Content.Ref)
}

func TestConvertV1LayoutsEmpty(t *testing.T) {
	d := &v1Decoder{}
	layouts := d.convertV1Layouts(StorableDashboardData{}, nil)
	require.NoError(t, d.errIfHasMalformedFields())
	assert.Empty(t, layouts)
}

// ══════════════════════════════════════════════
// Variables
// ══════════════════════════════════════════════

func TestConvertV1VariablesAllTypes(t *testing.T) {
	raw := map[string]any{
		"u-1": map[string]any{
			"name":          "service.name",
			"description":   "the service",
			"type":          "QUERY",
			"queryValue":    "SELECT name FROM s",
			"multiSelect":   true,
			"showALLOption": true,
			"sort":          "ASC",
			"order":         float64(1),
		},
		"u-2": map[string]any{
			"name":          "env",
			"type":          "CUSTOM",
			"customValue":   "prod,staging,dev",
			"order":         float64(2),
			"selectedValue": "prod",
		},
		"u-3": map[string]any{
			"name":                      "deployment.environment",
			"type":                      "DYNAMIC",
			"dynamicVariablesAttribute": "deployment.environment",
			"dynamicVariablesSource":    "Traces",
			"order":                     float64(0),
		},
		"u-4": map[string]any{
			"name":         "freetext",
			"type":         "TEXTBOX",
			"textboxValue": "hello",
			"order":        float64(3),
		},
	}

	d := &v1Decoder{}
	vars := d.convertV1Variables(raw)
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, vars, 4)

	// Ordered by `order` ascending: u-3 (0), u-1 (1), u-2 (2), u-4 (3)
	assert.Equal(t, variable.KindList, vars[0].Kind)
	dyn, ok := vars[0].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "deployment.environment", dyn.Name)
	assert.Equal(t, VariableKindDynamic, dyn.Plugin.Kind)
	dynSpec, ok := dyn.Plugin.Spec.(*DynamicVariableSpec)
	require.True(t, ok)
	assert.Equal(t, DynamicVariableSignalTraces, dynSpec.Signal)

	q, ok := vars[1].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "service.name", q.Name)
	assert.Equal(t, VariableKindQuery, q.Plugin.Kind)
	assert.True(t, q.AllowMultiple)
	assert.True(t, q.AllowAllValue)
	assert.Equal(t, SortAlphabeticalAsc, q.Sort)

	c, ok := vars[2].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "env", c.Name)
	assert.Equal(t, VariableKindCustom, c.Plugin.Kind)
	require.NotNil(t, c.DefaultValue)
	assert.Equal(t, "prod", c.DefaultValue.SingleValue)

	assert.Equal(t, variable.KindText, vars[3].Kind)
	text, ok := vars[3].Spec.(*TextVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "freetext", text.Name)
	assert.Equal(t, "hello", text.Value)
}

func TestConvertV1VariablesSkipsUnnamed(t *testing.T) {
	raw := map[string]any{
		"u-1": map[string]any{"name": "", "type": "QUERY"},
		"u-3": map[string]any{"name": "good", "type": "CUSTOM", "customValue": "a"},
	}
	d := &v1Decoder{}
	vars := d.convertV1Variables(raw)
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, vars, 1)
	spec := vars[0].Spec.(*ListVariableSpec)
	assert.Equal(t, "good", spec.Name)
}

func TestConvertV1VariablesSkipsDynamicMissingAttribute(t *testing.T) {
	raw := map[string]any{
		"u-1": map[string]any{"name": "node", "type": "DYNAMIC", "dynamicVariablesSource": "Traces"},
		"u-2": map[string]any{"name": "good", "type": "CUSTOM", "customValue": "a"},
	}
	d := &v1Decoder{}
	vars := d.convertV1Variables(raw)
	require.NoError(t, d.errIfHasMalformedFields()) // skipped silently, dashboard not failed
	require.Len(t, vars, 1)
	spec := vars[0].Spec.(*ListVariableSpec)
	assert.Equal(t, "good", spec.Name)
}

// TestConvertV1VariablesFlagsUnknownType verifies a named variable with an
// unrecognized (non-empty) type is recorded as a problem (dashboard logged and
// skipped) rather than silently dropped.
func TestConvertV1VariablesFlagsUnknownType(t *testing.T) {
	d := &v1Decoder{}
	d.convertV1Variables(map[string]any{"u-1": map[string]any{"name": "ok", "type": "WHATEVER"}})
	require.Error(t, d.errIfHasMalformedFields())
}

// TestConvertV1VariablesSkipsEmptyType verifies a variable with no type is dropped
// silently, without failing the migration.
func TestConvertV1VariablesSkipsEmptyType(t *testing.T) {
	d := &v1Decoder{}
	vars := d.convertV1Variables(map[string]any{"u-1": map[string]any{"name": "ok", "type": ""}})
	assert.Empty(t, vars)
	require.NoError(t, d.errIfHasMalformedFields())
}

func TestConvertV1VariablesDefaultFromSelectedSlice(t *testing.T) {
	raw := map[string]any{
		"u-1": map[string]any{
			"name":          "svc",
			"type":          "QUERY",
			"queryValue":    "SELECT 1",
			"selectedValue": []any{"foo", "", "bar"},
		},
	}
	d := &v1Decoder{}
	vars := d.convertV1Variables(raw)
	require.NoError(t, d.errIfHasMalformedFields())
	require.Len(t, vars, 1)
	spec := vars[0].Spec.(*ListVariableSpec)
	require.NotNil(t, spec.DefaultValue)
	assert.Equal(t, []string{"foo", "bar"}, spec.DefaultValue.SliceValues)
}
