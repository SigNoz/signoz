package dashboardtypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
			scenario:     "returns nil for missing tags field",
			rawTags:      nil,
			expectedTags: nil,
		},
		{
			scenario:     "ignores non-string elements",
			rawTags:      []any{"apm", 42, true, "logs"},
			expectedTags: []kv{{"tag", "apm"}, {"tag", "logs"}},
		},
	}

	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			tags := convertV1TagsForOrg(orgID, tc.rawTags)
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

	panel := convertGraphWidget(widget)
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
	assert.Equal(t, "1m0s", spec.ChartAppearance.SpanGaps.FillLessThan.StringValue())

	require.NotNil(t, spec.Axes.SoftMin)
	assert.Equal(t, float64(0), *spec.Axes.SoftMin)
	require.NotNil(t, spec.Axes.SoftMax)
	assert.Equal(t, float64(100), *spec.Axes.SoftMax)
	assert.True(t, spec.Axes.IsLogScale)

	assert.Equal(t, LegendPositionRight, spec.Legend.Position)
	assert.Equal(t, map[string]string{"A": "#ff0000", "B": "#00ff00"}, spec.Legend.CustomColors)

	require.Len(t, spec.Thresholds, 1, "threshold with missing color should be dropped")
	assert.Equal(t, ThresholdWithLabel{Value: 90, Unit: "reqps", Color: "#ff0000", Label: "high"}, spec.Thresholds[0])
}

func TestConvertGraphWidgetDefaultsForMissingFields(t *testing.T) {
	widget := map[string]any{
		"id":         "widget-1",
		"panelTypes": "graph",
		"title":      "minimal",
	}

	panel := convertGraphWidget(widget)
	require.NotNil(t, panel)

	spec, ok := panel.Spec.Plugin.Spec.(*TimeSeriesPanelSpec)
	require.True(t, ok)

	assert.Equal(t, TimePreferenceGlobalTime, spec.Visualization.TimePreference)
	assert.Equal(t, PrecisionOption2, spec.Formatting.DecimalPrecision)
	assert.Equal(t, LineInterpolationSpline, spec.ChartAppearance.LineInterpolation)
	assert.Equal(t, LineStyleSolid, spec.ChartAppearance.LineStyle)
	assert.Equal(t, FillModeSolid, spec.ChartAppearance.FillMode)
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
				},
				// table widget → Table panel
				map[string]any{"id": "panel-2", "panelTypes": "table"},
				// widget with missing id — dropped
				map[string]any{"panelTypes": "graph", "title": "no id"},
				// unknown panel kind — silently dropped
				map[string]any{"id": "panel-3", "panelTypes": "totally-new"},
			},
		},
	}

	dashboard, err := storable.ConvertV1ToV2()
	require.NoError(t, err)
	require.NotNil(t, dashboard)

	assert.Equal(t, storable.ID, dashboard.ID)
	assert.Equal(t, storable.OrgID, dashboard.OrgID)
	assert.Equal(t, storable.Source, dashboard.Source)
	assert.Equal(t, storable.Name, dashboard.Name)
	assert.Equal(t, SchemaVersion, dashboard.SchemaVersion)
	assert.Equal(t, "data:image/png;base64,abc", dashboard.Image)

	assert.Equal(t, "APM Metrics", dashboard.Spec.Display.Name)
	assert.Equal(t, "service overview", dashboard.Spec.Display.Description)

	require.Len(t, dashboard.Tags, 2)
	assert.Equal(t, "tag", dashboard.Tags[0].Key)
	assert.Equal(t, "apm", dashboard.Tags[0].Value)
	assert.Equal(t, "team", dashboard.Tags[1].Key)
	assert.Equal(t, "platform", dashboard.Tags[1].Value)

	require.Len(t, dashboard.Spec.Panels, 2, "graph and table map; row, no-id, and unknown kinds are dropped")
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
		{scenario: "true spans every gap", rawSpanGaps: true, expectedFillOnlyBelow: false, expectedFillLessThan: "0s"},
		{scenario: "false spans no gaps", rawSpanGaps: false, expectedFillOnlyBelow: true, expectedFillLessThan: "0s"},
		{scenario: "number is seconds threshold", rawSpanGaps: float64(30), expectedFillOnlyBelow: true, expectedFillLessThan: "30s"},
		{scenario: "missing defaults to span all", rawSpanGaps: nil, expectedFillOnlyBelow: false, expectedFillLessThan: "0s"},
	}

	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			got := mapV1SpanGaps(tc.rawSpanGaps)
			assert.Equal(t, tc.expectedFillOnlyBelow, got.FillOnlyBelow)
			assert.Equal(t, tc.expectedFillLessThan, got.FillLessThan.StringValue())
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

	panel := convertBarWidget(widget)
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

	panel := convertValueWidget(widget)
	require.NotNil(t, panel)
	assert.Equal(t, PanelKindNumber, panel.Spec.Plugin.Kind)

	spec, ok := panel.Spec.Plugin.Spec.(*NumberPanelSpec)
	require.True(t, ok)
	require.Len(t, spec.Thresholds, 1)
	assert.Equal(t, float64(100), spec.Thresholds[0].Value)
	assert.Equal(t, ComparisonOperatorAboveOrEqual, spec.Thresholds[0].Operator)
	assert.Equal(t, "#ff0000", spec.Thresholds[0].Color)
	assert.Equal(t, ThresholdFormatBackground, spec.Thresholds[0].Format)
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

	panel := convertTableWidget(widget)
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

	panel := convertPieWidget(widget)
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

	panel := convertHistogramWidget(widget)
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

	panel := convertListWidget(widget)
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

	queries := convertV1WidgetQuery(widget, PanelKindTimeSeries)
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

	queries := convertV1WidgetQuery(widget, PanelKindTable)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeScalar, queries[0].Kind)
	assert.Equal(t, QueryKindClickHouseSQL, queries[0].Spec.Plugin.Kind)

	ch, ok := queries[0].Spec.Plugin.Spec.(*qb.ClickHouseQuery)
	require.True(t, ok)
	assert.Equal(t, "Q", ch.Name)
	assert.Equal(t, "SELECT 1", ch.Query)
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

	queries := convertV1WidgetQuery(widget, PanelKindTimeSeries)
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

	queries := convertV1WidgetQuery(widget, PanelKindList)
	require.Len(t, queries, 1)
	assert.Equal(t, qb.RequestTypeRaw, queries[0].Kind)
	assert.Equal(t, QueryKindBuilder, queries[0].Spec.Plugin.Kind)

	wrapper, ok := queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec)
	require.True(t, ok)
	spec, ok := wrapper.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
	require.True(t, ok, "list builder query should dispatch to LogAggregation, got %T", wrapper.Spec)
	assert.Equal(t, "A", spec.Name)
}

func TestConvertV1WidgetQueryNoQuery(t *testing.T) {
	widget := map[string]any{"id": "x", "panelTypes": "graph"}
	queries := convertV1WidgetQuery(widget, PanelKindTimeSeries)
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
			map[string]any{"id": "p-1", "panelTypes": "graph"},
			map[string]any{"id": "p-2", "panelTypes": "graph"},
		},
	}

	layouts := convertV1Layouts(data)
	require.Len(t, layouts, 1)
	assert.Equal(t, dashboard.KindGridLayout, layouts[0].Kind)

	spec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, spec.Items, 2)
	assert.Equal(t, "#/spec/panels/p-1", spec.Items[0].Content.Ref)
	assert.Equal(t, 6, spec.Items[1].Width)
	assert.Nil(t, spec.Display, "root-only grid should have no display block")
}

func TestConvertV1LayoutsWithCollapsedSection(t *testing.T) {
	data := StorableDashboardData{
		"widgets": []any{
			map[string]any{"id": "row-1", "panelTypes": "row", "title": "Latency"},
			map[string]any{"id": "p-1", "panelTypes": "graph"},
			map[string]any{"id": "p-2", "panelTypes": "graph"},
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

	layouts := convertV1Layouts(data)
	require.Len(t, layouts, 2, "one root grid (p-2) + one section grid (row-1 with p-1)")

	rootSpec, ok := layouts[0].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.Len(t, rootSpec.Items, 1)
	assert.Equal(t, "#/spec/panels/p-2", rootSpec.Items[0].Content.Ref)
	assert.Nil(t, rootSpec.Display)

	sectionSpec, ok := layouts[1].Spec.(*dashboard.GridLayoutSpec)
	require.True(t, ok)
	require.NotNil(t, sectionSpec.Display)
	assert.Equal(t, "Latency", sectionSpec.Display.Title)
	require.NotNil(t, sectionSpec.Display.Collapse)
	assert.False(t, sectionSpec.Display.Collapse.Open, "collapsed=true → open=false")
	require.Len(t, sectionSpec.Items, 1)
	assert.Equal(t, "#/spec/panels/p-1", sectionSpec.Items[0].Content.Ref)
}

func TestConvertV1LayoutsEmpty(t *testing.T) {
	assert.Nil(t, convertV1Layouts(StorableDashboardData{}))
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

	vars := convertV1Variables(raw)
	require.Len(t, vars, 4)

	// Ordered by `order` ascending: u-3 (0), u-1 (1), u-2 (2), u-4 (3)
	assert.Equal(t, variable.KindList, vars[0].Kind)
	dyn, ok := vars[0].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "deployment.environment", dyn.Name)
	assert.Equal(t, VariableKindDynamic, dyn.Plugin.Kind)
	dynSpec, ok := dyn.Plugin.Spec.(*DynamicVariableSpec)
	require.True(t, ok)
	assert.Equal(t, telemetrytypes.SignalTraces, dynSpec.Signal)

	q, ok := vars[1].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "service.name", q.Name)
	assert.Equal(t, VariableKindQuery, q.Plugin.Kind)
	assert.True(t, q.AllowMultiple)
	assert.True(t, q.AllowAllValue)
	require.NotNil(t, q.Sort)
	assert.Equal(t, variable.SortAlphabeticalAsc, *q.Sort)

	c, ok := vars[2].Spec.(*ListVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "env", c.Name)
	assert.Equal(t, VariableKindCustom, c.Plugin.Kind)
	require.NotNil(t, c.DefaultValue)
	assert.Equal(t, "prod", c.DefaultValue.SingleValue)

	assert.Equal(t, variable.KindText, vars[3].Kind)
	text, ok := vars[3].Spec.(*dashboard.TextVariableSpec)
	require.True(t, ok)
	assert.Equal(t, "freetext", text.Name)
	assert.Equal(t, "hello", text.Value)
}

func TestConvertV1VariablesSkipsUnnamedAndUnknownTypes(t *testing.T) {
	raw := map[string]any{
		"u-1": map[string]any{"name": "", "type": "QUERY"},
		"u-2": map[string]any{"name": "ok", "type": "WHATEVER"},
		"u-3": map[string]any{"name": "good", "type": "CUSTOM", "customValue": "a"},
	}
	vars := convertV1Variables(raw)
	require.Len(t, vars, 1)
	spec := vars[0].Spec.(*ListVariableSpec)
	assert.Equal(t, "good", spec.Name)
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
	vars := convertV1Variables(raw)
	require.Len(t, vars, 1)
	spec := vars[0].Spec.(*ListVariableSpec)
	require.NotNil(t, spec.DefaultValue)
	assert.Equal(t, []string{"foo", "bar"}, spec.DefaultValue.SliceValues)
}
