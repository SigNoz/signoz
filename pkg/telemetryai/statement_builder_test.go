package telemetryai

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

// otelKeysMap seeds the OpenTelemetry gen_ai semantic-convention keys the AI
// queries reference, so the metadata-backed field resolution succeeds in tests.
func otelKeysMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	strKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	numKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeFloat64,
		}
	}
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"gen_ai.request.model":             {strKey("gen_ai.request.model")},
		"gen_ai.tool.name":                 {strKey("gen_ai.tool.name")},
		"gen_ai.agent.name":                {strKey("gen_ai.agent.name")},
		"gen_ai.user.id":                   {strKey("gen_ai.user.id")},
		"gen_ai.usage.input_tokens":        {numKey("gen_ai.usage.input_tokens")},
		"gen_ai.usage.output_tokens":       {numKey("gen_ai.usage.output_tokens")},
		"gen_ai.usage.cost":                {numKey("gen_ai.usage.cost")},
		"gen_ai.usage.cached_input_tokens": {numKey("gen_ai.usage.cached_input_tokens")},
		"has_error": {{
			Name:          "has_error",
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextSpan,
			FieldDataType: telemetrytypes.FieldDataTypeBool,
		}},
	}
}

// standard test window (ms), matching the traces builder tests.
const (
	testStartMs = uint64(1747947419000)
	testEndMs   = uint64(1747983448000)
)

func newTestBuilder(t *testing.T) *scopedTraceStatementBuilder {
	return newTestBuilderWithKeys(t, otelKeysMap())
}

// newTestBuilderWithKeys mirrors the production wiring in signozquerier's provider.
// The gen_ai keys are seeded via keysMap here; in production the metadata store
// surfaces them itself (enrichWithGenAIKeys).
func newTestBuilderWithKeys(t *testing.T, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) *scopedTraceStatementBuilder {
	t.Helper()
	settings := instrumentationtest.New().ToProviderSettings()
	fm := telemetrytraces.NewFieldMapper()
	cb := telemetrytraces.NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = keysMap
	fl := flaggertest.New(t)
	baseCond := NewGenAIBaseConditionProvider()
	// In production the metadata store enriches gen_ai keys (enrichWithGenAIKeys);
	// here the mock is seeded directly via keysMap.
	metadataStore := telemetrytypes.MetadataStore(mockMetadataStore)
	rewriter := querybuilder.NewAggExprRewriter(settings, nil, fm, cb, nil, fl)
	traceStmtBuilder := telemetrytraces.NewTraceQueryStatementBuilder(
		settings,
		metadataStore,
		fm,
		cb,
		rewriter,
		nil,
		fl,
		false,
		100000,
	)
	return NewAITraceStatementBuilder(
		settings,
		metadataStore,
		fm,
		cb,
		baseCond,
		traceStmtBuilder,
	)
}

func TestBuild_TraceList_NoFilter(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Limit:  20,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)

	q := stmt.Query
	// Layer 2 gate as a WHERE-level pre-scan of qualifying trace_ids (not a
	// HAVING over every trace in the window)
	require.Contains(t, q, "__ai_gate_ids AS (SELECT trace_id")
	// gate resolved through the field mapper (materialization-aware `= ?` form),
	// not a hardcoded mapContains
	require.Contains(t, q, "mapContains(attributes_string, 'gen_ai.request.model') = ?")
	require.NotContains(t, q, "HAVING")
	// ranked+limited trace-id CTE constrained to gated traces
	require.Contains(t, q, "__ai_trace_ids AS (")
	require.Contains(t, q, "trace_id GLOBAL IN (SELECT trace_id FROM __ai_gate_ids)")
	// llm_call_count counts LLM spans only (request model present), resolved
	require.Contains(t, q, "countIf(mapContains(attributes_string, 'gen_ai.request.model') = ?) AS llm_call_count")
	// token columns resolved via the field mapper (null-safe multiIf), summed
	require.Contains(t, q, "sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = ?")
	require.Contains(t, q, "sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = ?")
	// default ranking: last in-scope activity, scoped to the resolved gate mask,
	// selected as a real alias so ranking CTE and enrichment both ORDER BY it
	require.Contains(t, q, "maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = ?")
	require.Contains(t, q, ") AS last_activity_time")
	require.Contains(t, q, "last_activity_time DESC, trace_id DESC")
	// enrichment restricted to selected traces and the SAME window as ranking,
	// with root/service/duration columns
	require.Contains(t, q, "trace_id GLOBAL IN (SELECT trace_id FROM __ai_trace_ids)")
	require.Contains(t, q, "anyIf(name, parent_span_id = '') AS root_span_name")
	require.Contains(t, q, "resource_string_service$$name")
	require.Contains(t, q, "AS duration_nano")
	// honored the limit (parameterized)
	require.Contains(t, q, "LIMIT ?")
	require.Contains(t, stmt.Args, 20)
	// no filter => no filter CTE
	require.NotContains(t, q, "__ai_filter_ids")
	require.Contains(t, q, "SETTINGS distributed_product_mode='allow'")
}

func TestBuild_TraceList_OrderByCompletionTokens(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Order: []qbtypes.OrderBy{
			{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "output_tokens"}}, Direction: qbtypes.OrderDirectionDesc},
		},
		Limit: 10,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)

	q := stmt.Query
	// candidates ranked by the trace-level token sum BEFORE the limit (resolved,
	// selected as the output_tokens alias)...
	require.Contains(t, q, "sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = ?")
	require.Contains(t, q, ") AS output_tokens")
	// ...and the same key re-applied on the enrich alias
	require.Contains(t, q, "ORDER BY output_tokens DESC, trace_id DESC")
}

func TestBuild_TraceList_Having(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
		Having: &qbtypes.Having{Expression: "output_tokens > 1000 AND span_count > 3"},
		Limit:  10,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)

	q := stmt.Query
	// aggregate filter applied as HAVING on the grouped ranking CTE, referencing the
	// per-trace aggregate aliases; span-level filter still handled by the filter CTE.
	require.Contains(t, q, "HAVING")
	require.Contains(t, q, "output_tokens > 1000")
	require.Contains(t, q, "span_count > 3")
	require.Contains(t, q, ") AS output_tokens")
	require.Contains(t, q, "count() AS span_count")
	require.Contains(t, q, "__ai_filter_ids AS (")
}

func TestBuild_TraceList_TraceFilterInWhere(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		// ONE filter box, span-level AND trace-level (trace.* context) — no `having`.
		Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND trace.output_tokens > 1000"},
		Limit:  10,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)

	q := stmt.Query
	// span-level predicate -> filter CTE (WHERE over spans)
	require.Contains(t, q, "__ai_filter_ids AS (")
	require.Contains(t, q, "trace_id GLOBAL IN (SELECT trace_id FROM __ai_filter_ids)")
	// trace-level predicate -> HAVING referencing the aggregate alias
	require.Contains(t, q, "HAVING")
	require.Contains(t, q, "output_tokens > 1000")
}

func TestBuild_TraceList_TraceFilterOnly(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Filter: &qbtypes.Filter{Expression: "span_count > 3"}, // bare aggregate name
		Limit:  10,
	}
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)
	q := stmt.Query
	// pure trace-level filter: HAVING, and NO span filter CTE
	require.Contains(t, q, "HAVING")
	require.Contains(t, q, "span_count > 3")
	require.NotContains(t, q, "__ai_filter_ids")
}

func TestBuild_TraceList_TraceOrSpanMixRejected(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000 OR gen_ai.request.model = 'x'"},
		Limit:  10,
	}
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "cannot be combined")
}

func TestBuild_TraceList_Having_UnknownColumn(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Having: &qbtypes.Having{Expression: "service.name > 1"},
		Limit:  10,
	}
	// service.name is not an aggregate column -> HAVING rewriter rejects it.
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
}

func TestBuild_TraceList_UnsupportedOrderKey(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Order: []qbtypes.OrderBy{
			{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "http.request.method"}}, Direction: qbtypes.OrderDirectionDesc},
		},
	}

	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unsupported order key")
}

func TestBuild_TraceList_Offset(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Limit:  10,
		Offset: 30,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "OFFSET ?")
	require.Contains(t, stmt.Args, 30)
}

func TestBuild_TraceList_WithFilter(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
		Limit:  10,
	}

	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)

	q := stmt.Query
	// user filter becomes an independent trace-id set, intersected with the gate
	require.Contains(t, q, "__ai_filter_ids AS (")
	require.Contains(t, q, "trace_id GLOBAL IN (SELECT trace_id FROM __ai_filter_ids)")
	require.Contains(t, q, "gen_ai.request.model")
	// filter value is parameterized, not inlined
	require.Contains(t, stmt.Args, "gpt-4o-mini")
}

func TestBuild_TraceList_DefaultLimit(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
	}
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "LIMIT ?")
	require.Contains(t, stmt.Args, 100)
}

func TestBuild_SpanList_Raw_DelegatesWithGate(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
		Limit:  10,
	}
	// span list: the gate is ANDed into the user filter and delegated, so only
	// gen_ai spans (request model / tool / agent) come back.
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw, query, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "gen_ai.request.model")
	require.Contains(t, stmt.Query, "gen_ai.tool.name")
	require.Contains(t, stmt.Query, "gen_ai.agent.name")
}

func TestBuild_UnsupportedRequestType(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Aggregations: []qbtypes.TraceAggregation{
			{Expression: "count()"},
		},
	}
	// trace list, span list (raw), scalar, and timeseries are supported;
	// distribution is not.
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeDistribution, query, nil)
	require.ErrorIs(t, err, ErrUnsupportedRequestType)
}
