package telemetrytraces

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func newTestTraceOperatorStatementBuilder(t *testing.T) *traceOperatorStatementBuilder {
	t.Helper()
	releaseTime := time.Date(2025, 5, 22, 22, 0, 0, 0, time.UTC)
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap(releaseTime)
	fl := flaggertest.New(t)
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil, fl)
	traceStmtBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore, fm, cb, aggExprRewriter, nil, fl, false, 100000,
	)
	return NewTraceOperatorStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore, fm, cb, traceStmtBuilder, aggExprRewriter, fl,
	)
}

func TestTraceOperatorStatementBuilder(t *testing.T) {
	cases := []struct {
		name           string
		requestType    qbtypes.RequestType
		operator       qbtypes.QueryBuilderTraceOperator
		compositeQuery *qbtypes.CompositeQuery
		expected       qbtypes.Statement
		expectedErr    error
	}{
		{
			name:        "simple direct descendant operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A => B",
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{
						Name:          "service.name",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "name",
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				Limit: 10,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_DIR_DESC_B AS (SELECT p.* FROM A AS p INNER JOIN B AS c ON p.trace_id = c.trace_id AND p.span_id = c.parent_span_id) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) AS `service.name` FROM A_DIR_DESC_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "indirect descendant operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A -> B",
				Limit:      5,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'gateway'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'database'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_INDIR_DESC_B AS (WITH RECURSIVE up AS (SELECT d.trace_id, d.span_id, d.parent_span_id, 0 AS depth FROM B AS d UNION ALL SELECT p.trace_id, p.span_id, p.parent_span_id, up.depth + 1 FROM all_spans AS p JOIN up ON p.trace_id = up.trace_id AND p.span_id = up.parent_span_id WHERE up.depth < 100) SELECT DISTINCT a.* FROM A AS a GLOBAL INNER JOIN (SELECT DISTINCT trace_id, span_id FROM up WHERE depth > 0 ) AS ancestors ON ancestors.trace_id = a.trace_id AND ancestors.span_id = a.span_id) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM A_INDIR_DESC_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "gateway", "%service.name%", "%service.name\":\"gateway%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "database", "%service.name%", "%service.name\":\"database%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 5},
			},
			expectedErr: nil,
		},
		{
			name:        "AND operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A && B",
				Limit:      15,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_AND_B AS (SELECT l.* FROM A AS l INNER JOIN B AS r ON l.trace_id = r.trace_id) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM A_AND_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 15},
			},
			expectedErr: nil,
		},
		{
			name:        "OR operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A || B",
				Limit:      20,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_OR_B AS (SELECT * FROM A UNION DISTINCT SELECT * FROM B) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM A_OR_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 20},
			},
			expectedErr: nil,
		},
		{
			name:        "NOT operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A NOT B",
				Limit:      10,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_not_B AS (SELECT l.* FROM A AS l WHERE l.trace_id GLOBAL NOT IN (SELECT DISTINCT trace_id FROM B)) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM A_not_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "time series query with aggregations",
			requestType: qbtypes.RequestTypeTimeSeries,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression:   "A => B",
				StepInterval: qbtypes.Step{Duration: 60 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_DIR_DESC_B AS (SELECT p.* FROM A AS p INNER JOIN B AS c ON p.trace_id = c.trace_id AND p.span_id = c.parent_span_id) SELECT toStartOfInterval(timestamp, INTERVAL 60 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM A_DIR_DESC_B GROUP BY ts, `service.name` ORDER BY ts desc SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "scalar query with aggregation and group by",
			requestType: qbtypes.RequestTypeScalar,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A && B",
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "avg(duration_nano)",
					},
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name: "__result_0",
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
				Limit: 10,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "response_status_code < 400",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND toFloat64(response_status_code) < ?), A_AND_B AS (SELECT l.* FROM A AS l INNER JOIN B AS r ON l.trace_id = r.trace_id) SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, avg(multiIf(duration_nano <> ?, duration_nano, NULL)) AS __result_0 FROM A_AND_B GROUP BY `service.name` ORDER BY __result_0 desc SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), float64(400), 0},
			},
			expectedErr: nil,
		},
		{
			name:        "complex nested expression",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "(A => B) && (C => D)",
				Limit:      5,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'frontend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'backend'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'auth'",
							},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "D",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{
								Expression: "service.name = 'database'",
							},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_DIR_DESC_B AS (SELECT p.* FROM A AS p INNER JOIN B AS c ON p.trace_id = c.trace_id AND p.span_id = c.parent_span_id), __resource_filter_C AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), C AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_C) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_D AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), D AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_D) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), C_DIR_DESC_D AS (SELECT p.* FROM C AS p INNER JOIN D AS c ON p.trace_id = c.trace_id AND p.span_id = c.parent_span_id), A_DIR_DESC_B_AND_C_DIR_DESC_D AS (SELECT l.* FROM A_DIR_DESC_B AS l INNER JOIN C_DIR_DESC_D AS r ON l.trace_id = r.trace_id) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM A_DIR_DESC_B_AND_C_DIR_DESC_D ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "frontend", "%service.name%", "%service.name\":\"frontend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "backend", "%service.name%", "%service.name\":\"backend%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "auth", "%service.name%", "%service.name\":\"auth%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "database", "%service.name%", "%service.name\":\"database%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 5},
			},
			expectedErr: nil,
		},
		{
			name:        "returnSpansFrom B: A -> B return B spans filtered by operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression:      "A -> B",
				ReturnSpansFrom: "B",
				Limit:           10,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{Expression: "service.name = 'gateway'"},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{Expression: "service.name = 'database'"},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_INDIR_DESC_B AS (WITH RECURSIVE up AS (SELECT d.trace_id, d.span_id, d.parent_span_id, 0 AS depth FROM B AS d UNION ALL SELECT p.trace_id, p.span_id, p.parent_span_id, up.depth + 1 FROM all_spans AS p JOIN up ON p.trace_id = up.trace_id AND p.span_id = up.parent_span_id WHERE up.depth < 100) SELECT DISTINCT a.* FROM A AS a GLOBAL INNER JOIN (SELECT DISTINCT trace_id, span_id FROM up WHERE depth > 0 ) AS ancestors ON ancestors.trace_id = a.trace_id AND ancestors.span_id = a.span_id), __return_from_B AS (SELECT * FROM B WHERE trace_id IN (SELECT DISTINCT trace_id FROM A_INDIR_DESC_B)) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM __return_from_B ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "gateway", "%service.name%", "%service.name\":\"gateway%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "database", "%service.name%", "%service.name\":\"database%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "returnSpansFrom C: (A -> B) && C return C spans filtered by operator",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression:      "(A -> B) && C",
				ReturnSpansFrom: "C",
				Limit:           10,
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{Expression: "service.name = 'gateway'"},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{Expression: "service.name = 'database'"},
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "C",
							Signal: telemetrytypes.SignalTraces,
							Filter: &qbtypes.Filter{Expression: "service.name = 'auth'"},
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH toDateTime64(1747947419000000000, 9) AS t_from, toDateTime64(1747983448000000000, 9) AS t_to, 1747945619 AS bucket_from, 1747983448 AS bucket_to, all_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_A AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), A AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_A) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __resource_filter_B AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), B AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_B) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_INDIR_DESC_B AS (WITH RECURSIVE up AS (SELECT d.trace_id, d.span_id, d.parent_span_id, 0 AS depth FROM B AS d UNION ALL SELECT p.trace_id, p.span_id, p.parent_span_id, up.depth + 1 FROM all_spans AS p JOIN up ON p.trace_id = up.trace_id AND p.span_id = up.parent_span_id WHERE up.depth < 100) SELECT DISTINCT a.* FROM A AS a GLOBAL INNER JOIN (SELECT DISTINCT trace_id, span_id FROM up WHERE depth > 0 ) AS ancestors ON ancestors.trace_id = a.trace_id AND ancestors.span_id = a.span_id), __resource_filter_C AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), C AS (SELECT * FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter_C) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), A_INDIR_DESC_B_AND_C AS (SELECT l.* FROM A_INDIR_DESC_B AS l INNER JOIN C AS r ON l.trace_id = r.trace_id), __return_from_C AS (SELECT * FROM C WHERE trace_id IN (SELECT DISTINCT trace_id FROM A_INDIR_DESC_B_AND_C)) SELECT timestamp, trace_id, span_id, name, duration_nano, parent_span_id, trace_state AS `trace_state`, flags AS `flags`, kind AS `kind`, kind_string AS `kind_string`, status_code AS `status_code`, status_message AS `status_message`, status_code_string AS `status_code_string`, events AS `events`, links AS `links`, response_status_code AS `response_status_code`, external_http_url AS `external_http_url`, http_url AS `http_url`, external_http_method AS `external_http_method`, http_method AS `http_method`, http_host AS `http_host`, db_name AS `db_name`, db_operation AS `db_operation`, has_error AS `has_error`, is_remote AS `is_remote`, attributes_string, attributes_number, attributes_bool, resources_string FROM __return_from_C ORDER BY timestamp DESC LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "gateway", "%service.name%", "%service.name\":\"gateway%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "database", "%service.name%", "%service.name\":\"database%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "auth", "%service.name%", "%service.name\":\"auth%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	statementBuilder := newTestTraceOperatorStatementBuilder(t)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Parse the operator expression
			err := c.operator.ParseExpression()
			require.NoError(t, err)

			q, err := statementBuilder.Build(
				context.Background(),
				1747947419000,
				1747983448000,
				c.requestType,
				c.operator,
				c.compositeQuery,
			)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestTraceOperatorStatementBuilderErrors(t *testing.T) {
	cases := []struct {
		name           string
		operator       qbtypes.QueryBuilderTraceOperator
		compositeQuery *qbtypes.CompositeQuery
		expectedErr    string
	}{
		{
			name: "missing referenced query",
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A => B",
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					// Missing query B
				},
			},
			expectedErr: "referenced query 'B' not found",
		},
		{
			name: "nil composite query",
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A => B",
			},
			compositeQuery: nil,
			expectedErr:    "compositeQuery cannot be nil",
		},
		{
			name: "unsupported operator",
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A XOR B", // Assuming XOR is not supported
			},
			compositeQuery: &qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "A",
							Signal: telemetrytypes.SignalTraces,
						},
					},
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:   "B",
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			expectedErr: "invalid query reference 'A XOR B'",
		},
	}

	statementBuilder := newTestTraceOperatorStatementBuilder(t)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Parse the operator expression
			err := c.operator.ParseExpression()
			if err == nil { // Only proceed if parsing succeeded
				_, err = statementBuilder.Build(
					context.Background(),
					1747947419000,
					1747983448000,
					qbtypes.RequestTypeRaw,
					c.operator,
					c.compositeQuery,
				)
			}

			require.Error(t, err)
			require.Contains(t, err.Error(), c.expectedErr)
		})
	}
}

func TestTraceOperatorStatementBuilderAdjustsKeys(t *testing.T) {
	cases := []struct {
		name          string
		requestType   qbtypes.RequestType
		operator      qbtypes.QueryBuilderTraceOperator
		builderFilter string
		wantSQL       string
		wantArgs      []any
	}{
		{
			name:        "deprecated duration filter in referenced builder query",
			requestType: qbtypes.RequestTypeRaw,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A",
				Limit:      10,
			},
			builderFilter: "durationNano = '3s'",
			wantSQL:       "duration_nano = ?",
			wantArgs:      []any{int64(3000000000)},
		},
		{
			name:        "context-prefixed aggregation alias in order by",
			requestType: qbtypes.RequestTypeScalar,
			operator: qbtypes.QueryBuilderTraceOperator{
				Expression: "A",
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
						Alias:      "span.count_",
					},
				},
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:         "count_",
								FieldContext: telemetrytypes.FieldContextSpan,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			wantSQL: "ORDER BY __result_0 desc",
		},
	}

	statementBuilder := newTestTraceOperatorStatementBuilder(t)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.operator.ParseExpression()
			require.NoError(t, err)

			filter := c.builderFilter
			if filter == "" {
				filter = "service.name = 'frontend'"
			}

			q, err := statementBuilder.Build(
				context.Background(),
				1747947419000,
				1747983448000,
				c.requestType,
				c.operator,
				&qbtypes.CompositeQuery{
					Queries: []qbtypes.QueryEnvelope{
						{
							Type: qbtypes.QueryTypeBuilder,
							Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
								Name:   "A",
								Signal: telemetrytypes.SignalTraces,
								Filter: &qbtypes.Filter{Expression: filter},
							},
						},
					},
				},
			)

			require.NoError(t, err)
			require.Contains(t, q.Query, c.wantSQL)
			for _, arg := range c.wantArgs {
				require.Contains(t, q.Args, arg)
			}
		})
	}
}

// TestTraceOperatorStatementBuilderDeduplicatesKeys checks that a trace
// operator with the same field name listed twice in GroupBy (once with a
// context, once without) ends up with a single column in the outer SELECT
// and a single entry in GROUP BY.
func TestTraceOperatorStatementBuilderDeduplicatesKeys(t *testing.T) {
	statementBuilder := newTestTraceOperatorStatementBuilder(t)

	operator := qbtypes.QueryBuilderTraceOperator{
		Expression: "A",
		Aggregations: []qbtypes.TraceAggregation{
			{Expression: "count()"},
		},
		GroupBy: []qbtypes.GroupByKey{
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:         "http.method",
				FieldContext: telemetrytypes.FieldContextAttribute,
			}},
			// Same name, no context — should be merged with the entry above.
			{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name: "http.method",
			}},
		},
	}
	require.NoError(t, operator.ParseExpression())

	q, err := statementBuilder.Build(
		context.Background(),
		1747947419000,
		1747983448000,
		qbtypes.RequestTypeScalar,
		operator,
		&qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalTraces,
						Filter: &qbtypes.Filter{Expression: "service.name = 'frontend'"},
					},
				},
			},
		},
	)

	require.NoError(t, err)

	require.Contains(t, q.Query,
		"SELECT toString(multiIf(mapContains(attributes_string, 'http.method') = ?, attributes_string['http.method'], NULL)) AS `http.method`, count() AS __result_0 FROM A GROUP BY `http.method` ORDER BY __result_0 DESC")
}
