package telemetryai

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

// Span list with a mixed filter: gen_ai spans matching the span-level part, in
// traces whose window-clipped aggregates satisfy the trace-level part (the
// __trace_scope qualification on the delegated path).
func TestBuild_FullSQL_SpanList_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.output_tokens > 1000"},
			Limit:  10,
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
SELECT timestamp AS timestamp, trace_id AS trace_id, span_id AS span_id,
    trace_state AS trace_state, parent_span_id AS parent_span_id, flags AS flags,
    name AS name, kind AS kind, kind_string AS kind_string, duration_nano AS duration_nano,
    status_code AS status_code, status_message AS status_message,
    status_code_string AS status_code_string, events AS events, links AS links,
    response_status_code AS response_status_code, external_http_url AS external_http_url,
    http_url AS http_url, external_http_method AS external_http_method,
    http_method AS http_method, http_host AS http_host, db_name AS db_name,
    db_operation AS db_operation, has_error AS has_error, is_remote AS is_remote,
    attributes_string, attributes_number, attributes_bool, resources_string
FROM signoz_traces.distributed_signoz_index_v3
WHERE trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)
  AND (((mapContains(attributes_string, 'gen_ai.request.model') = true
        OR mapContains(attributes_string, 'gen_ai.tool.name') = true
        OR mapContains(attributes_string, 'gen_ai.agent.name') = true))
    AND ((attributes_string['gen_ai.request.model'] = 'gpt-4o-mini'
        AND mapContains(attributes_string, 'gen_ai.request.model') = true)))
  AND timestamp >= '1747947419000000000'
  AND timestamp < '1747983448000000000'
  AND ts_bucket_start >= 1747945619
  AND ts_bucket_start <= 1747983448
LIMIT 10
`, stmt)
}

// Without a trace-level condition nothing changes: the span list stays a single
// gated span scan (no __trace_scope CTE).
func TestBuild_SpanList_NoTraceFilter_NoScope(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)
	require.NotContains(t, stmt.Query, "__trace_scope")
}

// The span-list trace-level filter shares the trace list's rules: output-only
// aggregates are rejected, OR-mixing the two classes is rejected, and explicitly
// trace-level order keys get a targeted error — while bare span columns that happen
// to share a name with an aggregate alias (duration_nano) stay orderable.
func TestBuild_SpanList_TraceFilter_Validation(t *testing.T) {
	b := newTestBuilder(t)
	build := func(q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) error {
		q.Signal = telemetrytypes.SignalTraces
		q.Source = telemetrytypes.SourceAI
		_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw, q, nil)
		return err
	}

	err := build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Filter: &qbtypes.Filter{Expression: "trace.span_count > 3"},
	})
	require.ErrorContains(t, err, `aggregate "span_count" cannot be used`)

	err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000 OR kind_string = 'Client'"},
	})
	require.ErrorContains(t, err, "cannot be combined")

	err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Order: []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace.output_tokens"}}}},
	})
	require.ErrorContains(t, err, `ordering the span list by trace-level aggregate "trace.output_tokens" is not supported`)

	err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Order: []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "duration_nano"}}, Direction: qbtypes.OrderDirectionDesc}},
		Limit: 10,
	})
	require.NoError(t, err, "bare duration_nano is a span column, not a trace-level key")
}

// Variables in a trace-level condition on the span list get the trace list's
// treatment: resolved and bound as args, __all__ drops the condition (no scope CTE),
// tracefield. spelling behaves like trace..
func TestBuild_SpanList_TraceFilter_Variables(t *testing.T) {
	b := newTestBuilder(t)
	build := func(expr string, vars map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
		return b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  10,
			}, vars)
	}

	stmt, err := build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Value: 700}})
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "HAVING output_tokens > ?")
	require.Contains(t, stmt.Args, float64(700))

	stmt, err = build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	require.NotContains(t, stmt.Query, "__trace_scope")

	viaTrace, err := build("trace.output_tokens > 1000", nil)
	require.NoError(t, err)
	viaTracefield, err := build("tracefield.output_tokens > 1000", nil)
	require.NoError(t, err)
	require.Equal(t, viaTrace.Query, viaTracefield.Query)
}
