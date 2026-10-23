package tracesstatementbuilder

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// jsonAttrColRe matches the bare `attributes` JSON column in the SELECT list, not the legacy maps.
var jsonAttrColRe = regexp.MustCompile(`,\s*attributes\s*(,| FROM )`)

func newBulkTestBuilder(t *testing.T, releaseTime time.Time) *traceQueryStatementBuilder {
	t.Helper()
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureUseTraceAttributesJSON.String(): true})
	storage := tracestelemetryschema.NewStorage()
	store := telemetrytypestest.NewMockMetadataStore()
	store.KeysMap = tracestelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
	store.KeysMap["http.route"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "http.route",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Signal:        telemetrytypes.SignalTraces,
	}}
	store.ColumnEvolutionMetadataMap["traces:attribute:__all__"] = tracestelemetryschema.MockAttributeEvolutionData(releaseTime)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalTraces)
	return NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		store, storage, aggExprRewriter, nil, fl, false, 100000,
	)
}

// TestListQuerySelectsAllAttributeHomes: every bag home is scanned in any window, with no evolution lookup.
func TestListQuerySelectsAllAttributeHomes(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	rel := releaseTime.UnixMilli()
	day := int64(24 * time.Hour / time.Millisecond)

	b := newBulkTestBuilder(t, releaseTime)

	testCases := []struct {
		name    string
		startMs uint64
		endMs   uint64
	}{
		{"BeforeRollout", uint64(rel - 2*day), uint64(rel - day)},
		{"AfterRollout", uint64(rel + day), uint64(rel + 2*day)},
		{"StraddlingRollout", uint64(rel - day), uint64(rel + day)},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stmt, err := b.Build(
				context.Background(), valuer.UUID{}, testCase.startMs, testCase.endMs,
				qbtypes.RequestTypeRaw,
				qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Signal: telemetrytypes.SignalTraces},
				nil,
			)
			require.NoError(t, err)
			selectList := stmt.Query[:strings.Index(stmt.Query, " FROM ")]

			assert.Regexp(t, jsonAttrColRe, stmt.Query, "json `attributes` column; select=%s", selectList)
			for _, col := range []string{"attributes_string", "attributes_number", "attributes_bool", "resources_string"} {
				assert.Contains(t, stmt.Query, col, "select=%s", selectList)
			}
		})
	}
}

// TestGroupByAttributeHomeAcrossRollout: the group-by home follows the window — legacy map
// before the rollout, JSON with legacy fallback while straddling, JSON only after it.
func TestGroupByAttributeHomeAcrossRollout(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	rel := releaseTime.UnixMilli()
	day := int64(24 * time.Hour / time.Millisecond)

	b := newBulkTestBuilder(t, releaseTime)

	testCases := []struct {
		name            string
		startMs         uint64
		endMs           uint64
		wantContains    []string
		wantNotContains []string
	}{
		{
			name:            "BeforeRollout_ReadsLegacyMap",
			startMs:         uint64(rel - 2*day),
			endMs:           uint64(rel - day),
			wantContains:    []string{"mapContains(attributes_string, 'http.route')", "attributes_string['http.route']"},
			wantNotContains: []string{"attributes.`http.route`"},
		},
		{
			name:            "StraddlingRollout_JSONThenLegacyFallback",
			startMs:         uint64(rel - day),
			endMs:           uint64(rel + day),
			wantContains:    []string{"attributes.`http.route` IS NOT NULL", "attributes.`http.route`::String", "attributes_string['http.route']"},
			wantNotContains: nil,
		},
		{
			name:            "AfterRollout_ReadsJSONOnly",
			startMs:         uint64(rel + day),
			endMs:           uint64(rel + 2*day),
			wantContains:    []string{"attributes.`http.route`::String"},
			wantNotContains: []string{"attributes_string"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stmt, err := b.Build(
				context.Background(), valuer.UUID{}, testCase.startMs, testCase.endMs,
				qbtypes.RequestTypeTimeSeries,
				qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Signal:       telemetrytypes.SignalTraces,
					StepInterval: qbtypes.Step{Duration: 30 * time.Second},
					Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
					GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name:          "http.route",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					}}},
					Limit: 10,
				},
				nil,
			)
			require.NoError(t, err)
			for _, want := range testCase.wantContains {
				assert.Contains(t, stmt.Query, want)
			}
			for _, unwanted := range testCase.wantNotContains {
				assert.NotContains(t, stmt.Query, unwanted)
			}
		})
	}
}

// TestUnknownAttributeFollowsRollout: a filter or group-by key metadata does not report reads the
// home the window selects, the same as a reported key.
func TestUnknownAttributeFollowsRollout(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	rel := releaseTime.UnixMilli()
	day := int64(24 * time.Hour / time.Millisecond)

	b := newBulkTestBuilder(t, releaseTime)

	testCases := []struct {
		name            string
		startMs         uint64
		endMs           uint64
		wantContains    []string
		wantNotContains []string
	}{
		{
			name:            "BeforeRollout_ReadsLegacyMap",
			startMs:         uint64(rel - 2*day),
			endMs:           uint64(rel - day),
			wantContains:    []string{"attributes_string['unknown.attr'] = ?", "mapContains(attributes_string, 'unknown.attr')"},
			wantNotContains: []string{"attributes.`unknown.attr`"},
		},
		{
			name:            "StraddlingRollout_JSONThenLegacyFallback",
			startMs:         uint64(rel - day),
			endMs:           uint64(rel + day),
			wantContains:    []string{"attributes.`unknown.attr` IS NOT NULL", "attributes.`unknown.attr`::String", "attributes_string['unknown.attr']"},
			wantNotContains: nil,
		},
		{
			name:            "AfterRollout_ReadsJSONOnly",
			startMs:         uint64(rel + day),
			endMs:           uint64(rel + 2*day),
			wantContains:    []string{"attributes.`unknown.attr`::String = ?"},
			wantNotContains: []string{"attributes_string"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stmt, err := b.Build(
				context.Background(), valuer.UUID{}, testCase.startMs, testCase.endMs,
				qbtypes.RequestTypeTimeSeries,
				qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Signal:       telemetrytypes.SignalTraces,
					StepInterval: qbtypes.Step{Duration: 30 * time.Second},
					Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
					Filter:       &qbtypes.Filter{Expression: "unknown.attr = 'x'"},
					GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: "unknown.attr",
					}}},
					Limit: 10,
				},
				nil,
			)
			require.NoError(t, err)
			for _, want := range testCase.wantContains {
				assert.Contains(t, stmt.Query, want)
			}
			for _, unwanted := range testCase.wantNotContains {
				assert.NotContains(t, stmt.Query, unwanted)
			}
			assert.Contains(t, strings.Join(stmt.Warnings, "\n"), "not found in metadata")
		})
	}
}

func TestUnknownAttributeFollowsRolloutAfterRelease(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startMs := uint64(releaseTime.Add(24 * time.Hour).UnixMilli())
	endMs := uint64(releaseTime.Add(48 * time.Hour).UnixMilli())

	b := newBulkTestBuilder(t, releaseTime)

	testCases := []struct {
		name            string
		requestType     qbtypes.RequestType
		query           qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		wantContains    []string
		wantNotContains []string
	}{
		{
			name:        "AggregationArgument_ReadsJSONOnly",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(unknown.num)"}},
			},
			wantContains:    []string{"attributes.`unknown.num`"},
			wantNotContains: []string{"attributes_number['unknown.num']"},
		},
		{
			name:        "RawSelectAndOrder_ReadsJSONOnly",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "unknown.attr"}},
				Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "unknown.attr"}}, Direction: qbtypes.OrderDirectionAsc}},
				Limit:        10,
			},
			wantContains:    []string{"attributes.`unknown.attr`"},
			wantNotContains: []string{"attributes_string['unknown.attr']"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			stmt, err := b.Build(context.Background(), valuer.UUID{}, startMs, endMs, testCase.requestType, testCase.query, nil)
			require.NoError(t, err)
			for _, want := range testCase.wantContains {
				assert.Contains(t, stmt.Query, want)
			}
			for _, unwanted := range testCase.wantNotContains {
				assert.NotContains(t, stmt.Query, unwanted)
			}
		})
	}
}

func TestTraceOperatorUnknownAttributeFollowsRollout(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	startMs := uint64(releaseTime.Add(24 * time.Hour).UnixMilli())
	endMs := uint64(releaseTime.Add(48 * time.Hour).UnixMilli())

	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureUseTraceAttributesJSON.String(): true})
	storage := tracestelemetryschema.NewStorage()
	store := telemetrytypestest.NewMockMetadataStore()
	store.KeysMap = tracestelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
	store.ColumnEvolutionMetadataMap["traces:attribute:__all__"] = tracestelemetryschema.MockAttributeEvolutionData(releaseTime)
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalTraces)
	traceStmtBuilder := NewTraceQueryStatementBuilder(instrumentationtest.New().ToProviderSettings(), store, storage, aggExprRewriter, nil, fl, false, 100000)
	b := NewTraceOperatorStatementBuilder(instrumentationtest.New().ToProviderSettings(), store, storage, traceStmtBuilder, aggExprRewriter, fl)

	operator := qbtypes.QueryBuilderTraceOperator{Expression: "A => B", Limit: 10}
	require.NoError(t, operator.ParseExpression())
	compositeQuery := &qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{
		{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Name: "A", Signal: telemetrytypes.SignalTraces, Filter: &qbtypes.Filter{Expression: "unknown.attr = 'x'"}}},
		{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Name: "B", Signal: telemetrytypes.SignalTraces, Filter: &qbtypes.Filter{Expression: "unknown.other = 'y'"}}},
	}}

	stmt, err := b.Build(context.Background(), valuer.UUID{}, startMs, endMs, qbtypes.RequestTypeRaw, operator, compositeQuery)
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "attributes.`unknown.attr`::String = ?")
	assert.Contains(t, stmt.Query, "attributes.`unknown.other`::String = ?")
	assert.NotContains(t, stmt.Query, "attributes_string['unknown.attr']")
	assert.NotContains(t, stmt.Query, "attributes_string['unknown.other']")
}
