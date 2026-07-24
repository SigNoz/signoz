package telemetryai

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// Span list with a mixed filter: gen_ai spans matching the span-level part, in
// traces whose window-clipped aggregates satisfy the trace-level part (the
// __trace_scope qualification on the delegated path).
func TestBuild_FullSQL_SpanList_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.output_tokens > 1000"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
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
SELECT timestamp AS __SELECT_KEY_0_timestamp, trace_id AS __SELECT_KEY_1_trace_id, span_id AS __SELECT_KEY_2_span_id,
    trace_state AS __SELECT_KEY_3_trace_state, parent_span_id AS __SELECT_KEY_4_parent_span_id, flags AS __SELECT_KEY_5_flags,
    name AS __SELECT_KEY_6_name, kind AS __SELECT_KEY_7_kind, kind_string AS __SELECT_KEY_8_kind_string, duration_nano AS __SELECT_KEY_9_duration_nano,
    status_code AS __SELECT_KEY_10_status_code, status_message AS __SELECT_KEY_11_status_message,
    status_code_string AS __SELECT_KEY_12_status_code_string, events AS __SELECT_KEY_13_events, links AS __SELECT_KEY_14_links,
    response_status_code AS __SELECT_KEY_15_response_status_code, external_http_url AS __SELECT_KEY_16_external_http_url,
    http_url AS __SELECT_KEY_17_http_url, external_http_method AS __SELECT_KEY_18_external_http_method,
    http_method AS __SELECT_KEY_19_http_method, http_host AS __SELECT_KEY_20_http_host, db_name AS __SELECT_KEY_21_db_name,
    db_operation AS __SELECT_KEY_22_db_operation, has_error AS __SELECT_KEY_23_has_error, is_remote AS __SELECT_KEY_24_is_remote,
    attributes_string, attributes_number, attributes_bool, resources_string
FROM signoz_traces.distributed_signoz_index_v3
WHERE trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)
  AND (((mapContains(attributes_string, 'gen_ai.request.model')
        OR mapContains(attributes_string, 'gen_ai.tool.name')
        OR mapContains(attributes_string, 'gen_ai.agent.name')))
    AND ((attributes_string['gen_ai.request.model'] = 'gpt-4o-mini'
        AND mapContains(attributes_string, 'gen_ai.request.model'))))
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
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
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
		_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw, q, nil)
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
// treatment: substituted as literals, __all__ drops the condition (no scope CTE),
// and the legacy tracefield. spelling is rejected with a targeted error.
func TestBuild_SpanList_TraceFilter_Variables(t *testing.T) {
	b := newTestBuilder(t)
	build := func(expr string, vars map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
		return b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  10,
			}, vars)
	}

	stmt, err := build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Value: 700}})
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "HAVING output_tokens > 700")

	stmt, err = build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	require.NotContains(t, stmt.Query, "__trace_scope")

	_, err = build("tracefield.output_tokens > 1000", nil)
	require.ErrorContains(t, err, `"tracefield." is not supported`)
}
