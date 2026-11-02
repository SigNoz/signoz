package impltracedetail_test

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail"
	"github.com/SigNoz/signoz/pkg/telemetryschema/aitelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes/spantypestest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

var (
	testTraceID = "trace-abc123"
	testStart   = time.Unix(1000, 0).UTC()
	testEnd     = time.Unix(2000, 0).UTC()
	testBounds  = &spantypes.TraceBounds{
		TraceID:  testTraceID,
		Start:    testStart,
		End:      testEnd,
		NumSpans: 10,
	}
	svcNameField = telemetrytypes.TelemetryFieldKey{
		Name:         "service.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}
	unsupportedField = telemetrytypes.TelemetryFieldKey{
		Name:         "http.method",
		FieldContext: telemetrytypes.FieldContextSpan,
	}
)

func newTestStore(matcher sqlmock.QueryMatcher) *spantypestest.TraceStoreTest {
	return newTestStoreWithMetadata(matcher, telemetrytypestest.NewMockMetadataStore(), nil)
}

func newTestStoreWithMetadata(matcher sqlmock.QueryMatcher, metadataStore telemetrytypes.MetadataStore, fl flagger.Flagger) *spantypestest.TraceStoreTest {
	ts := telemetrystoretest.New(telemetrystore.Config{}, matcher)
	return spantypestest.New(impltracedetail.NewTraceStore(ts, metadataStore, fl), ts.Mock())
}

func TestGetTraceBounds(t *testing.T) {
	expectedSQL := "SELECT trace_id, min(start) AS start, max(end) AS end, sum(num_spans) AS num_spans FROM signoz_traces.distributed_trace_summary WHERE trace_id = ? GROUP BY trace_id"

	t.Run("ValidTraceID_GeneratesExpectedSQL", func(t *testing.T) {
		s := newTestStore(sqlmock.QueryMatcherRegexp)
		s.Mock().ExpectQueryRow(regexp.QuoteMeta(expectedSQL)).
			WillReturnRow(cmock.NewRow(nil, nil))
		_, _ = s.Store().GetTraceBounds(context.Background(), testTraceID)
		assert.NoError(t, s.Mock().ExpectationsWereMet())
	})
}

// genAIMetadataStore seeds the gen_ai keys as ingested; with a release time the
// JSON attributes column is registered as their newer home.
func genAIMetadataStore(jsonRelease *time.Time) *telemetrytypestest.MockMetadataStore {
	metadataStore := telemetrytypestest.NewMockMetadataStore()
	for name, def := range aitelemetryschema.GenAIFields {
		key := def
		metadataStore.KeysMap[name] = []*telemetrytypes.TelemetryFieldKey{&key}
	}
	if jsonRelease != nil {
		selector := telemetrytypes.EvolutionSelector{Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldName: "__all__"}
		metadataStore.ColumnEvolutionMetadataMap[selector.QualifiedName()] = tracestelemetryschema.MockAttributeEvolutionData(*jsonRelease)
	}
	return metadataStore
}

func TestGetTraceStats(t *testing.T) {
	jsonInsideTrace := testStart.Add(500 * time.Second)
	jsonBeforeTrace := testStart.Add(-500 * time.Second)
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureUseTraceAttributesJSON.String(): true})

	testCases := []struct {
		name        string
		jsonRelease *time.Time
		expectedSQL string
	}{
		{
			name:        "LegacyMaps",
			expectedSQL: "SELECT toUInt64(min(span_start_ns)) AS start_ns, toUInt64(max(span_end_ns)) AS end_ns, count() AS total_spans, countIf(has_error) AS total_error_spans, countIf(has_missing_parent) > 0 AS has_missing_spans, argMinIf(root_service, (span_start_ns, root_name), is_root) AS root_service_name, argMinIf(root_name, (span_start_ns, root_name), is_root) AS root_entry_point, argMinIf(root_status_code, (span_start_ns, root_name), is_root) AS root_span_status_code, countIf(is_gen_ai) AS gen_ai_span_count, toUInt64(coalesce(sum(input_tokens_value), 0)) AS input_tokens, toUInt64(coalesce(sum(output_tokens_value), 0)) AS output_tokens, toUInt64(coalesce(sum(cache_read_tokens_value), 0)) AS cache_read_tokens, toUInt64(coalesce(sum(cache_write_tokens_value), 0)) AS cache_write_tokens, toUInt64(coalesce(sum(reasoning_tokens_value), 0)) AS reasoning_tokens, sum(total_cost_value) AS total_cost FROM (SELECT toUnixTimestamp64Nano(timestamp) AS span_start_ns, span_start_ns + duration_nano AS span_end_ns, span_id, has_error, (parent_span_id <> '' AND parent_span_id GLOBAL NOT IN (SELECT span_id FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?)) AS has_missing_parent, (parent_span_id = '' OR has_missing_parent) AS is_root, if(parent_span_id = '', name, 'Missing Span') AS root_name, if(parent_span_id = '', resource_string_service$$name, '') AS root_service, if(parent_span_id = '', response_status_code, '') AS root_status_code, (mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name')) AS is_gen_ai, multiIf(mapContains(attributes_number, 'gen_ai.usage.input_tokens'), toFloat64(attributes_number['gen_ai.usage.input_tokens']), NULL) AS input_tokens_value, multiIf(mapContains(attributes_number, 'gen_ai.usage.output_tokens'), toFloat64(attributes_number['gen_ai.usage.output_tokens']), NULL) AS output_tokens_value, multiIf(mapContains(attributes_number, 'gen_ai.usage.cache_read.input_tokens'), toFloat64(attributes_number['gen_ai.usage.cache_read.input_tokens']), NULL) AS cache_read_tokens_value, multiIf(mapContains(attributes_number, 'gen_ai.usage.cache_creation.input_tokens'), toFloat64(attributes_number['gen_ai.usage.cache_creation.input_tokens']), NULL) AS cache_write_tokens_value, multiIf(mapContains(attributes_number, 'gen_ai.usage.reasoning.output_tokens'), toFloat64(attributes_number['gen_ai.usage.reasoning.output_tokens']), NULL) AS reasoning_tokens_value, multiIf(mapContains(attributes_number, 'signoz.gen_ai.usage.tokens.cost'), toFloat64(attributes_number['signoz.gen_ai.usage.tokens.cost']), NULL) AS total_cost_value FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? LIMIT 1 BY span_id) AS spans",
		},
		{
			name:        "JSONEvolutionInsideTrace_ReadsBothColumns",
			jsonRelease: &jsonInsideTrace,
			expectedSQL: "SELECT toUInt64(min(span_start_ns)) AS start_ns, toUInt64(max(span_end_ns)) AS end_ns, count() AS total_spans, countIf(has_error) AS total_error_spans, countIf(has_missing_parent) > 0 AS has_missing_spans, argMinIf(root_service, (span_start_ns, root_name), is_root) AS root_service_name, argMinIf(root_name, (span_start_ns, root_name), is_root) AS root_entry_point, argMinIf(root_status_code, (span_start_ns, root_name), is_root) AS root_span_status_code, countIf(is_gen_ai) AS gen_ai_span_count, toUInt64(coalesce(sum(input_tokens_value), 0)) AS input_tokens, toUInt64(coalesce(sum(output_tokens_value), 0)) AS output_tokens, toUInt64(coalesce(sum(cache_read_tokens_value), 0)) AS cache_read_tokens, toUInt64(coalesce(sum(cache_write_tokens_value), 0)) AS cache_write_tokens, toUInt64(coalesce(sum(reasoning_tokens_value), 0)) AS reasoning_tokens, sum(total_cost_value) AS total_cost FROM (SELECT toUnixTimestamp64Nano(timestamp) AS span_start_ns, span_start_ns + duration_nano AS span_end_ns, span_id, has_error, (parent_span_id <> '' AND parent_span_id GLOBAL NOT IN (SELECT span_id FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?)) AS has_missing_parent, (parent_span_id = '' OR has_missing_parent) AS is_root, if(parent_span_id = '', name, 'Missing Span') AS root_name, if(parent_span_id = '', resource_string_service$$name, '') AS root_service, if(parent_span_id = '', response_status_code, '') AS root_status_code, (multiIf(attributes.`gen_ai.request.model` IS NOT NULL, attributes.`gen_ai.request.model`::String, mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL) IS NOT NULL OR multiIf(attributes.`gen_ai.tool.name` IS NOT NULL, attributes.`gen_ai.tool.name`::String, mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL) IS NOT NULL OR multiIf(attributes.`gen_ai.agent.name` IS NOT NULL, attributes.`gen_ai.agent.name`::String, mapContains(attributes_string, 'gen_ai.agent.name'), attributes_string['gen_ai.agent.name'], NULL) IS NOT NULL) AS is_gen_ai, toFloat64(multiIf(toFloat64OrNull(attributes.`gen_ai.usage.input_tokens`::String) IS NOT NULL, toFloat64OrNull(attributes.`gen_ai.usage.input_tokens`::String), mapContains(attributes_number, 'gen_ai.usage.input_tokens'), attributes_number['gen_ai.usage.input_tokens'], NULL)) AS input_tokens_value, toFloat64(multiIf(toFloat64OrNull(attributes.`gen_ai.usage.output_tokens`::String) IS NOT NULL, toFloat64OrNull(attributes.`gen_ai.usage.output_tokens`::String), mapContains(attributes_number, 'gen_ai.usage.output_tokens'), attributes_number['gen_ai.usage.output_tokens'], NULL)) AS output_tokens_value, toFloat64(multiIf(toFloat64OrNull(attributes.`gen_ai.usage.cache_read.input_tokens`::String) IS NOT NULL, toFloat64OrNull(attributes.`gen_ai.usage.cache_read.input_tokens`::String), mapContains(attributes_number, 'gen_ai.usage.cache_read.input_tokens'), attributes_number['gen_ai.usage.cache_read.input_tokens'], NULL)) AS cache_read_tokens_value, toFloat64(multiIf(toFloat64OrNull(attributes.`gen_ai.usage.cache_creation.input_tokens`::String) IS NOT NULL, toFloat64OrNull(attributes.`gen_ai.usage.cache_creation.input_tokens`::String), mapContains(attributes_number, 'gen_ai.usage.cache_creation.input_tokens'), attributes_number['gen_ai.usage.cache_creation.input_tokens'], NULL)) AS cache_write_tokens_value, toFloat64(multiIf(toFloat64OrNull(attributes.`gen_ai.usage.reasoning.output_tokens`::String) IS NOT NULL, toFloat64OrNull(attributes.`gen_ai.usage.reasoning.output_tokens`::String), mapContains(attributes_number, 'gen_ai.usage.reasoning.output_tokens'), attributes_number['gen_ai.usage.reasoning.output_tokens'], NULL)) AS reasoning_tokens_value, toFloat64(multiIf(toFloat64OrNull(attributes.`signoz.gen_ai.usage.tokens.cost`::String) IS NOT NULL, toFloat64OrNull(attributes.`signoz.gen_ai.usage.tokens.cost`::String), mapContains(attributes_number, 'signoz.gen_ai.usage.tokens.cost'), attributes_number['signoz.gen_ai.usage.tokens.cost'], NULL)) AS total_cost_value FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? LIMIT 1 BY span_id) AS spans",
		},
		{
			name:        "JSONEvolutionBeforeTrace_ReadsJSONOnly",
			jsonRelease: &jsonBeforeTrace,
			expectedSQL: "SELECT toUInt64(min(span_start_ns)) AS start_ns, toUInt64(max(span_end_ns)) AS end_ns, count() AS total_spans, countIf(has_error) AS total_error_spans, countIf(has_missing_parent) > 0 AS has_missing_spans, argMinIf(root_service, (span_start_ns, root_name), is_root) AS root_service_name, argMinIf(root_name, (span_start_ns, root_name), is_root) AS root_entry_point, argMinIf(root_status_code, (span_start_ns, root_name), is_root) AS root_span_status_code, countIf(is_gen_ai) AS gen_ai_span_count, toUInt64(coalesce(sum(input_tokens_value), 0)) AS input_tokens, toUInt64(coalesce(sum(output_tokens_value), 0)) AS output_tokens, toUInt64(coalesce(sum(cache_read_tokens_value), 0)) AS cache_read_tokens, toUInt64(coalesce(sum(cache_write_tokens_value), 0)) AS cache_write_tokens, toUInt64(coalesce(sum(reasoning_tokens_value), 0)) AS reasoning_tokens, sum(total_cost_value) AS total_cost FROM (SELECT toUnixTimestamp64Nano(timestamp) AS span_start_ns, span_start_ns + duration_nano AS span_end_ns, span_id, has_error, (parent_span_id <> '' AND parent_span_id GLOBAL NOT IN (SELECT span_id FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?)) AS has_missing_parent, (parent_span_id = '' OR has_missing_parent) AS is_root, if(parent_span_id = '', name, 'Missing Span') AS root_name, if(parent_span_id = '', resource_string_service$$name, '') AS root_service, if(parent_span_id = '', response_status_code, '') AS root_status_code, (attributes.`gen_ai.request.model` IS NOT NULL OR attributes.`gen_ai.tool.name` IS NOT NULL OR attributes.`gen_ai.agent.name` IS NOT NULL) AS is_gen_ai, toFloat64OrNull(attributes.`gen_ai.usage.input_tokens`::String) AS input_tokens_value, toFloat64OrNull(attributes.`gen_ai.usage.output_tokens`::String) AS output_tokens_value, toFloat64OrNull(attributes.`gen_ai.usage.cache_read.input_tokens`::String) AS cache_read_tokens_value, toFloat64OrNull(attributes.`gen_ai.usage.cache_creation.input_tokens`::String) AS cache_write_tokens_value, toFloat64OrNull(attributes.`gen_ai.usage.reasoning.output_tokens`::String) AS reasoning_tokens_value, toFloat64OrNull(attributes.`signoz.gen_ai.usage.tokens.cost`::String) AS total_cost_value FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? LIMIT 1 BY span_id) AS spans",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			s := newTestStoreWithMetadata(sqlmock.QueryMatcherEqual, genAIMetadataStore(testCase.jsonRelease), fl)
			s.Mock().ExpectQueryRow(testCase.expectedSQL).
				WillReturnRow(cmock.NewRow(nil, nil))
			_, _ = s.Store().GetTraceStats(context.Background(), valuer.GenerateUUID(), testTraceID, testBounds)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetMinimalSpans(t *testing.T) {
	expectedSQL := "SELECT DISTINCT ON (span_id) span_id, parent_span_id, timestamp, duration_nano, has_error, resource_string_service$$name FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY timestamp ASC, name ASC"

	t.Run("ValidRange_GeneratesExpectedSQL", func(t *testing.T) {
		s := newTestStore(sqlmock.QueryMatcherRegexp)
		s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
			WillReturnRows(cmock.NewRows(nil, nil))
		_, _ = s.Store().GetMinimalSpans(context.Background(), testTraceID, testStart, testEnd)
		assert.NoError(t, s.Mock().ExpectationsWereMet())
	})
}

func TestGetSpanCountByField(t *testing.T) {
	expectedSQL := "SELECT resource.`service.name`::String AS field_value, count(DISTINCT span_id) AS count FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(resource.`service.name`::String) GROUP BY field_value"

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		wantQuery bool
	}{
		{name: "ResourceField_GeneratesExpectedSQL", field: svcNameField, wantQuery: true},
		{name: "NonResourceField_NoSQLGenerated", field: unsupportedField},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.wantQuery {
				s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(nil, nil))
			}
			_, _ = s.Store().GetSpanCountByField(context.Background(), testTraceID, testBounds, tc.field)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetTraceSpans(t *testing.T) {
	expectedSQL := "SELECT DISTINCT ON (span_id) timestamp, duration_nano, span_id, has_error, kind, resource_string_service$$name, name, attributes, resources_string, scope, if(notEmpty(attributes), map(), attributes_string) AS attributes_string, if(notEmpty(attributes), map(), attributes_number) AS attributes_number, if(notEmpty(attributes), map(), attributes_bool) AS attributes_bool, events, status_message, status_code_string, kind_string, parent_span_id, flags, is_remote, trace_state, status_code, db_name, db_operation, http_method, http_url, http_host, external_http_method, external_http_url, response_status_code, links as references FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY timestamp ASC, name ASC"

	s := newTestStore(sqlmock.QueryMatcherEqual)
	s.Mock().ExpectSelect(expectedSQL).
		WillReturnRows(cmock.NewRows(nil, nil))
	_, _ = s.Store().GetTraceSpans(context.Background(), testTraceID, testBounds)
	assert.NoError(t, s.Mock().ExpectationsWereMet())
}

func TestGetFlamegraphSpans(t *testing.T) {
	testCases := []struct {
		name    string
		spanIDs []string
		sql     string
	}{
		{
			name: "NoSpanIDs_GeneratesBaseSQL",
			sql:  "SELECT span_id, any(parent_span_id) AS parent_span_id, any(timestamp) AS timestamp, any(duration_nano) AS duration_nano, any(has_error) AS has_error, any(name) AS name, any(events) AS events, any(attributes) AS attributes, if(notEmpty(attributes), map(), any(attributes_string)) AS attributes_string, if(notEmpty(attributes), map(), any(attributes_number)) AS attributes_number, if(notEmpty(attributes), map(), any(attributes_bool)) AS attributes_bool, any(resources_string) AS resources_string, any(scope) AS scope FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY span_id ORDER BY timestamp ASC, name ASC",
		},
		{
			name:    "WithSpanIDs_GeneratesInClauseSQL",
			spanIDs: []string{"span-1", "span-2"},
			sql:     "SELECT span_id, any(parent_span_id) AS parent_span_id, any(timestamp) AS timestamp, any(duration_nano) AS duration_nano, any(has_error) AS has_error, any(name) AS name, any(events) AS events, any(attributes) AS attributes, if(notEmpty(attributes), map(), any(attributes_string)) AS attributes_string, if(notEmpty(attributes), map(), any(attributes_number)) AS attributes_number, if(notEmpty(attributes), map(), any(attributes_bool)) AS attributes_bool, any(resources_string) AS resources_string, any(scope) AS scope FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND span_id IN (?, ?) GROUP BY span_id ORDER BY timestamp ASC, name ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherEqual)
			s.Mock().ExpectSelect(testCase.sql).
				WillReturnRows(cmock.NewRows(nil, nil))
			_, _ = s.Store().GetFlamegraphSpans(context.Background(), testTraceID, testStart, testEnd, testCase.spanIDs)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetSpanDurationByField(t *testing.T) {

	expectedSQL := "WITH all_spans AS (SELECT DISTINCT ON (span_id) resource.`service.name`::String AS field_value, toUnixTimestamp64Nano(timestamp) AS start_ns, start_ns + duration_nano AS end_ns FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(field_value) ORDER BY timestamp ASC, name ASC), effective_start AS (SELECT field_value, end_ns, greatest(start_ns, ifNull(max(end_ns) OVER (PARTITION BY field_value ORDER BY start_ns ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), toUInt64(0))) AS effective_start_ns FROM all_spans) SELECT field_value, sum(toUInt64(greatest(end_ns - effective_start_ns, 0))) AS total_ns FROM effective_start GROUP BY field_value"

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		wantQuery bool
	}{
		{name: "ResourceField_GeneratesExpectedSQL", field: svcNameField, wantQuery: true},
		{name: "NonResourceField_NoSQLGenerated", field: unsupportedField},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.wantQuery {
				s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(nil, nil))
			}
			_, _ = s.Store().GetSpanDurationByField(context.Background(), testTraceID, testBounds, tc.field)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetThreadSpans(t *testing.T) {
	selectSQL := "SELECT DISTINCT ON (span_id) timestamp, duration_nano, span_id, parent_span_id, has_error, name, kind_string, status_code_string, status_message, resources_string, attributes, attributes_string, attributes_number, attributes_bool, events, links as references"
	fromSQL := " FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND "
	orderSQL := " ORDER BY timestamp ASC, span_id ASC LIMIT ?"
	jsonInsideTrace := testStart.Add(500 * time.Second)

	testCases := []struct {
		name        string
		jsonOn      bool
		jsonRelease *time.Time
		whereSQL    string
	}{
		{
			name:        "FlagOff_FiltersLegacyMaps",
			jsonRelease: &jsonInsideTrace,
			whereSQL:    "(mapContains(attributes_string, 'gen_ai.request.model') OR mapContains(attributes_string, 'gen_ai.tool.name') OR mapContains(attributes_string, 'gen_ai.agent.name'))",
		},
		{
			name:        "FlagOn_ReleasedDuringTrace_FiltersJSONThenMaps",
			jsonOn:      true,
			jsonRelease: &jsonInsideTrace,
			whereSQL:    "(multiIf(attributes.`gen_ai.request.model` IS NOT NULL, attributes.`gen_ai.request.model`::String, mapContains(attributes_string, 'gen_ai.request.model'), attributes_string['gen_ai.request.model'], NULL) IS NOT NULL OR multiIf(attributes.`gen_ai.tool.name` IS NOT NULL, attributes.`gen_ai.tool.name`::String, mapContains(attributes_string, 'gen_ai.tool.name'), attributes_string['gen_ai.tool.name'], NULL) IS NOT NULL OR multiIf(attributes.`gen_ai.agent.name` IS NOT NULL, attributes.`gen_ai.agent.name`::String, mapContains(attributes_string, 'gen_ai.agent.name'), attributes_string['gen_ai.agent.name'], NULL) IS NOT NULL)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fl := flaggertest.WithBooleanFlags(t, map[string]bool{flagger.FeatureUseTraceAttributesJSON.String(): testCase.jsonOn})
			s := newTestStoreWithMetadata(sqlmock.QueryMatcherRegexp, genAIMetadataStore(testCase.jsonRelease), fl)
			s.Mock().ExpectSelect(regexp.QuoteMeta(selectSQL + fromSQL + testCase.whereSQL + orderSQL)).
				WillReturnRows(cmock.NewRows(nil, nil))
			_, _ = s.Store().GetThreadSpans(context.Background(), valuer.GenerateUUID(), testTraceID, testBounds, spantypes.ThreadPage{Limit: 3})
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}
