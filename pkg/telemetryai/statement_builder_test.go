package telemetryai

import (
	"context"
	"fmt"
	"strings"
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

	m := make(map[string][]*telemetrytypes.TelemetryFieldKey)

	// gen_ai semconv keys sourced from the single source of truth, mirroring what the
	// production metadata store surfaces via enrichWithGenAIKeys.
	for name, def := range telemetrytypes.GenAIFieldDefinitions {
		keyCopy := def
		m[name] = []*telemetrytypes.TelemetryFieldKey{&keyCopy}
	}

	// Extra keys these tests reference that aren't gen_ai semconv definitions.
	m["gen_ai.user.id"] = []*telemetrytypes.TelemetryFieldKey{strKey("gen_ai.user.id")}
	m["gen_ai.usage.cost"] = []*telemetrytypes.TelemetryFieldKey{numKey("gen_ai.usage.cost")}
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
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
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
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
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
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
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
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
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
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens') = true, toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens') = true, toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') = true OR mapContains(attributes_string, 'gen_ai.tool.name') = true OR mapContains(attributes_string, 'gen_ai.agent.name') = true)) AS last_activity_time
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
	require.ErrorIs(t, err, ErrUnsupportedRequestType)
}

// ---------------------------------------------------------------------------
// Filter operator resolution
//
// The goldens pin the CTE structure; these pin how each filter OPERATOR resolves into
// SQL (the part that varies with the operator, not the pipeline). Span-level operators
// resolve to a predicate that appears both in the widened WHERE prune and as a
// countIf(...) > 0 existence check; aggregate operators become a HAVING (values inlined).
// ---------------------------------------------------------------------------

func TestBuild_TraceList_SpanFilterOperatorResolution(t *testing.T) {
	b := newTestBuilder(t)
	build := func(t *testing.T, expr string) string {
		stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
				Filter: &qbtypes.Filter{Expression: expr}, Limit: 5,
			}, nil)
		require.NoError(t, err)
		return stmt.Query
	}

	cases := []struct{ name, expr, frag string }{
		{"not_equal", "gen_ai.request.model != 'gpt-4o'",
			"attributes_string['gen_ai.request.model'] <> ?"},
		{"in", "gen_ai.request.model IN ('gpt-4o', 'gpt-4')",
			"(attributes_string['gen_ai.request.model'] = ? OR attributes_string['gen_ai.request.model'] = ?) AND mapContains(attributes_string, 'gen_ai.request.model') = ?"},
		{"exists", "gen_ai.user.id EXISTS", // non-gate key, so the fragment is unambiguous
			"mapContains(attributes_string, 'gen_ai.user.id') = ?"},
		{"not_exists", "gen_ai.user.id NOT EXISTS",
			"mapContains(attributes_string, 'gen_ai.user.id') <> ?"},
		{"contains", "gen_ai.request.model CONTAINS 'gpt'", // case-insensitive
			"LOWER(attributes_string['gen_ai.request.model']) LIKE LOWER(?)"},
		{"like", "gen_ai.request.model LIKE 'gpt%'",
			"attributes_string['gen_ai.request.model'] LIKE ?"},
		{"numeric_gte", "gen_ai.usage.output_tokens >= 100", // span attr (Float64), distinct from the output_tokens aggregate
			"toFloat64(attributes_number['gen_ai.usage.output_tokens']) >= ? AND mapContains(attributes_number, 'gen_ai.usage.output_tokens') = ?"},
		{"not_group", "NOT (gen_ai.request.model = 'gpt-4o')",
			"NOT (((attributes_string['gen_ai.request.model'] = ? AND mapContains(attributes_string, 'gen_ai.request.model') = ?)))"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// the resolved predicate appears in the widened WHERE prune and (wrapped) in
			// the countIf existence check; the goldens pin the countIf structure, here we
			// pin only the operator's resolution.
			require.Contains(t, build(t, c.expr), c.frag)
		})
	}
}

func TestBuild_TraceList_AggregateFilterOperatorResolution(t *testing.T) {
	b := newTestBuilder(t)
	build := func(t *testing.T, expr string) (string, error) {
		stmt, err := b.Build(context.Background(), testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces, Source: telemetrytypes.SourceAI,
				Filter: &qbtypes.Filter{Expression: expr}, Limit: 5,
			}, nil)
		if err != nil {
			return "", err
		}
		return stmt.Query, nil
	}

	// values are inlined by the HAVING rewriter (not parameterized).
	cases := []struct{ name, expr, having string }{
		{"less_than", "output_tokens < 500", "HAVING output_tokens < 500"},
		{"not_equal", "output_tokens != 0", "HAVING output_tokens != 0"},
		{"range_and", "output_tokens >= 500 AND output_tokens <= 1000", "HAVING (output_tokens >= 500 AND output_tokens <= 1000)"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := build(t, c.expr)
			require.NoError(t, err)
			require.Contains(t, q, c.having)
		})
	}

	// BETWEEN is not supported by the HAVING rewriter — surfaced as an error, not silently wrong.
	t.Run("between_unsupported", func(t *testing.T) {
		_, err := build(t, "output_tokens BETWEEN 500 AND 1000")
		require.Error(t, err)
	})
}
