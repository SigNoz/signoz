package v4

import (
	"testing"

	"github.com/stretchr/testify/assert"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/metrics/v4/helpers"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPrepareTimeseriesFilterQuery(t *testing.T) {
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test prepare time series with no filters and no group by",
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
				Expression:  "A",
				Disabled:    false,
				// remaining struct fields are not needed here
			},
			expectedQueryContains: "SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'http_requests' AND temporality = 'Delta'",
		},
		{
			name: "test prepare time series with no filters and group by",
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
				GroupBy: []v3.AttributeKey{{
					Key:      "service_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				}},
				Expression: "A",
				Disabled:   false,
				// remaining struct fields are not needed here
			},
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'http_requests' AND temporality = 'Cumulative'",
		},
		{
			name: "test prepare time series with no filters and multiple group by",
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
				GroupBy: []v3.AttributeKey{
					{
						Key:      "service_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					{
						Key:      "endpoint",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
				},
				Expression: "A",
				Disabled:   false,
				// remaining struct fields are not needed here
			},
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'endpoint') as endpoint, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'http_requests' AND temporality = 'Cumulative'",
		},
		{
			name: "test prepare time series with filters and multiple group by",
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
							Operator: v3.FilterOperatorNotEqual,
							Value:    "payment_service",
						},
						{
							Key: v3.AttributeKey{
								Key:      "endpoint",
								Type:     v3.AttributeKeyTypeTag,
								DataType: v3.AttributeKeyDataTypeString,
							},
							Operator: v3.FilterOperatorIn,
							Value:    []interface{}{"/paycallback", "/payme", "/paypal"},
						},
					},
				},
				GroupBy: []v3.AttributeKey{{
					Key:      "service_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				}},
				Expression: "A",
				Disabled:   false,
				// remaining struct fields are not needed here
			},
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'http_requests' AND temporality = 'Cumulative' AND JSONExtractString(labels, 'service_name') != 'payment_service' AND JSONExtractString(labels, 'endpoint') IN ['/paycallback','/payme','/paypal']",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := helpers.PrepareTimeseriesFilterQuery(testCase.builderQuery)
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepareMetricQueryCumulativeRate(t *testing.T) {
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = cumulative",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_calls_total",
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
							Value:    "frontend",
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
			expectedQueryContains: "SELECT service_name, ts, sum(per_series_value) as value FROM (SELECT service_name, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_calls_total' AND temporality = 'Cumulative' AND like(JSONExtractString(labels, 'service_name'), '%payment_service%')) as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_calls_total' AND timestamp_ms >= 1701794980000 AND timestamp_ms <= 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY GROUPING SETS ( (service_name, ts), (service_name) ) ORDER BY service_name ASC, ts ASC",
		},
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = cumulative, multiple group by",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_calls_total",
				},
				Temporality: v3.Cumulative,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "service_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
					{
						Key:      "endpoint",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
					},
				},
				Expression:       "A",
				Disabled:         false,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
			},
			expectedQueryContains: "SELECT service_name, endpoint, ts, sum(per_series_value) as value FROM (SELECT service_name, endpoint, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, any(endpoint) as endpoint, toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'endpoint') as endpoint, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'signoz_calls_total' AND temporality = 'Cumulative' AND like(JSONExtractString(labels, 'service_name'), '%payment_service%')) as filtered_time_series USING fingerprint WHERE metric_name = 'signoz_calls_total' AND timestamp_ms >= 1701794980000 AND timestamp_ms <= 1701796780000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY GROUPING SETS ( (service_name, endpoint, ts), (service_name, endpoint), (service_name) ) ORDER BY service_name ASC, endpoint ASC, ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}

}
