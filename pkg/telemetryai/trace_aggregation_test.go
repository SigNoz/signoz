package telemetryai

import (
	"context"
	"strings"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

// Scalar / time-series (trace-level aggregation) Build tests. The
// rewriteTraceAggregation unit tests live in pkg/telemetryscopedtraces; these
// exercise the full builder through the gen_ai provider pair.

// Mixing domains across separate aggregations of one query is rejected.
func TestBuild_Aggregation_MixedDomainsRejected(t *testing.T) {
	b := newTestBuilder(t)
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
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
		_, err := b.Build(context.Background(), testStartMs, testEndMs, rt,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
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

	_, err := b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.llm_call_count"}}},
		}, nil)
	require.ErrorContains(t, err, `grouping by trace-level aggregate "trace.llm_call_count" is not supported`)

	_, err = b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Order: []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.output_tokens"}}}},
		}, nil)
	require.ErrorContains(t, err, `ordering the span list by trace-level aggregate "trace.output_tokens" is not supported`)

	_, err = b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.total_tokens"}}}},
		}, nil)
	require.ErrorContains(t, err, `ordering by trace-level aggregate "trace.total_tokens" is not supported`)

	// ordering by the aggregation itself (expression or alias) stays valid
	_, err = b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
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
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "trace.output_tokens > $threshold"},
		}
		if rt == qbtypes.RequestTypeScalar {
			q.Aggregations = []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}}
		}
		stmt, err := b.Build(ctx, testStartMs, testEndMs, rt, q, vars)
		require.NoError(t, err, rt.StringValue())
		require.Contains(t, stmt.Query, "HAVING output_tokens > ?", rt.StringValue())
		require.Contains(t, stmt.Args, float64(1000), rt.StringValue())

		_, err = b.Build(ctx, testStartMs, testEndMs, rt, q, nil)
		require.ErrorContains(t, err, `unknown variable "$threshold"`, rt.StringValue())
	}

	// a dynamic variable resolved to __all__ skips the trace-level condition, exactly
	// like span filters — no qualification CTE is built
	stmt, err := b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens IN $models"},
		}, map[string]qbtypes.VariableItem{
			"models": {Type: qbtypes.DynamicVariableType, Value: "__all__"},
		})
	require.NoError(t, err)
	require.NotContains(t, stmt.Query, "__qualified")

	// list variables render as IN with bound args
	stmt, err = b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "count(trace.trace_id)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.llm_call_count IN $counts"},
		}, map[string]qbtypes.VariableItem{
			"counts": {Type: qbtypes.QueryVariableType, Value: []any{float64(1), float64(2)}},
		})
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "HAVING llm_call_count IN (?, ?)")
}

// A resource-attribute condition prunes the qualification scan the same way it prunes
// the trace list's matched pass: __qualified references the __resource_filter CTE, the
// delegated __trace_scope inlines the fingerprint subquery.
func TestBuild_Aggregation_QualificationResourcePruned(t *testing.T) {
	keys := otelKeysMap()
	keys["service.name"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}}
	b := newTestBuilderWithKeys(t, keys)
	ctx := context.Background()
	filter := &qbtypes.Filter{Expression: "service.name = 'api' AND trace.output_tokens > 1000"}

	stmt, err := b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       filter,
		}, nil)
	require.NoError(t, err)
	qualified := stmt.Query[strings.Index(stmt.Query, "__qualified"):strings.Index(stmt.Query, "__ai_traces")]
	require.Contains(t, qualified, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")

	stmt, err = b.Build(ctx, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: filter,
			Limit:  10,
		}, nil)
	require.NoError(t, err)
	scope := stmt.Query[strings.Index(stmt.Query, "__trace_scope"):strings.Index(stmt.Query, "SELECT timestamp")]
	require.Contains(t, scope, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM (SELECT")
}

// ---------------------------------------------------------------------------
// Full-query goldens — native trace-domain pipeline
// ---------------------------------------------------------------------------

// Scalar over per-trace values, no filter: one window-clipped per-trace scan, outer
// avg across traces.
func TestBuild_FullSQL_Scalar_TraceAgg(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __ai_traces AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
)
SELECT avg(output_tokens) AS __result_0
FROM __ai_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Scalar with a span-level + trace-level filter and a groupBy: __qualified holds the
// whole-window qualification, the per-trace scan is per (trace, group) with the span
// filter ANDed, the outer aggregation is per group.
func TestBuild_FullSQL_Scalar_TraceAgg_FilterAndGroupBy(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(trace.total_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.output_tokens > 1000"},
			GroupBy: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}},
			},
			Limit: 5,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id
    HAVING output_tokens > 1000
),
__ai_traces AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model') = true, attributes_string['gen_ai.request.model'], NULL)) AS gen_ai.request.model,
        coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
      AND (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model') = true)
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id, gen_ai.request.model
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
)
SELECT gen_ai.request.model, sum(total_tokens) AS __result_0
FROM __ai_traces
GROUP BY gen_ai.request.model
ORDER BY __result_0 DESC
LIMIT 5
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Time series over per-trace values: the per-trace scan buckets by span time
// (per-bucket clipping), the outer aggregation is per bucket.
func TestBuild_FullSQL_TimeSeries_TraceAgg(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			StepInterval: qbtypes.Step{Duration: 60 * time.Second},
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __ai_traces AS (
    SELECT trace_id,
        toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id, ts
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
)
SELECT ts, avg(output_tokens) AS __result_0
FROM __ai_traces
GROUP BY ts
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Grouped, limited time series: groups are ranked on whole-window per-trace values
// (__ai_traces_total → __limit_cte) and the main per-bucket query is constrained to
// the top-N groups.
func TestBuild_FullSQL_TimeSeries_TraceAgg_TopN(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			StepInterval: qbtypes.Step{Duration: 60 * time.Second},
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			GroupBy: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}},
			},
			Limit: 3,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __ai_traces_total AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model') = true, attributes_string['gen_ai.request.model'], NULL)) AS gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id, gen_ai.request.model
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
),
__limit_cte AS (
    SELECT gen_ai.request.model, avg(output_tokens) AS __result_0
    FROM __ai_traces_total
    GROUP BY gen_ai.request.model
    ORDER BY __result_0 DESC
    LIMIT 3
),
__ai_traces AS (
    SELECT trace_id,
        toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model') = true, attributes_string['gen_ai.request.model'], NULL)) AS gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id, ts, gen_ai.request.model
    HAVING (countIf(mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
)
SELECT ts, gen_ai.request.model, avg(output_tokens) AS __result_0
FROM __ai_traces
WHERE (gen_ai.request.model) IN (SELECT gen_ai.request.model FROM __limit_cte)
GROUP BY ts, gen_ai.request.model
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// ---------------------------------------------------------------------------
// Full-query goldens — delegated span-domain with a trace-level filter
// ---------------------------------------------------------------------------

// Span-level scalar with a trace-level filter: delegated to the trace builder with
// the gate ANDed, constrained by the __trace_scope qualification.
func TestBuild_FullSQL_Scalar_SpanAgg_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(gen_ai.usage.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __trace_scope AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
    GROUP BY trace_id
    HAVING output_tokens > 1000
)
SELECT sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS __result_0
FROM signoz_traces.distributed_signoz_index_v3
WHERE trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)
  AND (mapContains(attributes_string, 'gen_ai.request.model') = true
        OR mapContains(attributes_string, 'gen_ai.tool.name') = true
        OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
  AND timestamp >= '1747947419000000000'
  AND timestamp < '1747983448000000000'
  AND ts_bucket_start >= 1747945619
  AND ts_bucket_start <= 1747983448
ORDER BY __result_0 DESC
`, stmt)
}
