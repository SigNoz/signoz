package aistatementbuilder

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Span list with a mixed filter: spans matching the span-level part, in traces whose
// window-clipped aggregates satisfy the trace-level part (__trace_scope).
func TestBuild_SpanList_TraceScoped(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.output_tokens > 1000"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	assert.Contains(t, got, "__trace_scope AS (")
	assert.Contains(t, got, "HAVING output_tokens > 1000")
	assert.Contains(t, got, "trace_id GLOBAL IN (SELECT trace_id FROM __trace_scope)")
	assert.Contains(t, got, "gpt-4o-mini")
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
	assert.NotContains(t, stmt.Query, "__trace_scope")
}

// The span-list trace-level filter shares the trace list's rules: output-only
// aggregates, OR-mixing, and trace-level order keys are rejected — while bare span
// columns sharing an aggregate alias name (duration_nano) stay orderable.
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
// treatment: resolved and bound as args, __all__ drops the condition (no scope CTE).
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
	assert.Contains(t, stmt.Query, "HAVING output_tokens > ?")
	assert.Contains(t, stmt.Args, float64(700))

	stmt, err = build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	assert.NotContains(t, stmt.Query, "__trace_scope")
}
