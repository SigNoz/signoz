package delta

import (
	"testing"

	"github.com/stretchr/testify/assert"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPrepareTableQuery(t *testing.T) {
	// The table query is almost the same as the time series query, except that
	// each row will be reduced to a single value using the `ReduceTo` aggregation
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		start                 int64
		end                   int64
		expectedQueryContains string
	}{
		{
			name: "test time aggregation = avg, space aggregation = sum, temporality = unspecified",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyTypeUnspecified,
					IsColumn: true,
					IsJSON:   false,
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "state",
								Type:     v3.AttributeKeyTypeTag,
								DataType: v3.AttributeKeyDataTypeString,
							},
							Operator: v3.FilterOperatorNotEqual,
							Value:    "idle",
						},
					},
				},
				GroupBy:          []v3.AttributeKey{},
				Expression:       "A",
				Disabled:         false,
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
			},
			start:                 1701794980000,
			end:                   1701796780000,
			expectedQueryContains: "SELECT ts, sum(per_series_value) as value FROM (SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['system_memory_usage'] AND temporality = 'Unspecified' AND unix_milli >= 1701792000000 AND unix_milli < 1701796780000 AND JSONExtractString(labels, 'state') != 'idle') as filtered_time_series USING fingerprint WHERE metric_name IN ['system_memory_usage'] AND unix_milli >= 1701794980000 AND unix_milli < 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY ts ORDER BY ts ASC",
		},
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = delta",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key:      "http_requests",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyTypeUnspecified,
					IsColumn: true,
					IsJSON:   false,
				},
				Temporality: v3.Delta,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "service_name",
								Type:     v3.AttributeKeyTypeTag,
								DataType: v3.AttributeKeyDataTypeString,
							},
							Operator: v3.FilterOperatorContains,
							Value:    "payment_service",
						},
					},
				},
				GroupBy: []v3.AttributeKey{{
					Key:      "service_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				}},
				Expression:       "A",
				Disabled:         false,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
			},
			start:                 1701794980000,
			end:                   1701796780000,
			expectedQueryContains: "SELECT service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['http_requests'] AND temporality = 'Delta' AND unix_milli >= 1701792000000 AND unix_milli < 1701796780000 AND like(JSONExtractString(labels, 'service_name'), '%payment_service%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['http_requests'] AND unix_milli >= 1701794980000 AND unix_milli < 1701796780000 GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
		},
		{
			name: "test time aggregation = rate, space aggregation = avg, temporality = delta, testing metrics and attribute name with dot",
			builderQuery: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorRate,
				AggregateAttribute: v3.AttributeKey{
					Key:      "signoz.latency.sum",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyType("Sum"),
					IsColumn: true,
				},
				Temporality:      v3.Delta,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationAvg,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "host.name",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "4f6ec470feea",
						},
					},
				},
				Expression:   "A",
				Disabled:     false,
				StepInterval: 60,
				OrderBy: []v3.OrderBy{
					{
						ColumnName: "status.code",
						Order:      v3.DirectionAsc,
					},
				},
				GroupBy:  []v3.AttributeKey{},
				Legend:   "",
				ReduceTo: v3.ReduceToOperatorLast,
				Having:   []v3.Having{},
			},
			start:                 1701794980000,
			end:                   1701796780000,
			expectedQueryContains: "SELECT ts, avg(per_series_value) as value FROM (SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['signoz.latency.sum'] AND temporality = 'Delta' AND unix_milli >= 1701792000000 AND unix_milli < 1701796780000 AND JSONExtractString(labels, 'host.name') = '4f6ec470feea') as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz.latency.sum'] AND unix_milli >= 1701794980000 AND unix_milli < 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY ts ORDER BY ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := PrepareMetricQueryDeltaTable(
				testCase.start,
				testCase.end,
				testCase.builderQuery.StepInterval,
				testCase.builderQuery,
			)
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}
