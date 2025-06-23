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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf(mapContains(resources_string, 'service.name') = ?, resources_string['service.name'], NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? GROUP BY ALL ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(timestamp, INTERVAL 30 SECOND) AS ts, toString(multiIf(mapContains(resources_string, 'service.name') = ?, resources_string['service.name'], NULL)) AS `service.name`, count() AS __result_0 FROM signoz_traces.distributed_signoz_index_v3 WHERE resource_fingerprint IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND timestamp < ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND (`service.name`) IN (SELECT `service.name` FROM __limit_cte) GROUP BY ALL",
				Args:  []any{"redis-manual", "%service.name%", "%service.name%redis-manual%", uint64(1747945619), uint64(1747983448), true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448), 10, true, "1747947419000000000", "1747983448000000000", uint64(1747945619), uint64(1747983448)},
			},
			expectedErr: nil,
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildCompleteFieldKeyMap()
	aggExprRewriter := querybuilder.NewAggExprRewriter(nil, fm, cb, "", nil)

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
