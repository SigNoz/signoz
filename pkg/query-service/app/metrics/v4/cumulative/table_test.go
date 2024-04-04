package cumulative

import (
	"testing"

	"github.com/stretchr/testify/assert"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPrepareTableQuery(t *testing.T) {
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
			expectedQueryContains: "SELECT ts, sum(per_series_value) as value FROM (SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name = 'system_memory_usage' AND temporality = 'Unspecified' AND unix_milli >= 1701792000000 AND unix_milli < 1701796780000 AND JSONExtractString(labels, 'state') != 'idle') as filtered_time_series USING fingerprint WHERE metric_name = 'system_memory_usage' AND unix_milli >= 1701794980000 AND unix_milli < 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY ts ORDER BY ts ASC",
		},
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = cumulative",
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
				Temporality: v3.Cumulative,
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
			expectedQueryContains: "SELECT service_name, ts, sum(per_series_value) as value FROM (SELECT service_name, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name = 'http_requests' AND temporality = 'Cumulative' AND unix_milli >= 1701792000000 AND unix_milli < 1701796780000 AND like(JSONExtractString(labels, 'service_name'), '%payment_service%')) as filtered_time_series USING fingerprint WHERE metric_name = 'http_requests' AND unix_milli >= 1701794980000 AND unix_milli < 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY GROUPING SETS ( (service_name, ts), (service_name) ) ORDER BY service_name ASC, ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := PrepareMetricQueryCumulativeTable(
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
