package aistatementbuilder

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	scopedtraces "github.com/SigNoz/signoz/pkg/statementbuilder/scopedtracesstatementbuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// otelKeysMap seeds the gen_ai semconv keys the AI queries reference.
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

	// mirrors what enrichWithGenAIKeys surfaces in production
	for name, def := range telemetrytypes.GenAIFieldDefinitions {
		keyCopy := def
		m[name] = []*telemetrytypes.TelemetryFieldKey{&keyCopy}
	}

	// keys referenced by tests that aren't gen_ai semconv definitions
	m["gen_ai.user.id"] = []*telemetrytypes.TelemetryFieldKey{strKey("gen_ai.user.id")}
	m["_signoz.gen_ai.total_cost"] = []*telemetrytypes.TelemetryFieldKey{numKey("_signoz.gen_ai.total_cost")}
	m["gen_ai.usage.cached_input_tokens"] = []*telemetrytypes.TelemetryFieldKey{numKey("gen_ai.usage.cached_input_tokens")}
	m["has_error"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "has_error",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeBool,
	}}
	// resource-column evolutions so the value expression prefers the JSON resource column
	m["service.name"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "service.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Evolutions:    resourceEvolutions(),
	}}
	return m
}

// resourceEvolutions: legacy resources_string map at epoch 0, JSON resource column
// released inside the test window.
func resourceEvolutions() []*telemetrytypes.EvolutionEntry {
	return []*telemetrytypes.EvolutionEntry{
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "resources_string",
			ColumnType:   "Map(LowCardinality(String), String)",
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "__all__",
			ReleaseTime:  time.Unix(0, 0),
		},
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "resource",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "__all__",
			ReleaseTime:  time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC),
		},
	}
}

// standard test window (ms), matching the traces builder tests.
const (
	testStartMs = uint64(1747947419000)
	testEndMs   = uint64(1747983448000)
)

func newTestBuilder(t *testing.T) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	return newTestBuilderWithKeys(t, otelKeysMap())
}

func newTestBuilderWithKeys(t *testing.T, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	t.Helper()
	settings := instrumentationtest.New().ToProviderSettings()
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = keysMap

	stmtBuilder, err := NewFactory(nil, mockMetadataStore, flaggertest.New(t)).
		New(context.Background(), settings, statementbuilder.Config{SkipResourceFingerprint: statementbuilder.SkipResourceFingerprint{Threshold: 100000}})
	require.NoError(t, err)
	return stmtBuilder
}

// renderSQL substitutes bound args into the `?` placeholders.
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
	assert.Equal(t, len(stmt.Args), argi, "arg count does not match number of placeholders")
	return b.String()
}

func formatArg(a any) string {
	if s, ok := a.(string); ok {
		return "'" + s + "'"
	}
	return fmt.Sprintf("%v", a)
}

// normalizeSQL drops backticks, collapses whitespace, and removes spaces inside
// parens so golden strings can be freely wrapped as raw literals.
func normalizeSQL(s string) string {
	s = strings.Join(strings.Fields(strings.ReplaceAll(s, "`", "")), " ")
	s = strings.ReplaceAll(s, "( ", "(")
	s = strings.ReplaceAll(s, " )", ")")
	return s
}

func assertSQLEqual(t *testing.T, want string, stmt *qbtypes.Statement) {
	t.Helper()
	got := renderSQL(t, stmt)
	t.Logf("\n%s", got)
	assert.Equal(t, normalizeSQL(want), normalizeSQL(got))
}

// No filter: WHERE is just window + gate mask, no HAVING.
func TestBuild_FullSQL_TraceList_NoFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Limit: 20,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')))
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// A materialized gen_ai attribute resolves to its materialized column everywhere it
// appears; un-promoted attributes stay in the attributes map within the same query.
func TestBuild_FullSQL_TraceList_MaterializedColumns(t *testing.T) {
	keys := otelKeysMap()
	for _, name := range []string{"gen_ai.request.model", "gen_ai.usage.input_tokens"} {
		for _, k := range keys[name] {
			k.Materialized = true
		}
	}
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Limit: 20,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (attribute_string_gen_ai$$request$$model_exists OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((attribute_string_gen_ai$$request$$model_exists OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')))
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(attribute_string_gen_ai$$request$$model_exists) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(attribute_number_gen_ai$$usage$$input_tokens_exists, toFloat64(attribute_number_gen_ai$$usage$$input_tokens), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(attribute_number_gen_ai$$usage$$input_tokens_exists, toFloat64(attribute_number_gen_ai$$usage$$input_tokens), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, attribute_string_gen_ai$$request$$model_exists) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (attribute_string_gen_ai$$request$$model_exists OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-level AND trace-level filter with order + pagination: matched selects only the
// aggregates ORDER BY/HAVING reference; the span predicate widens the WHERE prune and
// becomes a countIf existence check.
func TestBuild_FullSQL_TraceList_SpanAndTraceFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini' AND output_tokens > 1000"},
			Order:  []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "output_tokens"}}, Direction: qbtypes.OrderDirectionDesc}},
			Limit:  10, Offset: 30,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
        OR (attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model')))
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) > 0
        AND countIf((attributes_string['gen_ai.request.model'] = 'gpt-4o-mini' AND mapContains(attributes_string, 'gen_ai.request.model'))) > 0
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY output_tokens DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Aggregate-only filter: WHERE prune not widened, no gate/span countIf, just the
// aggregate HAVING; `trace.output_tokens` rewrites to the alias.
func TestBuild_FullSQL_TraceList_AggregateFilterOnly(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')))
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span-only filter: WHERE widened; HAVING has the gate + span countIf pair but no
// trailing aggregate.
func TestBuild_FullSQL_TraceList_SpanFilterOnly(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "has_error = true"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
        OR has_error = true)
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) > 0
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Resource filter: routed into the __resource_filter CTE narrowing the matched scan
// by fingerprint, and dropped from the span predicate — no span-level existence check.
func TestBuild_FullSQL_TraceList_ResourceFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "resource.service.name = 'checkout'"},
			Limit:  20,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
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
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')))
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Mixed span + aggregate filter with a two-key order: matched selects only the
// ORDER BY and HAVING aggregates.
func TestBuild_FullSQL_TraceList_MixedFiltersMultiOrder(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o' AND has_error = true AND output_tokens > 500"},
			Order: []qbtypes.OrderBy{
				{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "input_tokens"}}, Direction: qbtypes.OrderDirectionDesc},
				{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "last_activity_time"}}, Direction: qbtypes.OrderDirectionAsc},
			},
			Limit: 15,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
        OR ((attributes_string['gen_ai.request.model'] = 'gpt-4o' AND mapContains(attributes_string, 'gen_ai.request.model')) AND has_error = true))
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) > 0
        AND countIf(((attributes_string['gen_ai.request.model'] = 'gpt-4o' AND mapContains(attributes_string, 'gen_ai.request.model')) AND has_error = true)) > 0
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.service.name IS NOT NULL, resource.service.name::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS service.name,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY input_tokens DESC, last_activity_time ASC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, stmt)
}

// Span list (raw): delegated to the traces builder with the gate ANDed into the
// user filter.
func TestBuild_FullSQL_SpanList_Raw(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeRaw,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "gen_ai.request.model = 'gpt-4o-mini'"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	assertSQLEqual(t, `
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
WHERE (((mapContains(attributes_string, 'gen_ai.request.model')
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

// ---------------------------------------------------------------------------
// Behavior / branch tests not covered by the goldens above
// ---------------------------------------------------------------------------

// Resource + span + aggregate filter: fingerprint prune, countIf existence check, and
// HAVING respectively, all AND-combined.
func TestBuild_TraceList_ResourcePlusSpanPlusAggregateFilter(t *testing.T) {
	b := newTestBuilder(t)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "resource.service.name = 'checkout' AND has_error = true AND output_tokens > 1000"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	assert.Contains(t, got, "__resource_filter AS (")
	assert.Contains(t, got, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	assert.NotContains(t, got, "resources_string['service.name'] = 'checkout'")
	assert.Contains(t, got, "countIf(has_error = true) > 0")
	assert.Contains(t, got, "output_tokens")
}

// Trace-level and span-level predicates may not be OR-combined.
func TestBuild_TraceList_TraceOrSpanMixRejected(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000 OR gen_ai.request.model = 'x'"},
		Limit:  10,
	}
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be combined")
}

// An output-only aggregate (span_count / trace_duration_nano) can be displayed but not
// filtered or ordered on — it is not computable in the matched pass.
func TestBuild_TraceList_OutputOnlyAggregateRejected(t *testing.T) {
	b := newTestBuilder(t)

	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "span_count > 3"},
		}, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "span_count")

	_, err = b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Order:  []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "trace_duration_nano"}}, Direction: qbtypes.OrderDirectionDesc}},
		}, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported order key")
}

// A bare duration_nano filter is span-level (the trace column is trace_duration_nano).
func TestBuild_TraceList_SpanDurationFilterIsSpanLevel(t *testing.T) {
	keys := otelKeysMap()
	keys["duration_nano"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "duration_nano",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextSpan,
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
	}}
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "duration_nano > 1000000"},
			Limit:  10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	assert.Contains(t, got, "countIf(duration_nano > 1000000) > 0")
	assert.NotContains(t, got, "HAVING trace_duration_nano")
}

// A span attribute named like an aggregate alias is shadowed in bare spelling but
// stays reachable via an explicit context prefix (`attribute.` / `span.`).
func TestBuild_FullSQL_TraceList_AliasAttributeCollision(t *testing.T) {
	keys := otelKeysMap()
	keys["output_tokens"] = []*telemetrytypes.TelemetryFieldKey{{
		Name:          "output_tokens",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
	}}
	b := newTestBuilderWithKeys(t, keys)
	build := func(expr string) *qbtypes.Statement {
		stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  10,
			}, nil)
		require.NoError(t, err)
		return stmt
	}

	attrStmt := build("attribute.output_tokens > 100")
	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))
        OR (toFloat64(attributes_number['output_tokens']) > 100 AND mapContains(attributes_number, 'output_tokens')))
    GROUP BY trace_id
    HAVING countIf((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) > 0
        AND countIf((toFloat64(attributes_number['output_tokens']) > 100 AND mapContains(attributes_number, 'output_tokens'))) > 0
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 10
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.`+"`service.name`"+` IS NOT NULL, resource.`+"`service.name`"+`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`+"`service.name`"+` IS NOT NULL, resource.`+"`service.name`"+`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `+"`service.name`"+`,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, attrStmt)

	assert.Empty(t, attrStmt.Warnings)

	// span. corrects to the same attribute (identical SQL) but the span-context
	// metadata lookup misses, surfacing a key-not-found warning.
	spanStmt := build("span.output_tokens > 100")
	assert.Equal(t, renderSQL(t, attrStmt), renderSQL(t, spanStmt))
	require.Len(t, spanStmt.Warnings, 1)
	assert.Contains(t, spanStmt.Warnings[0], "key `output_tokens` not found in metadata")

	// bare spelling is claimed by the aggregate alias
	bareStmt := build("output_tokens > 100")
	assert.Empty(t, bareStmt.Warnings)
	assertSQLEqual(t, `
WITH matched AS (
    SELECT trace_id,
        sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
        maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time
    FROM signoz_traces.distributed_signoz_index_v3
    WHERE timestamp >= '1747947419000000000'
      AND timestamp < '1747983448000000000'
      AND ts_bucket_start >= 1747945619
      AND ts_bucket_start <= 1747983448
      AND ((mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')))
    GROUP BY trace_id
    HAVING output_tokens > 100
    ORDER BY last_activity_time DESC, trace_id DESC
    LIMIT 10
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
    (max(toUnixTimestamp64Nano(timestamp) + duration_nano) - min(toUnixTimestamp64Nano(timestamp))) AS trace_duration_nano,
    count() AS span_count,
    anyIf(name, parent_span_id = '') AS root_span_name,
    any(multiIf(multiIf(resource.`+"`service.name`"+` IS NOT NULL, resource.`+"`service.name`"+`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`+"`service.name`"+` IS NOT NULL, resource.`+"`service.name`"+`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `+"`service.name`"+`,
    countIf(mapContains(attributes_string, 'gen_ai.request.model')) AS llm_call_count,
    countIf(mapContains(attributes_string, 'gen_ai.tool.name')) AS tool_call_count,
    uniqIf(multiIf(mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL), mapContains(attributes_string, 'gen_ai.tool.name')) AS distinct_tool_count,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)) AS input_tokens,
    sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)) AS output_tokens,
    coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL)), 0) + coalesce(sum(multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL)), 0) AS total_tokens,
    sum(multiIf(mapContains(attributes_number, '_signoz.gen_ai.total_cost'), toFloat64(attributes_number['_signoz.gen_ai.total_cost']), NULL)) AS estimated_total_cost,
    maxIf(duration_nano, mapContains(attributes_string, 'gen_ai.request.model')) AS max_llm_duration_nano,
    countIf(has_error = true) AS error_count,
    maxIf(timestamp, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))) AS last_activity_time,
    argMinIf(multiIf(mapContains(attributes_string, 'gen_ai.input.messages'), attributes_string['gen_ai.input.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.input.messages')) AS input,
    argMaxIf(multiIf(mapContains(attributes_string, 'gen_ai.output.messages'), attributes_string['gen_ai.output.messages'], NULL), timestamp, mapContains(attributes_string, 'gen_ai.output.messages')) AS output
FROM signoz_traces.distributed_signoz_index_v3
WHERE ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)
  AND trace_id GLOBAL IN (SELECT trace_id FROM ranked)
GROUP BY trace_id
ORDER BY last_activity_time DESC, trace_id DESC
SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000
`, bareStmt)
}

// A HAVING referencing a non-aggregate column is rejected.
func TestBuild_TraceList_Having_UnknownColumn(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Having: &qbtypes.Having{Expression: "service.name > 1"}, // not an aggregate column
		Limit:  10,
	}
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
}

// Ordering by an unknown key is rejected.
func TestBuild_TraceList_UnsupportedOrderKey(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Order: []qbtypes.OrderBy{
			{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "http.request.method"}}, Direction: qbtypes.OrderDirectionDesc},
		},
	}
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported order key")
}

// With no limit set, the builder applies the default of 100.
func TestBuild_TraceList_DefaultLimit(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
	}
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace, query, nil)
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "LIMIT ?")
	assert.Contains(t, stmt.Args, 100)
}

// Only trace list and span list (raw) are supported; distribution is not.
func TestBuild_UnsupportedRequestType(t *testing.T) {
	b := newTestBuilder(t)
	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Signal: telemetrytypes.SignalTraces,
		Aggregations: []qbtypes.TraceAggregation{
			{Expression: "count()"},
		},
	}
	_, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeDistribution, query, nil)
	require.ErrorIs(t, err, scopedtraces.ErrUnsupportedRequestType)
}

// A gate key ingested under several data types contributes all variants to the
// mask, OR-combined.
func TestBuild_TraceList_MultiVariantGateKey(t *testing.T) {
	keys := otelKeysMap()
	keys[telemetrytypes.GenAIToolName] = append(keys[telemetrytypes.GenAIToolName], &telemetrytypes.TelemetryFieldKey{
		Name:          telemetrytypes.GenAIToolName,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeFloat64,
	})
	b := newTestBuilderWithKeys(t, keys)
	stmt, err := b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
		qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Signal: telemetrytypes.SignalTraces, Limit: 10,
		}, nil)
	require.NoError(t, err)

	got := renderSQL(t, stmt)
	assert.Contains(t, got, "mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_number, 'gen_ai.tool.name')")
}

// `trace.` marks a trace-level aggregate; `tracefield.` routes trace-level too but is
// not a rewritable alias, so the HAVING rewriter rejects it.
func TestBuild_TraceList_TraceContextPrefix(t *testing.T) {
	b := newTestBuilder(t)
	build := func(q qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]) (*qbtypes.Statement, error) {
		q.Signal, q.Limit = telemetrytypes.SignalTraces, 20
		return b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace, q, nil)
	}

	_, err := build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Filter: &qbtypes.Filter{Expression: "trace.output_tokens > 1000"}})
	require.NoError(t, err)

	_, err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Filter: &qbtypes.Filter{Expression: "tracefield.output_tokens > 1000"}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Invalid references in `Having` expression: [tracefield.output_tokens]")

	_, err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Having: &qbtypes.Having{Expression: "tracefield.output_tokens > 1000"}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Invalid references in `Having` expression: [tracefield.output_tokens]")

	_, err = build(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Filter: &qbtypes.Filter{Expression: "trace.span_count > 3"}})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be used")
}

// Query variables in a trace-level condition are substituted into the HAVING.
func TestBuild_TraceList_VariableInAggregateFilter(t *testing.T) {
	b := newTestBuilder(t)
	build := func(expr string, vars map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
		return b.Build(context.Background(), valuer.UUID{}, testStartMs, testEndMs, qbtypes.RequestTypeTrace,
			qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{Expression: expr},
				Limit:  20,
			}, vars)
	}

	// scalar variable -> literal in HAVING
	stmt, err := build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Value: 700}})
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "HAVING output_tokens > 700")

	// list variable with IN
	stmt, err = build("trace.llm_call_count IN $counts",
		map[string]qbtypes.VariableItem{"counts": {Value: []any{1, 2}}})
	require.NoError(t, err)
	assert.Contains(t, stmt.Query, "HAVING llm_call_count IN")

	// dynamic __all__ -> condition dropped, no HAVING at all
	stmt, err = build("trace.output_tokens > $threshold",
		map[string]qbtypes.VariableItem{"threshold": {Type: qbtypes.DynamicVariableType, Value: "__all__"}})
	require.NoError(t, err)
	assert.NotContains(t, stmt.Query, "HAVING")

	// unresolved variable -> rejected, not compared as a literal
	_, err = build("trace.output_tokens > $missing", map[string]qbtypes.VariableItem{"other": {Value: 1}})
	require.Error(t, err)
}
