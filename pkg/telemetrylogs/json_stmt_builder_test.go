package telemetrylogs

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/ee/query-service/constants"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func TestStatementBuilderTimeSeriesBodyGroupByJSON(t *testing.T) {
	constants.BodyV2QueryEnabled = true
	defer func() {
		constants.BodyV2QueryEnabled = false
	}()

	cases := []struct {
		name                string
		requestType         qbtypes.RequestType
		query               qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected            qbtypes.Statement
		expectedErrContains string
	}{
		{
			name:        "Group By - x1",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.education[].awards[].name",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(`body.education[].awards[].name`) AS `body.education[].awards[].name`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->arrayConcat(arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.education[].awards[].name` ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(`body.education[].awards[].name`) AS `body.education[].awards[].name`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->arrayConcat(arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.education[].awards[].name` ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) GLOBAL IN (SELECT `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` FROM __limit_cte) GROUP BY ts, `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Group By - x2",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.age",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(dynamicElement(body_v2.user.age, 'Int64')) AS `body.user.age`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(dynamicElement(body_v2.user.age, 'Int64')) AS `body.user.age`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) GLOBAL IN (SELECT `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` FROM __limit_cte) GROUP BY ts, `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	// Create JSONQueryBuilder with mock metadata
	jqb := buildTestJSONQueryBuilder()

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, jqb)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		jqb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
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

func TestStatementBuilderTimeSeriesBodyGroupByPromoted(t *testing.T) {
	constants.BodyV2QueryEnabled = true
	defer func() {
		constants.BodyV2QueryEnabled = false
	}()

	cases := []struct {
		name                string
		requestType         qbtypes.RequestType
		query               qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected            qbtypes.Statement
		expectedErrContains string
	}{
		{
			name:        "Two nested paths",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.education[].awards[].name",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(`body.education[].awards[].name`) AS `body.education[].awards[].name`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->arrayConcat(arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')), arrayMap(`promoted.education`->arrayConcat(arrayMap(`promoted.education[].awards`->dynamicElement(`promoted.education[].awards`.name, 'String'), dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), arrayMap(`promoted.education[].awards`->dynamicElement(`promoted.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')))) AS `body.education[].awards[].name` ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(`body.education[].awards[].name`) AS `body.education[].awards[].name`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->arrayConcat(arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards`->dynamicElement(`body_v2.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')), arrayMap(`promoted.education`->arrayConcat(arrayMap(`promoted.education[].awards`->dynamicElement(`promoted.education[].awards`.name, 'String'), dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), arrayMap(`promoted.education[].awards`->dynamicElement(`promoted.education[].awards`.name, 'String'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')))) AS `body.education[].awards[].name` ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) GLOBAL IN (SELECT `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` FROM __limit_cte) GROUP BY ts, `body.education[].awards[].name`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Simple Path + Nested Array path",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.age",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(coalesce(dynamicElement(promoted.user.age, 'Int64'), dynamicElement(body_v2.user.age, 'Int64'))) AS `body.user.age`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(coalesce(dynamicElement(promoted.user.age, 'Int64'), dynamicElement(body_v2.user.age, 'Int64'))) AS `body.user.age`, toString(`body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 ARRAY JOIN arrayFlatten(arrayConcat(arrayMap(`body_v2.interests`->arrayMap(`body_v2.interests[].entities`->arrayMap(`body_v2.interests[].entities[].reviews`->arrayMap(`body_v2.interests[].entities[].reviews[].entries`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata`->arrayMap(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`->dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.unit, 'String'), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AS `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`) GLOBAL IN (SELECT `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit` FROM __limit_cte) GROUP BY ts, `body.user.age`, `body.interests[].entities[].reviews[].entries[].metadata[].positions[].unit`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Two simple paths",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.age",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(coalesce(dynamicElement(promoted.user.age, 'Int64'), dynamicElement(body_v2.user.age, 'Int64'))) AS `body.user.age`, toString(coalesce(dynamicElement(promoted.user.name, 'String'), dynamicElement(body_v2.user.name, 'String'))) AS `body.user.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `body.user.age`, `body.user.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(coalesce(dynamicElement(promoted.user.age, 'Int64'), dynamicElement(body_v2.user.age, 'Int64'))) AS `body.user.age`, toString(coalesce(dynamicElement(promoted.user.name, 'String'), dynamicElement(body_v2.user.name, 'String'))) AS `body.user.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`body.user.age`, `body.user.name`) GLOBAL IN (SELECT `body.user.age`, `body.user.name` FROM __limit_cte) GROUP BY ts, `body.user.age`, `body.user.name`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	// Create JSONQueryBuilder with mock metadata
	jqb := buildTestJSONQueryBuilder()
	// promote paths for testing
	jqb.promotedPaths.Store("education", struct{}{})
	jqb.promotedPaths.Store("user.age", struct{}{})
	jqb.promotedPaths.Store("user.name", struct{}{})

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, jqb)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)

	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		jqb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		BodyJSONStringSearchPrefix,
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

func TestStatementBuilderListQueryBody(t *testing.T) {
	constants.BodyV2QueryEnabled = true
	defer func() {
		constants.BodyV2QueryEnabled = false
	}()

	jqb := buildTestJSONQueryBuilder()
	fm := NewFieldMapper()
	// Enable JSONQueryBuilder for WHERE-only JSON body
	cb := NewConditionBuilder(fm, jqb)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)
	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		jqb,
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
		// {
		// 	name:        "Simple string filter",
		// 	requestType: qbtypes.RequestTypeRaw,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		// 		Signal: telemetrytypes.SignalLogs,
		// 		Filter: &qbtypes.Filter{Expression: "body.user.name = 'x'"},
		// 		Limit:  10,
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_v2.user.name, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
		// 		Args:  []any{uint64(1747945619), uint64(1747983448), "x", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
		// 	},
		// 	expectedErr: nil,
		// },
		// {
		// 	name:        "Key inside Array(JSON) exists",
		// 	requestType: qbtypes.RequestTypeRaw,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		// 		Signal: telemetrytypes.SignalLogs,
		// 		Filter: &qbtypes.Filter{Expression: "body.education[].name Exists"},
		// 		Limit:  10,
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> `body_v2.education`.name IS NOT NULL, dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
		// 		Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
		// 	},
		// 	expectedErr: nil,
		// },
		// {
		// 	name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
		// 	requestType: qbtypes.RequestTypeRaw,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		// 		Signal: telemetrytypes.SignalLogs,
		// 		Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name Exists"},
		// 		Limit:  10,
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> `body_v2.education[].awards`.name IS NOT NULL, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> `body_v2.education[].awards`.name IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
		// 		Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
		// 	},
		// 	expectedErr: nil,
		// },
		// {
		// 	name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
		// 	requestType: qbtypes.RequestTypeRaw,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		// 		Signal: telemetrytypes.SignalLogs,
		// 		Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name = 'Iron Award'"},
		// 		Limit:  10,
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.name, 'String') = ?, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.name, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
		// 		Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
		// 	},
		// 	expectedErr: nil,
		// },
		{
			name:        "Key inside Array(JSON) contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 1.65"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(x -> x = ?, dynamicElement(`body_v2.education`.parameters, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), 1.65, 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains String value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Contains 'IIT'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> LOWER(dynamicElement(`body_v2.education`.name, 'String')) LIKE LOWER(?), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%IIT%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains Int64 value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.interests`-> arrayExists(`body_v2.interests[].entities`-> arrayExists(`body_v2.interests[].entities[].reviews`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`-> arrayExists(x -> x = ?, dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.ratings, 'Array(Nullable(Int64))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains value - x2",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 'Good'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.interests`-> arrayExists(`body_v2.interests[].entities`-> arrayExists(`body_v2.interests[].entities[].reviews`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`-> arrayExists(x -> x = ?, dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.ratings, 'Array(Nullable(String))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.positions, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.metadata, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.entries, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.reviews, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.entities, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.interests, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Good", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains boolean",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains true"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), true, true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains String",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 'passed'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].type = 'sports'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.type, 'String') = ?, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.type, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].participated[].team[].branch Contains 'Civil'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.education[].awards`.participated, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.participated, 'Array(Dynamic)'))))), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_v2.education[].awards`.participated, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.participated, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(`promoted.education[].awards`-> (arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=4))')), dynamicElement(`promoted.education[].awards`.participated, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=16))')) OR arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education[].awards`.participated, 'Array(Dynamic)'))))), dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`promoted.education[].awards`-> (arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`promoted.education[].awards`.participated, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education[].awards`.participated, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
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
				require.Equal(t, normalize(c.expected.Query), normalize(q.Query))
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryBodyPromoted(t *testing.T) {
	constants.BodyV2QueryEnabled = true
	defer func() {
		constants.BodyV2QueryEnabled = false
	}()

	jqb := buildTestJSONQueryBuilder()
	// promote paths for testing
	jqb.promotedPaths.Store("education", struct{}{})

	fm := NewFieldMapper()
	// Enable JSONQueryBuilder for WHERE-only JSON body
	cb := NewConditionBuilder(fm, jqb)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)
	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		jqb,
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
			name:        "Key inside Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> `body_v2.education`.name IS NOT NULL, dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> `promoted.education`.name IS NOT NULL, dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> `body_v2.education[].awards`.name IS NOT NULL, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> `body_v2.education[].awards`.name IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(`promoted.education[].awards`-> `promoted.education[].awards`.name IS NOT NULL, dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`promoted.education[].awards`-> `promoted.education[].awards`.name IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.name, 'String') = ?, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.name, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(`promoted.education[].awards`-> dynamicElement(`promoted.education[].awards`.name, 'String') = ?, dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`promoted.education[].awards`-> dynamicElement(`promoted.education[].awards`.name, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 1.65"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(x -> x = ?, dynamicElement(`body_v2.education`.parameters, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(x -> x = ?, dynamicElement(`promoted.education`.parameters, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`promoted.education`.parameters, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), 1.65, 1.65, 1.65, 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains String value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Contains 'IIT'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> LOWER(dynamicElement(`body_v2.education`.name, 'String')) LIKE LOWER(?), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> LOWER(dynamicElement(`promoted.education`.name, 'String')) LIKE LOWER(?), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%IIT%%", "%%IIT%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains boolean",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains true"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`promoted.education`.parameters, 'Array(Dynamic)')))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), true, true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains String",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 'passed'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_v2.education`.parameters, 'Array(Dynamic)')))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`promoted.education`.parameters, 'Array(Dynamic)')))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "passed", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].type = 'sports'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.type, 'String') = ?, dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.type, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(`promoted.education[].awards`-> dynamicElement(`promoted.education[].awards`.type, 'String') = ?, dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`promoted.education[].awards`-> dynamicElement(`promoted.education[].awards`.type, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].participated[].team[].branch Contains 'Civil'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.education[].awards`.participated, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.participated, 'Array(Dynamic)'))))), dynamicElement(`body_v2.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_v2.education[].awards`.participated, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.participated, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.awards, 'Array(Dynamic)'))))), dynamicElement(body_v2.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`promoted.education`-> (arrayExists(`promoted.education[].awards`-> (arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=4))')), dynamicElement(`promoted.education[].awards`.participated, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=16))')) OR arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education[].awards`.participated, 'Array(Dynamic)'))))), dynamicElement(`promoted.education`.awards, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`promoted.education[].awards`-> (arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`promoted.education[].awards`.participated, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`promoted.education[].awards[].participated`-> arrayExists(`promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`promoted.education[].awards[].participated[].team`.branch, 'String')) LIKE LOWER(?), dynamicElement(`promoted.education[].awards[].participated`.team, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education[].awards`.participated, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`promoted.education`.awards, 'Array(Dynamic)'))))), dynamicElement(promoted.education, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "%%Civil%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
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
				require.Equal(t, normalize(c.expected.Query), normalize(q.Query))
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryBodyMessage(t *testing.T) {
	constants.BodyV2QueryEnabled = true
	defer func() {
		constants.BodyV2QueryEnabled = false
	}()

	jqb := buildTestJSONQueryBuilder()
	jqb.promotedPaths.Store("message", struct{}{})
	jqb.stringIndexedColumns.Store(map[string]string{
		"promoted.message": assumeNotNull("promoted.message"),
	})

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm, jqb)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, "", nil)
	resourceFilterStmtBuilder := resourceFilterStmtBuilder()

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		jqb,
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
			name:        "body.message Exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (body_v2.message IS NOT NULL OR promoted.message IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message equals to empty string",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message = ''"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_v2.message, 'String') = ? OR dynamicElement(promoted.message, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "", "", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message equals to 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_v2.message, 'String') = ? OR dynamicElement(promoted.message, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message contains 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message Contains 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body, body_v2, promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (LOWER(dynamicElement(body_v2.message, 'String')) LIKE LOWER(?) OR LOWER(assumeNotNull(dynamicElement(promoted.message, 'String'))) LIKE LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%%Iron Award%%", "%%Iron Award%%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
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
func buildTestJSONQueryBuilder() *JSONQueryBuilder {
	b := &JSONQueryBuilder{
		cache:    sync.Map{},
		lastSeen: 1747945619,
	}

	types := map[string][]telemetrytypes.JSONDataType{
		"user.name":                                           {telemetrytypes.String},
		"user.age":                                            {telemetrytypes.Int64},
		"user.height":                                         {telemetrytypes.Float64},
		"education":                                           {telemetrytypes.ArrayJSON},
		"education[].name":                                    {telemetrytypes.String},
		"education[].type":                                    {telemetrytypes.String, telemetrytypes.Int64},
		"education[].internal_type":                           {telemetrytypes.String},
		"education[].metadata.location":                       {telemetrytypes.String},
		"education[].parameters":                              {telemetrytypes.ArrayFloat64, telemetrytypes.ArrayDynamic},
		"education[].duration":                                {telemetrytypes.String},
		"education[].mode":                                    {telemetrytypes.String},
		"education[].year":                                    {telemetrytypes.Int64},
		"education[].field":                                   {telemetrytypes.String},
		"education[].awards":                                  {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education[].awards[].name":                           {telemetrytypes.String},
		"education[].awards[].rank":                           {telemetrytypes.Int64},
		"education[].awards[].medal":                          {telemetrytypes.String},
		"education[].awards[].type":                           {telemetrytypes.String},
		"education[].awards[].semester":                       {telemetrytypes.Int64},
		"education[].awards[].participated":                   {telemetrytypes.ArrayDynamic, telemetrytypes.ArrayJSON},
		"education[].awards[].participated[].type":            {telemetrytypes.String},
		"education[].awards[].participated[].field":           {telemetrytypes.String},
		"education[].awards[].participated[].project_type":    {telemetrytypes.String},
		"education[].awards[].participated[].project_name":    {telemetrytypes.String},
		"education[].awards[].participated[].race_type":       {telemetrytypes.String},
		"education[].awards[].participated[].team_based":      {telemetrytypes.Bool},
		"education[].awards[].participated[].team_name":       {telemetrytypes.String},
		"education[].awards[].participated[].team":            {telemetrytypes.ArrayJSON},
		"education[].awards[].participated[].team[].name":     {telemetrytypes.String},
		"education[].awards[].participated[].team[].branch":   {telemetrytypes.String},
		"education[].awards[].participated[].team[].semester": {telemetrytypes.Int64},
		"interests":                                                                  {telemetrytypes.ArrayJSON},
		"interests[].type":                                                           {telemetrytypes.String},
		"interests[].entities":                                                       {telemetrytypes.ArrayJSON},
		"interests[].entities.application_date":                                      {telemetrytypes.String},
		"interests[].entities[].reviews":                                             {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].given_by":                                  {telemetrytypes.String},
		"interests[].entities[].reviews[].remarks":                                   {telemetrytypes.String},
		"interests[].entities[].reviews[].weight":                                    {telemetrytypes.Float64},
		"interests[].entities[].reviews[].passed":                                    {telemetrytypes.Bool},
		"interests[].entities[].reviews[].type":                                      {telemetrytypes.String},
		"interests[].entities[].reviews[].analysis_type":                             {telemetrytypes.Int64},
		"interests[].entities[].reviews[].entries":                                   {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].subject":                         {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].status":                          {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata":                        {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].company":              {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].experience":           {telemetrytypes.Int64},
		"interests[].entities[].reviews[].entries[].metadata[].unit":                 {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions":            {telemetrytypes.ArrayJSON},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].name":     {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].duration": {telemetrytypes.Int64, telemetrytypes.Float64},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].unit":     {telemetrytypes.String},
		"interests[].entities[].reviews[].entries[].metadata[].positions[].ratings":  {telemetrytypes.ArrayInt64, telemetrytypes.ArrayString},
		"message": {telemetrytypes.String},
	}

	for path, types := range types {
		typesSet := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()
		for _, t := range types {
			typesSet.Insert(t)
		}
		b.cache.Store(path, typesSet)
	}

	b.stringIndexedColumns.Store(map[string]string{})
	return b
}
