package telemetryai

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
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

	m := make(map[string][]*telemetrytypes.TelemetryFieldKey)

	// gen_ai semconv keys sourced from the single source of truth, mirroring what the
	// production metadata store surfaces via enrichWithGenAIKeys.
	for name, def := range telemetrytypes.GenAIFieldDefinitions {
		keyCopy := def
		m[name] = []*telemetrytypes.TelemetryFieldKey{&keyCopy}
	}

	// Extra keys these tests reference that aren't gen_ai semconv definitions.
	m["gen_ai.user.id"] = []*telemetrytypes.TelemetryFieldKey{strKey("gen_ai.user.id")}
	m["_signoz.gen_ai.total_cost"] = []*telemetrytypes.TelemetryFieldKey{numKey("_signoz.gen_ai.total_cost")}
	m["gen_ai.usage.cached_input_tokens"] = []*telemetrytypes.TelemetryFieldKey{numKey("gen_ai.usage.cached_input_tokens")}
	m["has_error"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "has_error",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeBool,
	}}
	return m
}

// standard test window (ms), matching the traces builder tests.
const (
	testStartMs = uint64(1747947419000)
	testEndMs   = uint64(1747983448000)
)

func newTestBuilder(t *testing.T) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	return newTestBuilderWithKeys(t, otelKeysMap())
}

// newTestBuilderWithKeys mirrors the production wiring in signozquerier's provider.
// The gen_ai keys are seeded via keysMap here; in production the metadata store
// surfaces them itself (enrichWithGenAIKeys).
func newTestBuilderWithKeys(t *testing.T, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
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
		baseCond,
		traceStmtBuilder,
		nil, // telemetryStore: only used by the skip-fingerprint count query, which is disabled here
		fl,
		false,
		100000,
	)
}

// ---------------------------------------------------------------------------
// Full-query golden tests
//
// Each pins the WHOLE generated statement, with bound args inlined into the `?`
// placeholders, as ONE self-contained literal — so a failure diff shows the entire
// query and the expected SQL can be copied straight into a ClickHouse client. The
// `want` strings are formatted for readability; the comparison is whitespace- and
// backtick-insensitive (see normalizeSQL), so only the SQL tokens themselves matter.
//
// The four trace-list goldens cover the corners of how `matched` is assembled —
// {no span filter, span filter} × {no aggregate filter, aggregate filter} — plus a
// mixed filter + multi-key order, plus the delegated span list. Note `matched` selects
// only the aggregates ORDER BY / HAVING reference; the rest appear only in enrichment.
//
// Run `go test ./pkg/telemetryai/ -run TestBuild_FullSQL -v` to also print each query.
// ---------------------------------------------------------------------------

// renderSQL substitutes bound args into the `?` placeholders so the whole statement
// reads as one literal SQL string.
func renderSQL(t *testing.T, stmt *qbtypes.Statement) string {
	t.Helper()
	var b strings.Builder
	argi := 0
	for i := 0; i < len(stmt.Query); i++ {
		if stmt.Query[i] == '?' {
			require.Less(t, argi, len(stmt.Args), "more ? than args in query")
			b.WriteString(formatArg(stmt.Args[argi]))
			argi++
			continue
		}
		b.WriteByte(stmt.Query[i])
	}
	require.Equal(t, len(stmt.Args), argi, "arg count does not match number of placeholders")
	return b.String()
}

func formatArg(a any) string {
	if s, ok := a.(string); ok {
		return "'" + s + "'"
	}
	return fmt.Sprintf("%v", a)
}

// normalizeSQL makes the comparison insensitive to formatting: it drops identifier
// backticks, collapses whitespace runs to a single space, and removes spaces directly
// inside parentheses. This lets the golden strings be freely indented/wrapped (and
// written as Go raw literals, which cannot contain backticks) — only the SQL tokens
// and their order matter.
func normalizeSQL(s string) string {
	s = strings.Join(strings.Fields(strings.ReplaceAll(s, "`", "")), " ")
	s = strings.ReplaceAll(s, "( ", "(")
	s = strings.ReplaceAll(s, " )", ")")
	return s
}

func requireSQLEqual(t *testing.T, want string, stmt *qbtypes.Statement) {
	t.Helper()
	got := renderSQL(t, stmt)
	t.Logf("\n%s", got)
	require.Equal(t, normalizeSQL(want), normalizeSQL(got))
}

// No filter: matched selects only the default order key (last_activity_time), WHERE is
// just window + gate mask, no HAVING.
func TestBuild_FullSQL_TraceList_NoFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI, Limit: 20,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true))
    GROUP BY trace_id
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 20
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Promotion: a materialized gen_ai attribute must resolve to its materialized column
// everywhere it appears — gate mask, countIf/scoped existence, and value columns —
// while un-promoted attributes stay in the attributes map, so one query mixes both
// forms. Here gen_ai.request.model and gen_ai.usage.input_tokens are materialized:
// the gate/llm_call_count/max_llm_latency use `..._exists`, input_tokens/total_tokens
// use the materialized value column, and tool/output_tokens/cost/messages stay in the map.
func TestBuild_FullSQL_TraceList_MaterializedColumns(t *testing.T) {
	keys := otelKeysMap()
	for _, name := range []string{"gen_ai.request.model", "gen_ai.usage.input_tokens"} {
		for _, k := range keys[name] {
			k.Materialized = true
		}
	}
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI, Limit: 20,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (attribute_string_gen_ai$$request$$model_exists = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((attribute_string_gen_ai$$request$$model_exists = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true))
    GROUP BY trace_id
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 20
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(attribute_string_gen_ai$$request$$model_exists = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(attribute_number_gen_ai$$usage$$input_tokens_exists = true, toFloat64(attribute_number_gen_ai$$usage$$input_tokens), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(attribute_number_gen_ai$$usage$$input_tokens_exists = true, toFloat64(attribute_number_gen_ai$$usage$$input_tokens), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, attribute_string_gen_ai$$request$$model_exists = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (attribute_string_gen_ai$$request$$model_exists = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-level AND trace-level filter, order by the aggregate, pagination. matched selects
// only output_tokens (the sole aggregate referenced by both ORDER BY and HAVING) — not
// input_tokens/llm_call_count/last_activity_time. The span predicate widens the WHERE
// prune and becomes a countIf(...) > 0 existence check alongside the gate countIf.
func TestBuild_FullSQL_TraceList_SpanAndTraceFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND output_tokens > 1000"},
			Order:  []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "output_tokens"}}, Direction: qbtypes.OrderDirectionDesc}},
			Limit:  10, Offset: 30,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
        OR (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model') = true))
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) > 0
        AND countIf((attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model') = true)) > 0
        AND output_tokens > 1000
    ORDER BY output_tokens DESC, trace_id DESC
    LIMIT 10 OFFSET 30
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY output_tokens DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Aggregate-only filter (no span filter). WHERE prune is NOT widened, there is no
// gate/span countIf, just the aggregate HAVING. `trace.output_tokens` rewrites to the
// output_tokens alias. matched selects output_tokens (HAVING) + last_activity_time (default order).
func TestBuild_FullSQL_TraceList_AggregateFilterOnly(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true))
    GROUP BY trace_id
    HAVING output_tokens > 1000
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 20
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-only filter (no aggregate filter). WHERE is widened; HAVING has the gate + span
// countIf pair but no trailing aggregate. `has_error = true` resolves to a
// materialized-column predicate (not a map access). matched selects only the default order key.
func TestBuild_FullSQL_TraceList_SpanFilterOnly(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "has_error = true"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
        OR has_error = true)
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) > 0
        AND countIf(has_error = true) > 0
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 20
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Resource filter: a resource attribute in the filter is pulled into a __resource_filter
// CTE (fingerprints matching the resource condition), and the `matched` scan is narrowed
// by `resource_fingerprint GLOBAL IN (…)`. The resource key is dropped from the span
// predicate (skipResourceFilter), so here there is no span-level existence check — the
// prune stays the gate mask and the whole match is scoped to the resource fingerprints.
func TestBuild_FullSQL_TraceList_ResourceFilter(t *testing.T) {
	keys := otelKeysMap()
	keys["service.name"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}}
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "resource.service.name = 'checkout'"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH __resource_filter AS (
    SELECT fingerprint
    FROM signoz_traces.distributed_traces_v3_resource
    WHERE (simpleJSONExtractString(labels, 'service.name') = 'checkout' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"checkout%')
      AND seen_at_ts_bucket_start >= 1747945619
      AND seen_at_ts_bucket_start <= 1747983448
    GROUP BY fingerprint
),
matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true))
      AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)
    GROUP BY trace_id
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 20
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Mixed filter (two span predicates AND'd into one existence check + an aggregate) with
// a two-key order on different aggregates than the filter. matched selects input_tokens
// + last_activity_time (ORDER BY) and output_tokens (HAVING) — three of four; llm_call_count is not.
func TestBuild_FullSQL_TraceList_MixedFiltersMultiOrder(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o' AND has_error = true AND output_tokens > 500"},
			Order: []qbtypes.OrderBy{
				{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "input_tokens"}}, Direction: qbtypes.OrderDirectionDesc},
				{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "last_activity_time"}}, Direction: qbtypes.OrderDirectionAsc},
			},
			Limit: 15,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)
        OR ((attributes_string['gen_ai.request.model'] = 'gpt-4o' AND mapContains(attributes_string, 'gen_ai.request.model') = true) AND has_error = true))
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) > 0
        AND countIf(((attributes_string['gen_ai.request.model'] = 'gpt-4o' AND mapContains(attributes_string, 'gen_ai.request.model') = true) AND has_error = true)) > 0
        AND output_tokens > 500
    ORDER BY input_tokens DESC, last_activity_time ASC, trace_id DESC
    LIMIT 15
),
ranked AS (
    SELECT trace_id, min(start) AS t_start, max(end) AS t_end
    FROM signoz_traces.distributed_trace_summary
    WHERE trace_id GLOBAL IN (SELECT trace_id FROM matched)
      AND end >= fromUnixTimestamp64Nano(1747947419000000000)
      AND start < fromUnixTimestamp64Nano(1747983448000000000)
    GROUP BY trace_id
),
buckets AS (
    SELECT DISTINCT b AS ts_bucket
    FROM ranked
    ARRAY JOIN range(toUInt64(intDiv(toUnixTimestamp(t_start), 1800) * 1800 - 1800), toUInt64(intDiv(toUnixTimestamp(t_end), 1800) * 1800 + 1800), 1800) AS b
)
SELECT trace_id,
    min(timestamp) AS start_time,
    max(timestamp) AS end_time,
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(resource_string_service$$name) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model') = true) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name') = true) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name') = true, attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name') = true) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost') = true, toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_cost_usd,
    maxIf(signoz_traces.distributed_signoz_index_v3.duration_nano, mapContains(attributes_string, 'gen_ai.request.model') = true) AS max_llm_latency_ns,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages') = true, attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages') = true) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages') = true, attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages') = true) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY input_tokens DESC, last_activity_time ASC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span list (requestType raw): delegated to the traces builder with the gate ANDed
// into the user filter, so only gen_ai spans matching the filter come back. Standard
// span columns, single SELECT (no CTE pipeline).
func TestBuild_FullSQL_SpanList_Raw(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	requireSQLEqual(t, `
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
WHERE (((mapContains(attributes_string, 'gen_ai.request.model') = true
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

// ---------------------------------------------------------------------------
// Behavior / branch tests not covered by the goldens above
// ---------------------------------------------------------------------------

// resourceKeysMap returns the gen_ai keys plus a resource-context service.name key so
// resource.* filters route into the fingerprint CTE.
func resourceKeysMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	keys := otelKeysMap()
	keys["service.name"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}}
	return keys
}

// A filter mixing a resource attribute with a span-level and an aggregate condition:
// the resource key routes into __resource_filter (fingerprint prune), the span key stays
// as a countIf existence check, and the aggregate becomes a HAVING — all AND-combined.
func TestBuild_TraceList_ResourcePlusSpanPlusAggregateFilter(t *testing.T) {
	b := newTestBuilderWithKeys(t, resourceKeysMap())
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "resource.service.name = 'checkout' AND has_error = true AND output_tokens > 1000"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	// resource condition -> fingerprint CTE + prune, not applied on the span index.
	require.Contains(t, got, "__resource_filter AS (")
	require.Contains(t, got, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	require.NotContains(t, got, "resources_string['service.name']")
	// span condition -> existence check in matched HAVING.
	require.Contains(t, got, "countIf(has_error = true) > 0")
	// aggregate condition -> HAVING on the matched aggregate alias.
	require.Contains(t, got, "output_tokens")
}

// The resolver-unset (nil) fallback is covered in pkg/telemetryscopedtraces, which
// can construct that builder state directly.

// Trace-level and span-level predicates may not be OR-combined.
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

// An output-only aggregate (span_count / duration_nano) can be displayed but not used
// in the aggregate filter or ORDER BY — it is not computable in the matched pass.
func TestBuild_TraceList_OutputOnlyAggregateRejected(t *testing.T) {
	b := newTestBuilder(t)

	// filter by span_count -> rejected
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Filter: &qbtypes.Filter{Expression: "span_count > 3"},
		}, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "span_count")

	// order by duration_nano -> rejected
	_, err = b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
			Order: []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "duration_nano"}}, Direction: qbtypes.OrderDirectionDesc}},
		}, nil)
	require.Error(t, err)
	require.Contains(t, err.Error(), "unsupported order key")
}

// A HAVING referencing a non-aggregate column is rejected.
func TestBuild_TraceList_Having_UnknownColumn(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Having: &qbtypes.Having{Expression: "service.name > 1"}, // not an aggregate column
		Limit:  10,
	}
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
}

// Ordering by an unknown key is rejected.
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

// With no limit set, the builder applies the default of 100.
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

// Only trace list and span list (raw) are supported; distribution is not.
func TestBuild_UnsupportedRequestType(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Source: telemetrytypes.SourceAI,
		Aggregations: []qbtypes.TraceAggregation{
			{Expression: "count()"},
		},
	}
	_, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeDistribution, query, nil)
	require.ErrorIs(t, err, scopedtraces.ErrUnsupportedRequestType)
}

// A gate key ingested under several data types (e.g. string + number from a
// misbehaving SDK) contributes ALL variants to the mask, OR-combined — not just
// the first — matching the standard visitor's EXISTS handling.
func TestBuild_TraceList_MultiVariantGateKey(t *testing.T) {
	keys := otelKeysMap()
	keys[telemetrytypes.GenAIToolName] = append(keys[telemetrytypes.GenAIToolName], &telemetrytypes.TelemetryFieldKey{
		Name:          telemetrytypes.GenAIToolName,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeFloat64,
	})
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI, Limit: 10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	require.Contains(t, got, "mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_number, 'gen_ai.tool.name') = true")
}

// `tracefield.` is the explicit trace field context, so in a filter it marks a
// trace-level aggregate exactly like the user-facing `trace.` prefix — same statement,
// and the same targeted rejection for a non-filterable aggregate. (Filter and Having
// accept the same forms; the splitter used to misroute tracefield. as span-level.)
func TestBuild_TraceList_TracefieldPrefixMatchesTracePrefix(t *testing.T) {
	b := newTestBuilder(t)
	build := func(expr string) (*qbtypes.Statement, error) {
		return b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  20,
			}, nil)
	}

	viaTrace, err := build("trace.output_tokens > 1000")
	require.NoError(t, err)
	viaTracefield, err := build("tracefield.output_tokens > 1000")
	require.NoError(t, err)
	require.Equal(t, viaTrace.Query, viaTracefield.Query)
	require.Equal(t, viaTrace.Args, viaTracefield.Args)

	// output-only aggregate under tracefield. gets the aggregate rejection, not an
	// unknown-span-field failure.
	_, err = build("tracefield.span_count > 3")
	require.Error(t, err)
	require.Contains(t, err.Error(), "cannot be used")
}

// Query variables in a trace-level condition resolve through the standard filter
// pipeline, exactly like span-level filters: bound args, list/IN handling, dynamic
// __all__ dropping the condition.
func TestBuild_TraceList_VariableInAggregateFilter(t *testing.T) {
	b := newTestBuilder(t)
	build := func(expr string, vars map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
		return b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  20,
			}, vars)
	}

	// scalar variable -> replaced to a literal (canonical pkg/variables semantics),
	// then parsed and bound as an arg by the filter pipeline
	stmt, err := build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Value: 700}})
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "HAVING output_tokens > ?")
	require.Contains(t, stmt.Args, float64(700))

	// list variable with IN
	stmt, err = build("trace.llm_call_count IN $counts",
		map[string]qbtypes.VariableItem{"counts": {Value: []any{1, 2}}})
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "HAVING llm_call_count IN (?, ?)")

	// dynamic __all__ -> condition dropped, no HAVING at all
	stmt, err = build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	require.NotContains(t, stmt.Query, "HAVING")

	// unresolved variable -> rejected, not compared as a literal
	_, err = build("trace.output_tokens > $missing", map[string]qbtypes.VariableItem{"other": {Value: 1}})
	require.Error(t, err)
}
