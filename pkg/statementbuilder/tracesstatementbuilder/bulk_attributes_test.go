package tracesstatementbuilder

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

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

// jsonAttrColRe matches the raw `attributes` JSON column in the SELECT list (a bare column, not
// the `attributes_string`/`_number`/`_bool` maps).
var jsonAttrColRe = regexp.MustCompile(`,\s*attributes\s*,`)

func newBulkTestBuilder(t *testing.T, releaseTime time.Time) (*traceQueryStatementBuilder, *telemetrytypestest.MockMetadataStore) {
	t.Helper()
	fl := flaggertest.New(t)
	fm := tracestelemetryschema.NewFieldMapper(fl)
	cb := tracestelemetryschema.NewConditionBuilder(fm, fl)
	store := telemetrytypestest.NewMockMetadataStore()
	store.KeysMap = tracestelemetryschema.BuildCompleteFieldKeyMap(releaseTime)
	store.KeysMap["http.route"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "http.route",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Signal:        telemetrytypes.SignalTraces,
	}}
	store.ColumnEvolutionMetadataMap["traces:attribute:__all__"] = tracestelemetryschema.MockAttributeEvolutionData(releaseTime)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, fl)
	b := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		store, fm, cb, aggExprRewriter, nil, fl, false, 100000,
	)
	return b, store
}

// TestBulkAttributeColumnsAcrossWindows asserts the empty-selectFields ("all fields") list query
// scans the attribute homes the column evolution resolves to for the window: the legacy maps before
// the JSON rollout, the JSON column after it, and both across it.
func TestBulkAttributeColumnsAcrossWindows(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	rel := releaseTime.UnixMilli()
	day := int64(24 * time.Hour / time.Millisecond)

	b, _ := newBulkTestBuilder(t, releaseTime)

	cases := []struct {
		name          string
		startMs       uint64
		endMs         uint64
		wantJSON      bool
		wantLegacyMap bool
	}{
		{"before rollout -> maps only", uint64(rel - 2*day), uint64(rel - day), false, true},
		{"after rollout -> json only", uint64(rel + day), uint64(rel + 2*day), true, false},
		{"straddle rollout -> both", uint64(rel - day), uint64(rel + day), true, true},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			stmt, err := b.Build(
				context.Background(), valuer.UUID{}, tt.startMs, tt.endMs,
				qbtypes.RequestTypeRaw,
				qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Signal: telemetrytypes.SignalTraces},
				nil,
			)
			require.NoError(t, err)
			selectList := stmt.Query[:strings.Index(stmt.Query, " FROM ")]

			assert.Equal(t, tt.wantJSON, jsonAttrColRe.MatchString(stmt.Query),
				"json `attributes` column presence; select=%s", selectList)
			assert.Equal(t, tt.wantLegacyMap, strings.Contains(stmt.Query, "attributes_string"),
				"legacy map presence; select=%s", selectList)
			// resources_string stays a legacy map in every window (out of scope for this change).
			assert.Contains(t, stmt.Query, "resources_string")
		})
	}
}

// TestGroupByAttributeAfterRolloutReadsJSON pins the post-dual-write guarantee at the statement
// level: a group-by on an attribute key in a window fully after the rollout reads the JSON column,
// never the legacy map — so aggregations keep working once map dual-write stops.
func TestGroupByAttributeAfterRolloutReadsJSON(t *testing.T) {
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	rel := releaseTime.UnixMilli()
	day := int64(24 * time.Hour / time.Millisecond)

	b, _ := newBulkTestBuilder(t, releaseTime)

	stmt, err := b.Build(
		context.Background(), valuer.UUID{}, uint64(rel+day), uint64(rel+2*day),
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
	assert.Contains(t, stmt.Query, "attributes.`http.route`::String")
	assert.NotContains(t, stmt.Query, "attributes_string", "post-rollout group-by must not read the legacy map")
}
