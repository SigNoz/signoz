package telemetrytraces

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func resourceFilterStmtBuilder() qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	fm := resourcefilter.NewFieldMapper()
	cb := resourcefilter.NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	return resourcefilter.NewTraceResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
	)
}

func TestStatementBuilder(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "OR b/w resource attr and attribute",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual' OR http.request.method = 'GET'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) OR true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL) OR (attributes_string['http.request.method'] = ? AND mapContains(attributes_string, 'http.request.method') = ?)) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL) OR (attributes_string['http.request.method'] = ? AND mapContains(attributes_string, 'http.request.method') = ?)) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "redis-manual", "GET", true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "redis-manual", "GET", true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "legacy httpRoute in group by",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "httpRoute",
							FieldDataType: telemetrytypes.FieldDataTypeString,
							FieldContext:  telemetrytypes.FieldContextAttribute,
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(attribute_string_http$$route <> ?, attribute_string_http$$route, NULL)) AS `httpRoute`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `httpRoute` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(attribute_string_http$$route <> ?, attribute_string_http$$route, NULL)) AS `httpRoute`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`httpRoute`) GLOBAL IN (SELECT `httpRoute` FROM __limit_cte) GROUP BY ts, `httpRoute`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "legacy fields in search and group by",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "serviceName = $service.name AND httpMethod EXISTS AND spanKind = 'Server'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "httpRoute",
							FieldDataType: telemetrytypes.FieldDataTypeString,
							FieldContext:  telemetrytypes.FieldContextAttribute,
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "httpMethod",
							FieldDataType: telemetrytypes.FieldDataTypeString,
							FieldContext:  telemetrytypes.FieldContextAttribute,
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(attribute_string_http$$route <> ?, attribute_string_http$$route, NULL)) AS `httpRoute`, toString(multiIf(http_method <> ?, http_method, NULL)) AS `httpMethod`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((resource_string_service$$name = ? AND resource_string_service$$name <> ?) AND http_method <> ? AND kind_string = ?) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `httpRoute`, `httpMethod` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(attribute_string_http$$route <> ?, attribute_string_http$$route, NULL)) AS `httpRoute`, toString(multiIf(http_method <> ?, http_method, NULL)) AS `httpMethod`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((resource_string_service$$name = ? AND resource_string_service$$name <> ?) AND http_method <> ? AND kind_string = ?) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`httpRoute`, `httpMethod`) GLOBAL IN (SELECT `httpRoute`, `httpMethod` FROM __limit_cte) GROUP BY ts, `httpRoute`, `httpMethod`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "", "", "redis-manual", "", "", "Server", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "", "", "redis-manual", "", "", "Server", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "context as key prefix test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "sum(metric.max_count)",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(mapContains(attributes_number, 'metric.max_count') = ?, toFloat64(attributes_number['metric.max_count']), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(mapContains(attributes_number, 'metric.max_count') = ?, toFloat64(attributes_number['metric.max_count']), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "mat number key in aggregation test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "sum(cart.items_count)",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(`attribute_number_cart$$items_count_exists` = ?, toFloat64(`attribute_number_cart$$items_count`), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(`attribute_number_cart$$items_count_exists` = ?, toFloat64(`attribute_number_cart$$items_count`), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "mat number key in aggregation test with order by service",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "sum(cart.items_count)",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
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
								Name: "service.name",
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(`attribute_number_cart$$items_count_exists` = ?, toFloat64(`attribute_number_cart$$items_count`), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY `service.name` desc LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, sum(multiIf(`attribute_number_cart$$items_count_exists` = ?, toFloat64(`attribute_number_cart$$items_count`), NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name` ORDER BY `service.name` desc, ts desc",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "Legacy column with incorrect field context test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "responseStatusCode",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(response_status_code <> ?, response_status_code, NULL)) AS `responseStatusCode`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `responseStatusCode` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(response_status_code <> ?, response_status_code, NULL)) AS `responseStatusCode`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`responseStatusCode`) GLOBAL IN (SELECT `responseStatusCode` FROM __limit_cte) GROUP BY ts, `responseStatusCode`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "", "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "Legacy column in aggregation and incorrect field context test",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.TraceAggregation{
					{
						Expression: "p90(durationNano)",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "responseStatusCode",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(response_status_code <> ?, response_status_code, NULL)) AS `responseStatusCode`, quantile(0.90)(multiIf(duration_nano <> ?, duration_nano, NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY `responseStatusCode` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(response_status_code <> ?, response_status_code, NULL)) AS `responseStatusCode`, quantile(0.90)(multiIf(duration_nano <> ?, duration_nano, NULL)) AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`responseStatusCode`) GLOBAL IN (SELECT `responseStatusCode` FROM __limit_cte) GROUP BY ts, `responseStatusCode`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "", 0, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, "", 0, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		nil,
	)

	vars := map[string]qbtypes.VariableItem{
		"service.name": {
			Value: "redis-manual",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, vars)

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

func TestStatementBuilderListQuery(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "List query with mat selected fields",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{
						Name:          "name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "service.name",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
						Materialized:  true,
					},
					{
						Name:          "duration_nano",
						Signal:        telemetrytypes.SignalTraces,
						FieldContext:  telemetrytypes.FieldContextSpan,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
					},
					{
						Name:          "cart.items_count",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT name AS `name`, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) AS `service.name`, duration_nano AS `duration_nano`, `attribute_number_cart$$items_count` AS `cart.items_count`, timestamp AS `timestamp`, span_id AS `span_id`, trace_id AS `trace_id` FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "List query with default fields and attribute order by",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "user.id",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT duration_nano AS `duration_nano`, name AS `name`, response_status_code AS `response_status_code`, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, `resource_string_service$$name_exists`==true, `resource_string_service$$name`, NULL) AS `service.name`, span_id AS `span_id`, timestamp AS `timestamp`, trace_id AS `trace_id` FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY attributes_string['user.id'] AS `user.id` desc LIMIT ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "List query with legacy fields",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{
						Name:          "name",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "serviceName",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "durationNano",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
					},
					{
						Name:          "httpMethod",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "responseStatusCode",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT name AS `name`, resource_string_service$$name AS `serviceName`, duration_nano AS `durationNano`, http_method AS `httpMethod`, response_status_code AS `responseStatusCode`, timestamp AS `timestamp`, span_id AS `span_id`, trace_id AS `trace_id` FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		nil,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

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

func TestStatementBuilderTraceQuery(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "List query with mat selected fields",
			requestType: qbtypes.RequestTypeTrace,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __toe AS (SELECT trace_id FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __toe_duration_sorted AS (SELECT trace_id, duration_nano, resource_string_service$$name as `service.name`, name FROM signoz_traces.distributed_signoz_index_v3 WHERE parent_span_id = '' AND trace_id GLOBAL IN __toe AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY duration_nano DESC LIMIT 1 BY trace_id) SELECT __toe_duration_sorted.`service.name` AS `service.name`, __toe_duration_sorted.name AS `name`, count() AS span_count, __toe_duration_sorted.duration_nano AS `duration_nano`, __toe_duration_sorted.trace_id AS `trace_id` FROM __toe INNER JOIN __toe_duration_sorted ON __toe.trace_id = __toe_duration_sorted.trace_id GROUP BY trace_id, duration_nano, name, `service.name` ORDER BY duration_nano DESC LIMIT 1 BY trace_id LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "List query without any filter",
			requestType: qbtypes.RequestTypeTrace,
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __toe AS (SELECT trace_id FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ?), __toe_duration_sorted AS (SELECT trace_id, duration_nano, resource_string_service$$name as `service.name`, name FROM signoz_traces.distributed_signoz_index_v3 WHERE parent_span_id = '' AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY duration_nano DESC LIMIT 1 BY trace_id) SELECT __toe_duration_sorted.`service.name` AS `service.name`, __toe_duration_sorted.name AS `name`, count() AS span_count, __toe_duration_sorted.duration_nano AS `duration_nano`, __toe_duration_sorted.trace_id AS `trace_id` FROM __toe INNER JOIN __toe_duration_sorted ON __toe.trace_id = __toe_duration_sorted.trace_id GROUP BY trace_id, duration_nano, name, `service.name` ORDER BY duration_nano DESC LIMIT 1 BY trace_id LIMIT ? SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewTraceQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		nil,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

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
