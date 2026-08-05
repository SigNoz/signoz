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

// Scalar / time-series (trace-level aggregation) Build tests. The
// rewriteTraceAggregation unit tests live in scopedtracesstatementbuilder; these
// exercise the full builder through the gen_ai scope.

// Mixing domains across separate aggregations of one query is rejected.
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

// A trace-level filter over an output-only aggregate is rejected on the
// aggregation paths too (it is not computable in the mask-pruned scan).
func TestBuild_Aggregation_OutputOnlyFilterRejected(t *testing.T) {
	b := newTestBuilder(t)
	for _, rt := range []qbtypes.RequestType{qbtypes.RequestTypeScalar, qbtypes.RequestTypeRaw} {
		_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, rt,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				Aggregations: []qbtypes.TraceAggregation{{Expression: "count()"}},
				Filter:       &qbtypes.Filter{Expression: "trace.span_count > 3"},
			}, nil)
		require.ErrorContains(t, err, `aggregate "span_count" cannot be used`)
	}
}

// Trace-level per-trace columns are rejected as group-by / order keys with a
// targeted error (not the field mapper's generic "field not found").
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

	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Order:  []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.output_tokens"}}}},
		}, nil)
	require.ErrorContains(t, err, `ordering the span list by trace-level aggregate "trace.output_tokens" is not supported`)

	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.total_tokens"}}}},
		}, nil)
	require.ErrorContains(t, err, `ordering by trace-level aggregate "trace.total_tokens" is not supported`)

	// ordering by the aggregation itself (expression or alias) stays valid
	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)", Alias: "avg_out"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "avg_out"}}, Direction: qbtypes.OrderDirectionAsc}},
		}, nil)
	require.NoError(t, err)
}

// Query variables resolve inside trace-level filter conditions on every request type,
// as bound args via the standard filter pipeline; unknown $vars fail with a variable
// error, not an "unknown aggregate" one.
func TestBuild_Aggregation_VariablesInTraceFilter(t *testing.T) {
	b := newTestBuilder(t)
	ctx := context.Background()
	vars := map[string]qbtypes.VariableItem{
		"threshold": {Type: qbtypes.TextBoxVariableType, Value: float64(1000)},
	}

	for _, rt := range []qbtypes.RequestType{qbtypes.RequestTypeScalar, qbtypes.RequestTypeRaw, qbtypes.RequestTypeTrace} {
		q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "trace.output_tokens > $threshold"},
		}
		if rt == qbtypes.RequestTypeScalar {
			q.Aggregations = []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}}
		}
		stmt, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, rt, q, vars)
		require.NoError(t, err, rt.StringValue())
		assert.Contains(t, stmt.Query, "HAVING output_tokens > ?", rt.StringValue())
		assert.Contains(t, stmt.Args, float64(1000), rt.StringValue())

		_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, rt, q, nil)
		require.ErrorContains(t, err, `unknown variable "$threshold"`, rt.StringValue())
	}

	// a dynamic variable resolved to __all__ skips the trace-level condition, exactly
	// like span filters — no qualification CTE is built
	stmt, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens IN $models"},
		}, map[string]qbtypes.VariableItem{
			"models": {Type: qbtypes.DynamicVariableType, Value: "__all__"},
		})
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

// A resource-attribute condition prunes the qualification scan the same way it prunes
// the trace list's matched pass: __qualified references the __resource_filter CTE, the
// delegated __trace_scope inlines the fingerprint subquery.
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

// Scalar over per-trace values, no filter: one window-clipped per-trace scan, outer
// avg across traces.
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

// Time series over per-trace values: the per-trace scan buckets by span time
// (per-bucket clipping), the outer aggregation is per bucket.
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

// Span-level scalar with a trace-level filter: delegated to the trace builder with
// the gate ANDed, constrained by the __trace_scope qualification.
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
