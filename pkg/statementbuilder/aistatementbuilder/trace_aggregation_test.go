package aistatementbuilder

import (
	"context"
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
// The goldens build up one dimension at a time: base → span filter → trace filter
// → group by → everything combined; then the time-series variants.

// The empty base case never reaches the builder: request validation rejects a
// scalar / time-series builder_ai_query with no aggregations, so the builder
// assumes at least one (internal calls are validated upstream).
func TestBuild_Aggregation_NoAggregations_RejectedByRequestValidation(t *testing.T) {
	for _, rt := range []qbtypes.RequestType{qbtypes.RequestTypeScalar, qbtypes.RequestTypeTimeSeries} {
		req := qbtypes.QueryRangeRequest{
			Start:       testStartMs,
			End:         testEndMs,
			RequestType: rt,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilderAI,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:         "A",
						Signal:       telemetrytypes.SignalTraces,
						StepInterval: qbtypes.Step{Duration: 60 * time.Second},
					},
				}},
			},
		}
		require.ErrorContains(t, req.Validate(), "at least one aggregation is required", rt.StringValue())
	}
}

// Base scalar over per-trace values: one window-clipped per-trace scan, outer avg
// across traces. Traces without token spans yield NULL, which avg skips.
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
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-level filter: resolved through the standard filter pipeline and ANDed into
// the per-trace scan's WHERE, next to the gate mask.
func TestBuild_FullSQL_Scalar_SpanFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
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
      AND (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model'))
    GROUP BY trace_id
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Trace-level filter: qualification first — __qualified selects the trace ids whose
// whole-window value passes, then the per-trace scan is constrained to them.
func TestBuild_FullSQL_Scalar_TraceFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING output_tokens > 1000
),
__scoped_traces AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Group by a span attribute: selected (stringified) and grouped in the per-trace
// scan, then grouped again in the outer aggregation. A trace spanning two models
// contributes one per-trace row per model.
func TestBuild_FullSQL_Scalar_GroupBy(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}}},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __scoped_traces AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id, __GROUP_BY_KEY_0_gen_ai.request.model
)
SELECT __GROUP_BY_KEY_0_gen_ai.request.model, avg(output_tokens) AS __result_0
FROM __scoped_traces
GROUP BY __GROUP_BY_KEY_0_gen_ai.request.model
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Grouping by an intrinsic: the positional alias keeps `toString(name) AS name` (a cyclic
// alias) from forming, and an order key on the dimension resolves to that alias.
func TestBuild_FullSQL_Scalar_GroupByIntrinsic(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "name"}}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "name"}}, Direction: qbtypes.OrderDirectionAsc}},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __scoped_traces AS (
    SELECT trace_id,
        toString(multiIf(name <> '', toString(name), NULL)) AS __GROUP_BY_KEY_0_name,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id, __GROUP_BY_KEY_0_name
)
SELECT __GROUP_BY_KEY_0_name, avg(output_tokens) AS __result_0
FROM __scoped_traces
GROUP BY __GROUP_BY_KEY_0_name
ORDER BY __GROUP_BY_KEY_0_name asc
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Everything combined: span + trace filter parts split (WHERE + __qualified), group
// by, two aggregations, HAVING on the alias (rewritten to __result_0), explicit
// order and limit.
func TestBuild_FullSQL_Scalar_FullCombo(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "avg(trace.output_tokens)", Alias: "avg_out"},
				{Expression: "count(trace.trace_id)"},
			},
			Filter:  &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.total_tokens > 100"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}}},
			Having:  &qbtypes.Having{Expression: "avg_out > 50"},
			Order:   []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "avg_out"}}, Direction: qbtypes.OrderDirectionDesc}},
			Limit:   5,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING total_tokens > 100
),
__scoped_traces AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id, __GROUP_BY_KEY_0_gen_ai.request.model
)
SELECT __GROUP_BY_KEY_0_gen_ai.request.model, avg(output_tokens) AS __result_0, count(trace_id) AS __result_1
FROM __scoped_traces
GROUP BY __GROUP_BY_KEY_0_gen_ai.request.model
HAVING __result_0 > 50
ORDER BY __result_0 desc
LIMIT 5
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
)
SELECT ts, avg(output_tokens) AS __result_0
FROM __scoped_traces
GROUP BY ts
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Grouped, limited time series: groups are ranked on whole-window per-trace values
// (__scoped_traces_total, no ts bucketing → exact for non-composable aggregates like
// avg), __limit_cte keeps the top-N by the requested order, and the bucketed main
// scan is pruned to those groups before aggregating. The alias HAVING applies to the
// outer aggregation; the aggregation order key ranks __limit_cte, the series
// themselves order by ts.
func TestBuild_FullSQL_TimeSeries_GroupLimit(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: 60 * time.Second},
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(trace.output_tokens)", Alias: "total_out"}},
			GroupBy:      []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}}},
			Having:       &qbtypes.Having{Expression: "total_out > 500"},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "total_out"}}, Direction: qbtypes.OrderDirectionDesc}},
			Limit:        3,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __scoped_traces_total AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id, __GROUP_BY_KEY_0_gen_ai.request.model
),
__limit_cte AS (
    SELECT __GROUP_BY_KEY_0_gen_ai.request.model, sum(output_tokens) AS __result_0
    FROM __scoped_traces_total
    GROUP BY __GROUP_BY_KEY_0_gen_ai.request.model
    ORDER BY __result_0 desc
    LIMIT 3
),
__scoped_traces AS (
    SELECT trace_id,
        toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND (toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL))) GLOBAL IN (SELECT __GROUP_BY_KEY_0_gen_ai.request.model FROM __limit_cte)
    GROUP BY trace_id, ts, __GROUP_BY_KEY_0_gen_ai.request.model
)
SELECT ts, __GROUP_BY_KEY_0_gen_ai.request.model, sum(output_tokens) AS __result_0
FROM __scoped_traces
GROUP BY ts, __GROUP_BY_KEY_0_gen_ai.request.model
HAVING __result_0 > 500
ORDER BY ts desc
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-level scalar with a trace-level filter: delegated to the trace builder,
// constrained by the __trace_scope qualification (the delegate's own scalar shape,
// hence no SETTINGS suffix).
func TestBuild_FullSQL_Scalar_SpanAgg_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(gen_ai.usage.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __trace_scope AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING output_tokens > 1000
)
SELECT sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS __result_0
FROM signoz_traces.distributed_signoz_index_v3
WHERE trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)
  AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
  AND timestamp >= '1747947419000000000'
  AND timestamp < '1747983448000000000'
  AND ts_bucket_start >= 1747945619
  AND ts_bucket_start <= 1747983448
ORDER BY __result_0 DESC
`, stmt)
}

// Grouped, limited time series with two group keys and a split filter: the top-N
// prune is a 2-tuple GLOBAL IN, the qualification and span predicate apply to the
// ranking scan and the main scan alike, and with no explicit order the ranking
// defaults to __result_0 DESC.
func TestBuild_FullSQL_TimeSeries_GroupLimit_MultiKey(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			StepInterval: qbtypes.Step{Duration: 60 * time.Second},
			Aggregations: []qbtypes.TraceAggregation{
				{Expression: "sum(trace.output_tokens)"},
				{Expression: "count(trace.trace_id)"},
			},
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.total_tokens > 100"},
			GroupBy: []qbtypes.GroupByKey{
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.request.model"}},
				{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.user.id"}},
			},
			Limit: 2,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING total_tokens > 100
),
__scoped_traces_total AS (
    SELECT trace_id,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.user.id'), attributes_string['gen_ai.user.id'], NULL)) AS __GROUP_BY_KEY_1_gen_ai.user.id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id, __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id
),
__limit_cte AS (
    SELECT __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id, sum(output_tokens) AS __result_0, count(trace_id) AS __result_1
    FROM __scoped_traces_total
    GROUP BY __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id
    ORDER BY __result_0 DESC
    LIMIT 2
),
__scoped_traces AS (
    SELECT trace_id,
        toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)) AS __GROUP_BY_KEY_0_gen_ai.request.model,
        toString(multiIf(mapContains(attributes_string, 'gen_ai.user.id'), attributes_string['gen_ai.user.id'], NULL)) AS __GROUP_BY_KEY_1_gen_ai.user.id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
      AND (toString(multiIf(mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL)), toString(multiIf(mapContains(attributes_string, 'gen_ai.user.id'), attributes_string['gen_ai.user.id'], NULL))) GLOBAL IN (SELECT __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id FROM __limit_cte)
    GROUP BY trace_id, ts, __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id
)
SELECT ts, __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id, sum(output_tokens) AS __result_0, count(trace_id) AS __result_1
FROM __scoped_traces
GROUP BY ts, __GROUP_BY_KEY_0_gen_ai.request.model, __GROUP_BY_KEY_1_gen_ai.user.id
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// A time-series limit without group-by has nothing to rank: it is ignored, matching
// the trace builder — the query equals its unlimited form.
func TestBuild_TimeSeries_LimitWithoutGroupByIgnored(t *testing.T) {
	b := newTestBuilder(t)
	build := func(limit int) *qbtypes.Statement {
		stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 60 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
				Limit:        limit,
			}, nil)
		require.NoError(t, err)
		return stmt
	}
	assert.Equal(t, build(0).Query, build(5).Query)
}

// ---------------------------------------------------------------------------
// Behavior / branch tests not covered by the goldens above
// ---------------------------------------------------------------------------

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

// Trace-level columns are rejected as group-by keys with a targeted builder error;
// order keys never reach the builder — request validation only admits group keys and
// aggregation aliases/expressions — and ordering by the alias stays valid.
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

	req := qbtypes.QueryRangeRequest{
		Start:       testStartMs,
		End:         testEndMs,
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{{
				Type: qbtypes.QueryTypeBuilderAI,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
					Name:         "A",
					Signal:       telemetrytypes.SignalTraces,
					Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
					Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.total_tokens"}}, Direction: qbtypes.OrderDirectionDesc}},
				},
			}},
		},
	}
	require.ErrorContains(t, req.Validate(), "invalid order by key")

	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)", Alias: "avg_out"}},
			Order:        []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "avg_out"}}, Direction: qbtypes.OrderDirectionAsc}},
		}, nil)
	require.NoError(t, err)
}

// Variables in trace-level conditions resolve through the standard pipeline as bound
// args; a dynamic __all__ drops the condition entirely; an unresolved $var is only
// rejected as an unknown aggregate today (a targeted variable error is a separate
// concern).
func TestBuild_FullSQL_Aggregation_VariablesInTraceFilter(t *testing.T) {
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
	assertSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING output_tokens > 1000
),
__scoped_traces AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)

	// an unresolved $var is only rejected as an unknown aggregate today; a targeted
	// "unknown variable" error is a separate concern
	_, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q, nil)
	require.ErrorContains(t, err, `aggregate "$threshold" cannot be used`)

	// __all__ drops the condition: the query equals its unfiltered form
	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q,
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	unfiltered := q
	unfiltered.Filter = nil
	want, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, unfiltered, nil)
	require.NoError(t, err)
	assert.Equal(t, want.Query, stmt.Query)

	// list variables render as IN with bound args; the scan selects only trace_id
	// since no aggregation touches a per-trace column
	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "count(trace.trace_id)"}},
			Filter:       &qbtypes.Filter{Expression: "trace.llm_call_count IN $counts"},
		}, map[string]qbtypes.VariableItem{
			"counts": {Type: qbtypes.QueryVariableType, Value: []any{float64(1), float64(2)}},
		})
	require.NoError(t, err)
	assertSQLEqual(t, `
WITH __qualified AS (
    SELECT trace_id,
        countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
    GROUP BY trace_id
    HAVING llm_call_count IN (1, 2)
),
__scoped_traces AS (
    SELECT trace_id
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id
)
SELECT count(trace_id) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Resource conditions on the native path: the __resource_filter CTE prunes the
// qualification scan and the per-trace scan by fingerprint.
func TestBuild_FullSQL_Aggregation_ResourceFilter_Native(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "avg(trace.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "service.name = 'api' AND trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = 'api' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"api%')
      AND seen_at_ts_bucket_start >= 1747945619
      AND seen_at_ts_bucket_start <= 1747983448
    GROUP BY fingerprint
),
__qualified AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)
    GROUP BY trace_id
    HAVING output_tokens > 1000
),
__scoped_traces AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)
      AND trace_id GLOBAL IN (SELECT trace_id FROM __qualified)
    GROUP BY trace_id
)
SELECT avg(output_tokens) AS __result_0
FROM __scoped_traces
ORDER BY __result_0 DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Resource conditions on the delegated path: the standalone __trace_scope inlines its
// fingerprint subquery (it is built without the delegate's CTEs), while the delegate
// keeps its own __resource_filter CTE and inline resource predicate.
func TestBuild_FullSQL_Aggregation_ResourceFilter_Delegated(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal:       telemetrytypes.SignalTraces,
			Aggregations: []qbtypes.TraceAggregation{{Expression: "sum(gen_ai.usage.output_tokens)"}},
			Filter:       &qbtypes.Filter{Expression: "service.name = 'api' AND trace.output_tokens > 1000"},
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE ((simpleJSONExtractString(labels, 'service.name') = 'api' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"api%'))
      AND seen_at_ts_bucket_start >= 1747945619
      AND seen_at_ts_bucket_start <= 1747983448
    GROUP BY fingerprint
),
__trace_scope AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
      AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = 'api' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"api%') AND seen_at_ts_bucket_start >= 1747945619 AND seen_at_ts_bucket_start <= 1747983448 GROUP BY fingerprint))
    GROUP BY trace_id
    HAVING output_tokens > 1000
)
SELECT sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS __result_0
FROM signoz_traces.distributed_signoz_index_v3
WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)
  AND trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)
  AND (((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AND ((multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = 'api' AND multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL)))
  AND timestamp >= '1747947419000000000'
  AND timestamp < '1747983448000000000'
  AND ts_bucket_start >= 1747945619
  AND ts_bucket_start <= 1747983448
ORDER BY __result_0 DESC
`, stmt)
}

// rate() over a trace-level column divides by the window (scalar) / step (series).
// Note the AggreFuncMap semantics: it counts per-trace rows per second — it does not
// sum the column.
func TestBuild_Aggregation_RateDividesByInterval(t *testing.T) {
	b := newTestBuilder(t)
	ctx := context.Background()
	q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal:       telemetrytypes.SignalTraces,
		Aggregations: []qbtypes.TraceAggregation{{Expression: "rate(trace.llm_call_count)"}},
	}

	stmt, err := b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeScalar, q, nil)
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "count(llm_call_count)/36029 AS __result_0") // (end-start) seconds

	q.StepInterval = qbtypes.Step{Duration: 60 * time.Second}
	stmt, err = b.Build(ctx, valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTimeSeries, q, nil)
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "count(llm_call_count)/60 AS __result_0")
}
