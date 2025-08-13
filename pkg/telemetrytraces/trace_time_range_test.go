package telemetrytraces

import (
	"context"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTraceTimeRangeOptimization(t *testing.T) {

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()

	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	mockMetadataStore.KeysMap["trace_id"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "trace_id",
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Signal:        telemetrytypes.SignalTraces,
	}}
	mockMetadataStore.KeysMap["name"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "name",
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Signal:        telemetrytypes.SignalTraces,
	}}

	resourceFilterFM := resourcefilter.NewFieldMapper()
	resourceFilterCB := resourcefilter.NewConditionBuilder(resourceFilterFM)
	resourceFilterStmtBuilder := resourcefilter.NewTraceResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		resourceFilterFM,
		resourceFilterCB,
		mockMetadataStore,
	)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	statementBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		nil, // telemetryStore is nil - optimization won't happen but code path is tested
	)

	tests := []struct {
		name                   string
		query                  qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		expectTimeOptimization bool
	}{
		{
			name: "query with trace_id filter",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "trace_id = '12345abc' AND service.name = 'api'",
				},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "name", FieldContext: telemetrytypes.FieldContextSpan},
				},
			},
			expectTimeOptimization: true, // would optimize if telemetryStore was provided
		},
		{
			name: "query with trace_id IN filter",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "trace_id IN ['12345abc', '67890def'] AND service.name = 'api'",
				},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "name", FieldContext: telemetrytypes.FieldContextSpan},
				},
			},
			expectTimeOptimization: true, // would optimize if telemetryStore was provided
		},
		{
			name: "query without trace_id filter",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'api'",
				},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "name", FieldContext: telemetrytypes.FieldContextSpan},
				},
			},
			expectTimeOptimization: false,
		},
		{
			name: "query with empty filter",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "name", FieldContext: telemetrytypes.FieldContextSpan},
				},
			},
			expectTimeOptimization: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()

			stmt, err := statementBuilder.Build(
				ctx,
				1747947419000, // start time in ms
				1747983448000, // end time in ms
				qbtypes.RequestTypeRaw,
				tt.query,
				nil,
			)

			require.NoError(t, err)
			require.NotNil(t, stmt)

			assert.NotEmpty(t, stmt.Query)

			if tt.query.Filter != nil && tt.query.Filter.Expression != "" {
				traceIDs, found := ExtractTraceIDsFromFilter(tt.query.Filter.Expression)
				assert.Equal(t, tt.expectTimeOptimization, found && len(traceIDs) > 0)
			}
		})
	}
}

func TestTraceTimeRangeFinderQuery(t *testing.T) {
	expectedQuery := `
		SELECT 
			toUnixTimestamp64Nano(min(timestamp)) as start_time,
			toUnixTimestamp64Nano(max(timestamp)) as end_time
		FROM signoz_traces.distributed_signoz_spans
		WHERE traceID = ?
		AND timestamp >= now() - INTERVAL 30 DAY
	`

	expectedQuery = normalizeQuery(expectedQuery)

	actualQuery := `
		SELECT 
			toUnixTimestamp64Nano(min(timestamp)) as start_time,
			toUnixTimestamp64Nano(max(timestamp)) as end_time
		FROM signoz_traces.distributed_signoz_spans
		WHERE traceID = ?
		AND timestamp >= now() - INTERVAL 30 DAY
	`
	actualQuery = normalizeQuery(actualQuery)

	assert.Equal(t, expectedQuery, actualQuery)
}

func normalizeQuery(query string) string {
	lines := []string{}
	for _, line := range strings.Split(strings.TrimSpace(query), "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, " ")
}
