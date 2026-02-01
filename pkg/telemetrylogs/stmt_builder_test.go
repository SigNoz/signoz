package telemetrylogs

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

func resourceFilterStmtBuilder() qbtypes.StatementBuilder[qbtypes.LogAggregation] {
	fm := resourcefilter.NewFieldMapper()
	cb := resourcefilter.NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keysMap := buildCompleteFieldKeyMap()
	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalLogs
		}
	}
	mockMetadataStore.KeysMap = keysMap

	return resourcefilter.NewLogResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)
}

func TestStatementBuilderTimeSeries(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "Time series with limit",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "Time series with OR b/w resource attr and attribute filter",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalTraces,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual' OR http.method = 'GET'",
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) OR true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL) OR (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL) OR (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "redis-manual", "GET", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "redis-manual", "GET", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "Time series with limit + custom order by",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY `service.name` desc LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name` ORDER BY `service.name` desc, ts desc",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
			expectedErr: nil,
		},
		{
			name:        "Time series with group by on materialized column",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "materialized.key.name",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(`attribute_string_materialized$$key$$name_exists` = ?, `attribute_string_materialized$$key$$name`, NULL)) AS `materialized.key.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `materialized.key.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(`attribute_string_materialized$$key$$name_exists` = ?, `attribute_string_materialized$$key$$name`, NULL)) AS `materialized.key.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`materialized.key.name`) GLOBAL IN (SELECT `materialized.key.name` FROM __limit_cte) GROUP BY ts, `materialized.key.name`",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Time series with materialised column using or with regex operator",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "materialized.key.name REGEXP 'redis.*' OR materialized.key.name = 'memcached'",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (true OR true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((match(`attribute_string_materialized$$key$$name`, ?) AND `attribute_string_materialized$$key$$name_exists` = ?) OR (`attribute_string_materialized$$key$$name` = ? AND `attribute_string_materialized$$key$$name_exists` = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY ts",
				Args:  []any{uint64(1747945619), uint64(1747983448), "redis.*", true, "memcached", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
			expectedErr: nil,
		},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
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

func TestStatementBuilderListQuery(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "default list",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "list query with mat col order by",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
				},
				Limit: 10,
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "materialized.key.name",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY `attribute_string_materialized$$key$$name` AS `materialized.key.name` desc LIMIT ?",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "list query with mat col using or and regex operator",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "materialized.key.name REGEXP 'redis.*' OR materialized.key.name = 'memcached'",
				},
				Limit: 10,
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "materialized.key.name",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (true OR true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((match(`attribute_string_materialized$$key$$name`, ?) AND `attribute_string_materialized$$key$$name_exists` = ?) OR (`attribute_string_materialized$$key$$name` = ? AND `attribute_string_materialized$$key$$name_exists` = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY `attribute_string_materialized$$key$$name` AS `materialized.key.name` desc LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "redis.*", true, "memcached", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
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

func TestStatementBuilderListQueryResourceTests(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "List with full text search",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "hello",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND match(LOWER(body), LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "hello", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "list query with mat col order by",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice' hello",
				},
				Limit: 10,
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "materialized.key.name",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (match(LOWER(body), LOWER(?))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY `attribute_string_materialized$$key$$name` AS `materialized.key.name` desc LIMIT ?",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "hello", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "List with json search",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "body.status = 'success'",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (JSON_VALUE(body, '$.\"status\"') = ? AND JSON_EXISTS(body, '$.\"status\"')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "success", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	//

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

func TestStatementBuilderTimeSeriesBodyGroupBy(t *testing.T) {
	cases := []struct {
		name                string
		requestType         qbtypes.RequestType
		query               qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected            qbtypes.Statement
		expectedErrContains string
	}{
		{
			name:        "Time series with limit and body group by",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "status",
							FieldContext: telemetrytypes.FieldContextBody,
						},
					},
				},
			},
			expectedErrContains: "Group by/Aggregation isn't available for the body column",
		},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

			if c.expectedErrContains != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErrContains)
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryServiceCollision(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
		expectWarn  bool
	}{
		{
			name:        "default list",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "(service.name = 'cartservice' AND body CONTAINS 'error')",
				},
				Limit: 10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND true)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((LOWER(body) LIKE LOWER(?))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "%error%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
			expectWarn:  true,
		},
		{
			name:        "list query with mat col order by",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice' AND body CONTAINS 'error'",
				},
				Limit: 10,
				Order: []qbtypes.OrderBy{
					{
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "materialized.key.name",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
						Direction: qbtypes.OrderDirectionDesc,
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (LOWER(body) LIKE LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY `attribute_string_materialized$$key$$name` AS `materialized.key.name` desc LIMIT ?",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "%error%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
			expectWarn:  true,
		},
	}

	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMapCollision()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
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
				if c.expectWarn {
					require.True(t, len(q.Warnings) > 0)
				}
			}
		})
	}
}

func TestAdjustKey(t *testing.T) {
	cases := []struct {
		name        string
		inputKey    telemetrytypes.TelemetryFieldKey
		keysMap     map[string][]*telemetrytypes.TelemetryFieldKey
		expectedKey telemetrytypes.TelemetryFieldKey
	}{
		{
			name: "intrinsic field with no other key match - use intrinsic",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "severity_text",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: IntrinsicFields["severity_text"],
		},
		{
			name: "intrinsic field with other key match - no override",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "body",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: map[string][]*telemetrytypes.TelemetryFieldKey{
				"body": {
					{
						Name:          "body",
						FieldContext:  telemetrytypes.FieldContextBody,
						FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
					},
					{
						Name:          "body",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
					},
				},
			},
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "body",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
		},
		{
			name: "json field with no context specified",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "severity_number",
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "severity_number",
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
		{
			name: "single matching key in metadata",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: *buildCompleteFieldKeyMap()["service.name"][0],
		},
		{
			name: "single matching key with incorrect context specified - no override",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
		},
		{
			name: "single matching key with no context specified - override",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: *buildCompleteFieldKeyMap()["service.name"][0],
		},
		{
			name: "multiple matching keys - all materialized",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "multi.mat.key",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "multi.mat.key",
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		{
			name: "multiple matching keys - mixed materialization",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "mixed.materialization.key",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "mixed.materialization.key",
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  false,
			},
		},
		{
			name: "multiple matching keys with context specified",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "mixed.materialization.key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: *buildCompleteFieldKeyMap()["mixed.materialization.key"][0],
		},
		{
			name: "no matching keys - unknown field",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown.field",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown.field",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				Materialized:  false,
			},
		},
		{
			name: "no matching keys with context filter",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown.field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap: buildCompleteFieldKeyMap(),
			expectedKey: telemetrytypes.TelemetryFieldKey{
				Name:          "unknown.field",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
				Materialized:  false,
			},
		},
		{
			name: "materialized field",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "mat.key",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: *buildCompleteFieldKeyMap()["mat.key"][0],
		},
		{
			name: "non-materialized field",
			inputKey: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextUnspecified,
				FieldDataType: telemetrytypes.FieldDataTypeUnspecified,
			},
			keysMap:     buildCompleteFieldKeyMap(),
			expectedKey: *buildCompleteFieldKeyMap()["user.id"][0],
		},
	}

	fm := NewFieldMapper()
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMapCollision()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Create a copy of the input key to avoid modifying the original
			key := c.inputKey

			// Call adjustKey
			statementBuilder.adjustKey(&key, c.keysMap)

			// Verify the key was adjusted as expected
			require.Equal(t, c.expectedKey.Name, key.Name, "key name should match")
			require.Equal(t, c.expectedKey.FieldContext, key.FieldContext, "field context should match")
			require.Equal(t, c.expectedKey.FieldDataType, key.FieldDataType, "field data type should match")
			require.Equal(t, c.expectedKey.Materialized, key.Materialized, "materialized should match")
			require.Equal(t, c.expectedKey.JSONDataType, key.JSONDataType, "json data type should match")
			require.Equal(t, c.expectedKey.Indexes, key.Indexes, "json exists should match")
		})
	}
}
