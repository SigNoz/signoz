package aistatementbuilder

import (
	"context"
	"strings"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Build tests for scalar / time-series through the gen_ai scope; the
// rewriteTraceAggregation unit tests live in scopedtracesstatementbuilder.

// Mixing span- and trace-level aggregations across one query is rejected.
func TestBuild_Aggregation_MixedDomainsRejected(t *testing.T) {
	b := newTestBuilder(t)
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "avg(trace.output_tokens)"},
				{Expression: "sum(gen_ai.usage.output_tokens)"},
			},
		}, nil)
	require.ErrorContains(t, err, "cannot be mixed")
}

// Output-only aggregates are rejected in trace-level filters on the aggregation
// path too (the raw and trace-list paths are covered elsewhere).
func TestBuild_Aggregation_OutputOnlyFilterRejected(t *testing.T) {
	b := newTestBuilder(t)
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
			Filter:       &qbtypes.Filter{Expression: "trace.span_count > 3"},
		}, nil)
	require.ErrorContains(t, err, `aggregate "span_count" cannot be used`)
}

// Trace-level columns are rejected as group-by / order keys with a targeted error;
// ordering by the aggregation's own alias stays valid.
func TestBuild_Aggregation_GroupByOrderValidation(t *testing.T) {
	b := newTestBuilder(t)
	ctx := context.Background()

	_, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.llm_call_count"}}},
		}, nil)
	require.ErrorContains(t, err, `grouping by trace-level aggregate "trace.llm_call_count" is not supported`)

	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.total_tokens"}}}},
		}, nil)
	require.ErrorContains(t, err, `ordering by trace-level aggregate "trace.total_tokens" is not supported`)

	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)", Alias: "avg_out"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "avg_out"}}, Direction: qbtypes.OrderDirectionAsc}},
		}, nil)
	require.NoError(t, err)
}

// Variables in trace-level conditions bind as args on the aggregation path;
// unknown $vars fail with a variable error, __all__ drops the condition.
func TestBuild_Aggregation_VariablesInTraceFilter(t *testing.T) {
	b := newTestBuilder(t)
	ctx := context.Background()

	q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal:       telemetrytypes.SignalTraces,
		Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		Filter:       &qbtypes.Filter{Expression: "trace.output_tokens > $threshold"},
	}
	stmt, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q,
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.TextBoxVariableType, Value: float64(1000)}})
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "HAVING output_tokens > ?")
	assert.Contains(t, stmt.Args, float64(1000))

	// an unresolved $var is only rejected as an unknown aggregate today; a targeted
	// "unknown variable" error is a separate concern
	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q, nil)
	require.ErrorContains(t, err, `aggregate "$threshold" cannot be used`)

	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q,
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	assert.NotContains(t, stmt.Query, "__qualified")

	// list variables render as IN with bound args
	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "count(trace.trace_id)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.llm_call_count IN $counts"},
		}, map[string]qbtypes.VariableItem{
			"counts": {Type: qbtypes.QueryVariableType, Value: []any{float64(1), float64(2)}},
		})
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "HAVING llm_call_count IN (?, ?)")
}

// Resource conditions prune the qualification scan: __qualified references the
// __resource_filter CTE, the delegated __trace_scope inlines the fingerprint subquery.
func TestBuild_Aggregation_QualificationResourcePruned(t *testing.T) {
	b := newTestBuilder(t)
	ctx := context.Background()
	filter := &qbtypes.Filter{Expression: "service.name = 'api' AND trace.output_tokens > 1000"}

	stmt, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       filter,
		}, nil)
	require.NoError(t, err)
	qualified := stmt.Query[strings.Index(stmt.Query, "__qualified"):strings.Index(stmt.Query, "__scoped_traces")]
	assert.Contains(t, qualified, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")

	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: filter,
			Limit:  10,
		}, nil)
	require.NoError(t, err)
	scope := stmt.Query[strings.Index(stmt.Query, "__trace_scope"):]
	assert.Contains(t, scope, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM (SELECT")
}

// ---------------------------------------------------------------------------
// Full-query goldens — native trace-domain pipeline
// ---------------------------------------------------------------------------

// Scalar over per-trace values: one window-clipped per-trace scan, outer avg.
func TestBuild_FullSQL_Scalar_TraceAgg(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __scoped_traces AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model'))) > 0
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Time series: the per-trace scan buckets by span time, the outer aggregation per bucket.
func TestBuild_FullSQL_TimeSeries_TraceAgg(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: 60 * time.Second},
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __scoped_traces AS (
    SELECT trace_id,
        toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id, ts
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model'))) > 0
)
SELECT ts, avg(output_tokens) AS __result_0
FROM __scoped_traces
GROUP BY ts
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-level scalar with a trace-level filter: delegated, constrained by __trace_scope.
func TestBuild_FullSQL_Scalar_SpanAgg_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(gen_ai.usage.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	assert.Contains(t, got, "__trace_scope AS (")
	assert.Contains(t, got, "HAVING output_tokens > 1000")
	assert.Contains(t, got, "trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)")
	assert.Contains(t, got, "AS __result_0")
}
