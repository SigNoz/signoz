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
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
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
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(dynamicElement(body_v2.status, 'String')) AS `body.status`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.status` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(dynamicElement(body_v2.status, 'String') IS NOT NULL AND dynamicElement(body_v2.status, 'String') IS NOT NULL, JSON_VALUE(body, '$.\"status\"'), NULL)) AS `body.status`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.status`) GLOBAL IN (SELECT `body.status` FROM __limit_cte) GROUP BY ts, `body.status`",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Time series with array GroupBy",
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
							Name: "body.education:awards:type",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(dynamicElement(body_v2.education:awards:type, 'String')) AS `body.education:awards:type`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.education:awards:type` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf(arrayExists(_x_education-> (arrayExists(_x_awards-> _x_awards.type IS NOT NULL, dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> _x_awards.type IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND arrayExists(_x_education-> (arrayExists(_x_awards-> _x_awards.type IS NOT NULL, dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> _x_awards.type IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')), JSON_VALUE(body, '$.\"education:awards:type\"'), NULL)) AS `body.education:awards:type`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND true AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.education:awards:type`) GLOBAL IN (SELECT `body.education:awards:type` FROM __limit_cte) GROUP BY ts, `body.education:awards:type`",
				Args:  []any{"cartservice", "%service.name%", "%service.name\":\"cartservice%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	// Create BodyConditionBuilder with mock metadata
	bcb := buildTestBodyConditionBuilder()

	fm := NewFieldMapperWithBodyConditionBuilder(bcb)
	cb := NewConditionBuilder(fm, bcb)
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
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Create context with feature flag enabled
			ctx := context.WithValue(context.Background(), "feature_flags", []*licensetypes.Feature{
				{Name: licensetypes.BodyJSONQuery, Active: true},
			})

			q, err := statementBuilder.Build(ctx, 1747947419000, 1747983448000, c.requestType, c.query, nil)

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

func TestStatementBuilderListQueryBody(t *testing.T) {
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> _x_education.name IS NOT NULL, dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:awards.name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> (arrayExists(_x_awards-> _x_awards.name IS NOT NULL, dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> _x_awards.name IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
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
    AND arrayExists(_x_education-> (arrayExists(_x_awards-> dynamicElement(_x_awards.name, 'String') = ?, dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> dynamicElement(_x_awards.name, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))
    AND timestamp >= ?
    AND ts_bucket_start >= ?
    AND timestamp < ?
    AND ts_bucket_start <= ?
LIMIT ?`,
				Args: []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:parameters Contains 1.65"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> (arrayExists(x -> x = ?, dynamicElement(_x_education.parameters, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(_x_education.parameters, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), 1.65, 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains String value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:name Contains 'IIT'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> arrayExists(x -> x = ?, dynamicElement(_x_education.name, 'String') LIKE ?), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "IIT", "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains Int64 value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests:entities:reviews:entries:metadata:positions:ratings Contains 4"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_interests-> arrayExists(_x_entities-> arrayExists(_x_reviews-> arrayExists(_x_entries-> arrayExists(_x_metadata-> arrayExists(_x_positions-> arrayExists(x -> x = ?, dynamicElement(_x_positions.ratings, 'Array(Nullable(Int64))')), dynamicElement(_x_metadata.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(_x_entries.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(_x_reviews.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(_x_entities.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(_x_interests.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains value - x2",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests:entities:reviews:entries:metadata:positions:ratings Contains 'Good'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_interests-> arrayExists(_x_entities-> arrayExists(_x_reviews-> arrayExists(_x_entries-> arrayExists(_x_metadata-> arrayExists(_x_positions-> arrayExists(x -> x = ?, dynamicElement(_x_positions.ratings, 'Array(Nullable(String))')), dynamicElement(_x_metadata.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(_x_entries.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(_x_reviews.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(_x_entities.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(_x_interests.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Good", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains boolean",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:parameters Contains true"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(_x_education.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains String",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:parameters Contains 'passed'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(_x_education.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:awards:type = 'sports'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> (arrayExists(_x_awards-> dynamicElement(_x_awards.type, 'String') = ?, dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> dynamicElement(_x_awards.type, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education:awards:participated:team:branch Contains 'Civil'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND arrayExists(_x_education-> (arrayExists(_x_awards-> (arrayExists(_x_participated-> arrayExists(_x_team-> LOWER(dynamicElement(_x_team.branch, 'String')) LIKE LOWER(?), dynamicElement(_x_participated.team, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(_x_awards.participated, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(_x_participated-> arrayExists(_x_team-> LOWER(dynamicElement(_x_team.branch, 'String')) LIKE LOWER(?), dynamicElement(_x_participated.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_awards.participated, 'Array(Dynamic)'))))), dynamicElement(_x_education.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(_x_awards-> (arrayExists(_x_participated-> arrayExists(_x_team-> LOWER(dynamicElement(_x_team.branch, 'String')) LIKE LOWER(?), dynamicElement(_x_participated.team, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(_x_awards.participated, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(_x_participated-> arrayExists(_x_team-> LOWER(dynamicElement(_x_team.branch, 'String')) LIKE LOWER(?), dynamicElement(_x_participated.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_awards.participated, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(_x_education.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
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

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				t.Log(q.Query)
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
	    "name": "John Doe",
	    "age": 47,
	    "height": 5.8
	  },
	  "education": [
	    {
	      "name": "Scaler School of Marketing",
	      "type": 10024,
	      "internal_type": "crash_course",
	      "metadata": {
	        "location": "Bengaluru, KA"
	      },
	      "parameters": [
	        7.83,
	        "passed",
	        true
	      ],
	      "duration": "6m",
	      "mode": "hybrid",
	      "year": 2024,
	      "field": "Marketing"
	    },
	    {
	      "name": "Saint Xavier",
	      "type": "high_school",
	      "metadata": {
	        "location": "Jaipur, Rajsthan"
	      },
	      "parameters": [
	        1.65,
	        7.83,
	        1.33
	      ],
	      "awards": [
	        {
	          "name": "Inter School Games",
	          "rank": 2,
	          "medal": "silver",
	          "type": "sports",
	          "participated": [
	            {
	              "type": "race",
	              "race_type": "cycle"
	            },
	            "chess",
	            {
	              "type": "race",
	              "race_type": "relay"
	            }
	          ]
	        }
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
	        85,
	        {
	          "name": "Inter IIT games",
	          "type": "sports",
	          "semester": 4,
	          "participated": [
	            {
	              "type": "coding",
	              "field": "AI",
	              "project_type": "mobile_dev",
	              "project_name": "Budget Calculator"
	            },
	            {
	              "type": "Hackathon",
	              "team_based": true,
	              "team_name": "Stray Dogs",
	              "team": [
	                {
	                  "name": "John Doe",
	                  "branch": "Civil Engineering",
	                  "semester": 4
	                },
	                {
	                  "name": "Binks",
	                  "branch": "Computer Science",
	                  "semester": 6
	                },
	                {
	                  "name": "Terry Crews",
	                  "branch": "Mechanical Enginerring",
	                  "semester": 2
	                }
	              ]
	            }
	          ]
	        }
	      ]
	    }
	  ],
	  "interests": [
	    {
	      "type": "education",
	      "entities": [
	        {
	          "application_date": "27 Oct 2023",
	          "reviews": [
	            {
	              "given_by": "Prof Stark",
	              "remarks": "oki",
	              "weight": 8.98,
	              "passed": true
	            },
	            {
	              "type": "analysis",
	              "given_by": "Prof Jane",
	              "analysis_type": 10023,
	              "entries": [
	                {
	                  "subject": "Physics",
	                  "status": "approved"
	                },
	                {
	                  "subject": "Software Engineering",
	                  "status": "approved",
	                  "metadata": [
	                    {
	                      "company": "Xendar Technologies",
	                      "experience": 18,
	                      "unit": "months"
	                    },
	                    {
	                      "company": "Hike Messanger",
	                      "experience": 5.6,
	                      "unit": "years",
	                      "positions": [
	                        {
	                          "name": "Software Engineer 2",
	                          "duration": 24,
	                          "unit": "months"
	                        },
	                        {
	                          "name": "Software Engineer",
	                          "duration": 1.6,
	                          "unit": "years",
	                          "ratings": [
	                            "Good",
	                            "Very Good",
	                            "Good"
	                          ]
	                        },
	                        {
	                          "name": "Software Engineer",
	                          "duration": 2,
	                          "unit": "years",
	                          "ratings": [
	                            3,
	                            4,
	                            4
	                          ]
	                        }
	                      ]
	                    }
	                  ]
	                }
	              ]
	            }
	          ]
	        }
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

	types := map[string][]telemetrytypes.JSONDataType{
		"user.name":                                                      {telemetrytypes.String},
		"user.age":                                                       {telemetrytypes.Int64},
		"user.height":                                                    {telemetrytypes.Float64},
		"status":                                                         {telemetrytypes.String},
		"education":                                                      {telemetrytypes.ArrayJSON},
		"education:name":                                                 {telemetrytypes.String},
		"education:type":                                                 {telemetrytypes.String, telemetrytypes.Int64},
		"education:internal_type":                                        {telemetrytypes.String},
		"education:metadata.location":                                    {telemetrytypes.String},
		"education:parameters":                                           {telemetrytypes.ArrayFloat64, telemetrytypes.ArrayDynamic},
		"education:duration":                                             {telemetrytypes.String},
		"education:mode":                                                 {telemetrytypes.String},
		"education:year":                                                 {telemetrytypes.Int64},
		"education:field":                                                {telemetrytypes.String},
		"education:awards":                                               {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education:awards:name":                                          {telemetrytypes.String},
		"education:awards:rank":                                          {telemetrytypes.Int64},
		"education:awards:medal":                                         {telemetrytypes.String},
		"education:awards:type":                                          {telemetrytypes.String},
		"education:awards:semester":                                      {telemetrytypes.Int64},
		"education:awards:participated":                                  {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education:awards:participated:type":                             {telemetrytypes.String},
		"education:awards:participated:field":                            {telemetrytypes.String},
		"education:awards:participated:project_type":                     {telemetrytypes.String},
		"education:awards:participated:project_name":                     {telemetrytypes.String},
		"education:awards:participated:race_type":                        {telemetrytypes.String},
		"education:awards:participated:team_based":                       {telemetrytypes.Bool},
		"education:awards:participated:team_name":                        {telemetrytypes.String},
		"education:awards:participated:team":                             {telemetrytypes.ArrayJSON},
		"education:awards:participated:team:name":                        {telemetrytypes.String},
		"education:awards:participated:team:branch":                      {telemetrytypes.String},
		"education:awards:participated:team:semester":                    {telemetrytypes.Int64},
		"interests":                                                      {telemetrytypes.ArrayJSON},
		"interests:type":                                                 {telemetrytypes.String},
		"interests:entities":                                             {telemetrytypes.ArrayJSON},
		"interests:entities.application_date":                            {telemetrytypes.String},
		"interests:entities:reviews":                                     {telemetrytypes.ArrayJSON},
		"interests:entities:reviews:given_by":                            {telemetrytypes.String},
		"interests:entities:reviews:remarks":                             {telemetrytypes.String},
		"interests:entities:reviews:weight":                              {telemetrytypes.Float64},
		"interests:entities:reviews:passed":                              {telemetrytypes.Bool},
		"interests:entities:reviews:type":                                {telemetrytypes.String},
		"interests:entities:reviews:analysis_type":                       {telemetrytypes.Int64},
		"interests:entities:reviews:entries":                             {telemetrytypes.ArrayJSON},
		"interests:entities:reviews:entries:subject":                     {telemetrytypes.String},
		"interests:entities:reviews:entries:status":                      {telemetrytypes.String},
		"interests:entities:reviews:entries:metadata":                    {telemetrytypes.ArrayJSON},
		"interests:entities:reviews:entries:metadata:company":            {telemetrytypes.String},
		"interests:entities:reviews:entries:metadata:experience":         {telemetrytypes.Int64},
		"interests:entities:reviews:entries:metadata:unit":               {telemetrytypes.String},
		"interests:entities:reviews:entries:metadata:positions":          {telemetrytypes.ArrayJSON},
		"interests:entities:reviews:entries:metadata:positions:name":     {telemetrytypes.String},
		"interests:entities:reviews:entries:metadata:positions:duration": {telemetrytypes.Int64, telemetrytypes.Float64},
		"interests:entities:reviews:entries:metadata:positions:unit":     {telemetrytypes.String},
		"interests:entities:reviews:entries:metadata:positions:ratings":  {telemetrytypes.ArrayInt64, telemetrytypes.ArrayString},
	}

	for path, types := range types {
		typesSet := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		for _, t := range types {
			typesSet.Insert(t)
		}
		b.cache.Store(path, typesSet)
	}

	return b
}
