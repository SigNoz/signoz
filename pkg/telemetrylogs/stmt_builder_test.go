package telemetrylogs

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz-otel-collector/utils"

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
		BodyJSONStringSearchPrefix,
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "NULL", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "NULL", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) OR true) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?) OR (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) = ? AND multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?) OR (attributes_string['http.method'] = ? AND mapContains(attributes_string, 'http.method') = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name`",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", uint64(1747945619), uint64(1747983448), "NULL", "redis-manual", "NULL", "GET", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "NULL", "redis-manual", "NULL", "GET", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `service.name` ORDER BY `service.name` desc LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) <> ?, multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL), NULL)) AS `service.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`service.name`) GLOBAL IN (SELECT `service.name` FROM __limit_cte) GROUP BY ts, `service.name` ORDER BY `service.name` desc, ts desc",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "NULL", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "NULL", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
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
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, nil)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
		GetBodyJSONKey,
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
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, nil)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
		GetBodyJSONKey,
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

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, nil)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
		GetBodyJSONKey,
		nil,
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
							Name: "body.status",
						},
					},
				},
			},
			expectedErrContains: "Group by/Aggregation isn't available for the body column",
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, nil)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
		GetBodyJSONKey,
		nil,
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

func TestStatementBuilderListQueryBodyArray(t *testing.T) {
	fm := NewFieldMapper()
	// Enable BodyConditionBuilder for WHERE-only JSON body
	cb := NewConditionBuilder(fm, buildTestBodyConditionBuilder())
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)
	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
		GetBodyJSONKey,
		nil,
	)

	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "Simple string filter",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name = 'x'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND dynamicElement(body_v2.user.name, 'String') = ? AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "x", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(education-> el.name IS NOT NULL, ifNull(dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'), [])) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:awards.name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(education-> arrayExists(awards_json-> awards_json.name IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), ifNull(dynamicElement(dynamicElement(education, 'JSON').awards, 'Array(Dynamic)'), [])))), ifNull(dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'), [])) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) = 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:awards.name = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: `WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?)
SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string
FROM signoz_logs.distributed_logs_v2
WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)
    AND arrayExists(education-> arrayExists(awards_json-> dynamicElement(awards_json.name, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), ifNull(dynamicElement(dynamicElement(education, 'JSON').awards, 'Array(Dynamic)'), [])))), ifNull(dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'), []))
    AND timestamp >= ?
    AND ts_bucket_start >= ?
    AND timestamp < ?
    AND ts_bucket_start <= ?
LIMIT ?`,
				Args: []any{uint64(1747945619), uint64(1747983448), "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

			// normalize whitespace: collapse all runs of whitespace to single spaces for stable comparisons
			normalize := func(s string) string {
				b := make([]rune, 0, len(s))
				prevSpace := false
				for _, r := range s {
					if r == '\n' || r == '\t' || r == '\r' || r == ' ' {
						if !prevSpace {
							b = append(b, ' ')
							prevSpace = true
						}
					} else {
						b = append(b, r)
						prevSpace = false
					}
				}
				return string(b)
			}

			t.Log(q.Query)
			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, normalize(c.expected.Query), normalize(q.Query))
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

/*
	 {
	  "user": {
	    "name": "John",
	    "age": 47,
	    "height": 5.8
	  },
	  "education": [
	    {
	      "name": "Saint Xavier",
	      "type": "high_school",
	      "metadata": {
	        "location": "Jaipur, Rajsthan"
	      },
	      "parameters": [
	        1.65,
	        7.83
	      ]
	    },
	    {
	      "name": "IIT Roorkee",
	      "type": "undergraduation",
	      "metadata": {
	        "location": "Roorkee, Uttarakhand"
	      },
	      "awards": [
	        {
	          "name": "Iron Award",
	          "type": "scholar",
	          "semester": 8
	        },
	        85
	      ]
	    }
	  ]
	}
*/
func buildTestBodyConditionBuilder() *BodyConditionBuilder {
	b := &BodyConditionBuilder{
		cache:    sync.Map{},
		lastSeen: 1747945619,
	}

	// From sample JSON comment:
	// user.name -> String, user.age -> Int64, user.height -> Float64
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("user.name", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.Int)
		b.cache.Store("user.age", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.Float64)
		b.cache.Store("user.height", set)
	}

	// education -> Array of JSON objects
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.ArrayJSON)
		b.cache.Store("education", set)
	}
	// Fields inside each education object
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("education:name", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("education:type", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("education:metadata.location", set)
	}
	// awards is an array inside education; include common object fields
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.ArrayDynamic)
		b.cache.Store("education:awards", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("education:awards.name", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.String)
		b.cache.Store("education:awards.type", set)
	}
	{
		set := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		set.Insert(telemetrytypes.Int)
		b.cache.Store("education:awards.semester", set)
	}

	return b
}
