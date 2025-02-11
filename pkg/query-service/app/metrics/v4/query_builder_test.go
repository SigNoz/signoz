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
			expectedQueryContains: "SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['http_requests'] AND temporality = 'Delta' AND unix_milli >= 1706428800000 AND unix_milli < 1706434026000",
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
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['http_requests'] AND temporality = 'Cumulative' AND unix_milli >= 1706428800000 AND unix_milli < 1706434026000",
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
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'endpoint') as endpoint, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['http_requests'] AND temporality = 'Cumulative' AND unix_milli >= 1706428800000 AND unix_milli < 1706434026000",
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
			expectedQueryContains: "SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['http_requests'] AND temporality = 'Cumulative' AND unix_milli >= 1706428800000 AND unix_milli < 1706434026000 AND JSONExtractString(labels, 'service_name') != 'payment_service' AND JSONExtractString(labels, 'endpoint') IN ['/paycallback','/payme','/paypal']",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1706432226000 - 2:27:06 PM (IST)
			// 1706434026000 - 2:57:06 PM (IST)
			query, err := helpers.PrepareTimeseriesFilterQuery(1706432226000, 1706434026000, testCase.builderQuery)
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepareMetricQueryCumulativeRate(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
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
			expectedQueryContains: "SELECT service_name, ts, sum(per_series_value) as value FROM (SELECT service_name, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
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
			expectedQueryContains: "SELECT service_name, endpoint, ts, sum(per_series_value) as value FROM (SELECT service_name, endpoint, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, any(endpoint) as endpoint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'endpoint') as endpoint, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, endpoint, ts ORDER BY service_name ASC, endpoint ASC, ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1650991982000 - April 26, 2022 10:23:02 PM
			// 1651078382000 - April 27, 2022 10:23:02 PM
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.QueryTypeBuilder, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepareMetricQueryDeltaRate(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = delta, no group by",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_calls_total",
				},
				Temporality: v3.Delta,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				Expression:       "A",
				Disabled:         false,
				TimeAggregation:  v3.TimeAggregationRate,
				SpaceAggregation: v3.SpaceAggregationSum,
			},
			expectedQueryContains: "SELECT  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY ts ORDER BY ts ASC",
		},
		{
			name: "test time aggregation = rate, space aggregation = sum, temporality = delta, group by service_name",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_calls_total",
				},
				Temporality: v3.Delta,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
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
			expectedQueryContains: "SELECT service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1650991982000 - April 26, 2022 10:23:02 PM
			// 1651078382000 - April 27, 2022 10:23:02 PM
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.QueryTypeBuilder, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepreMetricQueryCumulativeQuantile(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test temporality = cumulative, quantile = 0.99",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
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
				SpaceAggregation: v3.SpaceAggregationPercentile99,
			},
			expectedQueryContains: "SELECT service_name, ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT service_name, le, ts, sum(per_series_value) as value FROM (SELECT service_name, le, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, any(le) as le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, le, ts ORDER BY service_name ASC, le ASC, ts ASC) GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
		},
		{
			name: "test temporality = cumulative, quantile = 0.99 without group by",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
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
				Expression:       "A",
				Disabled:         false,
				SpaceAggregation: v3.SpaceAggregationPercentile99,
			},
			expectedQueryContains: "SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT le, ts, sum(per_series_value) as value FROM (SELECT le, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(le) as le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY le, ts ORDER BY le ASC, ts ASC) GROUP BY ts ORDER BY ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1650991982000 - April 26, 2022 10:23:02 PM
			// 1651078382000 - April 27, 2022 10:23:02 PM
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.QueryTypeBuilder, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepreMetricQueryDeltaQuantile(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test temporality = delta, quantile = 0.99 group by service_name",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
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
				SpaceAggregation: v3.SpaceAggregationPercentile99,
			},
			expectedQueryContains: "SELECT service_name, ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT service_name, le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY service_name, le, ts ORDER BY service_name ASC, le ASC, ts ASC) GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
		},
		{
			name: "test temporality = delta, quantile = 0.99 no group by",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
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
							Value:    "frontend",
						},
					},
				},
				Expression:       "A",
				Disabled:         false,
				SpaceAggregation: v3.SpaceAggregationPercentile99,
			},
			expectedQueryContains: "SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(value)/60 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY le, ts ORDER BY le ASC, ts ASC) GROUP BY ts ORDER BY ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1650991982000 - April 26, 2022 10:23:02 PM
			// 1651078382000 - April 27, 2022 10:23:02 PM
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.QueryTypeBuilder, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepareMetricQueryGauge(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test gauge query with no group by",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "system_cpu_usage",
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				Expression:       "A",
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			expectedQueryContains: "SELECT ts, sum(per_series_value) as value FROM (SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system_cpu_usage'] AND temporality = 'Unspecified' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['system_cpu_usage'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY ts ORDER BY ts ASC",
		},
		{
			name: "test value filter with string value",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "k8s_pod_phase",
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "__value",
								Type:     v3.AttributeKeyTypeTag,
								DataType: v3.AttributeKeyDataTypeString,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "200",
						},
					},
				},
				Expression:       "A",
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Disabled:         false,
			},
			expectedQueryContains: "WHERE isNaN(per_series_value) = 0 AND per_series_value = 200",
		},
		{
			name: "test gauge query with group by host_name",
			builderQuery: &v3.BuilderQuery{
				QueryName:    "A",
				StepInterval: 60,
				DataSource:   v3.DataSourceMetrics,
				AggregateAttribute: v3.AttributeKey{
					Key: "system_cpu_usage",
				},
				Temporality: v3.Unspecified,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items:    []v3.FilterItem{},
				},
				GroupBy: []v3.AttributeKey{{
					Key:      "host_name",
					DataType: v3.AttributeKeyDataTypeString,
					Type:     v3.AttributeKeyTypeTag,
				}},
				TimeAggregation:  v3.TimeAggregationAvg,
				SpaceAggregation: v3.SpaceAggregationSum,
				Expression:       "A",
				Disabled:         false,
			},
			expectedQueryContains: "SELECT host_name, ts, sum(per_series_value) as value FROM (SELECT fingerprint, any(host_name) as host_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, avg(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'host_name') as host_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system_cpu_usage'] AND temporality = 'Unspecified' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['system_cpu_usage'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY host_name, ts ORDER BY host_name ASC, ts ASC",
		},
		{
			name: "test gauge query with multiple group by with metric and attribute name containing dot",
			builderQuery: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorMax,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system.memory.usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyType("Gauge"),
					IsColumn: true,
				},
				Temporality:      v3.Unspecified,
				TimeAggregation:  v3.TimeAggregationMax,
				SpaceAggregation: v3.SpaceAggregationMax,
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
							Value:    "signoz-host",
						},
					},
				},
				Expression:   "A",
				Disabled:     false,
				StepInterval: 60,
				OrderBy: []v3.OrderBy{
					{
						ColumnName: "os.type",
						Order:      v3.DirectionDesc,
					},
					{
						ColumnName: "state",
						Order:      v3.DirectionAsc,
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "os.type",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
					{
						Key:      "state",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
					{
						Key:      "host.name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
				},
				Legend:   "",
				ReduceTo: v3.ReduceToOperatorAvg,
				Having:   []v3.Having{},
			},
			expectedQueryContains: "SELECT `os.type`, state, `host.name`, ts, max(per_series_value) as value FROM (SELECT fingerprint, any(`os.type`) as `os.type`, any(state) as state, any(`host.name`) as `host.name`, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'os.type') as `os.type`, JSONExtractString(labels, 'state') as state, JSONExtractString(labels, 'host.name') as `host.name`, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system.memory.usage'] AND temporality = 'Unspecified' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND JSONExtractString(labels, 'host.name') = 'signoz-host') as filtered_time_series USING fingerprint WHERE metric_name IN ['system.memory.usage'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY `os.type`, state, `host.name`, ts ORDER BY `os.type` desc, state asc, `host.name` ASC, ts ASC",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1650991982000 - April 26, 2022 10:23:02 PM
			// 1651078382000 - April 27, 2022 10:23:02 PM
			query, err := PrepareMetricQuery(1650991982000, 1651078382000, v3.QueryTypeBuilder, v3.PanelTypeGraph, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}

func TestPrepareMetricQueryValueTypePanelWithGroupBY(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "false")
	testCases := []struct {
		name                  string
		builderQuery          *v3.BuilderQuery
		expectedQueryContains string
	}{
		{
			name: "test temporality = cumulative, panel = value, series agg = max group by state",
			builderQuery: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorMin,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyType("Gauge"),
					IsColumn: true,
				},
				Temporality:          v3.Delta,
				TimeAggregation:      v3.TimeAggregationAnyLast,
				SpaceAggregation:     v3.SpaceAggregationAvg,
				SecondaryAggregation: v3.SecondaryAggregationMax,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "os_type",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "linux",
						},
					},
				},
				Expression:   "A",
				Disabled:     false,
				StepInterval: 60,
				OrderBy: []v3.OrderBy{
					{
						ColumnName: "state",
						Order:      v3.DirectionDesc,
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "state",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
				},
				Legend:   "",
				ReduceTo: v3.ReduceToOperatorSum,
				Having: []v3.Having{
					{
						ColumnName: "AVG(system_memory_usage)",
						Operator:   v3.HavingOperatorGreaterThan,
						Value:      5,
					},
				},
			},
			expectedQueryContains: "SELECT max(value) as aggregated_value, ts FROM (SELECT state, ts, avg(per_series_value) as value FROM (SELECT fingerprint, any(state) as state, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, anyLast(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'state') as state, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['system_memory_usage'] AND temporality = 'Delta' AND unix_milli >= 1735891200000 AND unix_milli < 1735894800000 AND JSONExtractString(labels, 'os_type') = 'linux') as filtered_time_series USING fingerprint WHERE metric_name IN ['system_memory_usage'] AND unix_milli >= 1735891800000 AND unix_milli < 1735894800000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY state, ts ORDER BY state desc, ts ASC) GROUP BY ts ORDER BY ts",
		},
		{
			name: "test temporality = cumulative, panel = value, series agg = max group by state, host_name",
			builderQuery: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorMin,
				AggregateAttribute: v3.AttributeKey{
					Key:      "system_memory_usage",
					DataType: v3.AttributeKeyDataTypeFloat64,
					Type:     v3.AttributeKeyType("Gauge"),
					IsColumn: true,
				},
				Temporality:          v3.Cumulative,
				TimeAggregation:      v3.TimeAggregationAnyLast,
				SpaceAggregation:     v3.SpaceAggregationAvg,
				SecondaryAggregation: v3.SecondaryAggregationMax,
				Filters: &v3.FilterSet{
					Operator: "AND",
					Items: []v3.FilterItem{
						{
							Key: v3.AttributeKey{
								Key:      "os_type",
								DataType: v3.AttributeKeyDataTypeString,
								Type:     v3.AttributeKeyTypeTag,
								IsColumn: false,
							},
							Operator: v3.FilterOperatorEqual,
							Value:    "linux",
						},
					},
				},
				Expression:   "A",
				Disabled:     false,
				StepInterval: 60,
				OrderBy: []v3.OrderBy{
					{
						ColumnName: "state",
						Order:      v3.DirectionDesc,
					},
				},
				GroupBy: []v3.AttributeKey{
					{
						Key:      "state",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
					{
						Key:      "host_name",
						DataType: v3.AttributeKeyDataTypeString,
						Type:     v3.AttributeKeyTypeTag,
						IsColumn: false,
					},
				},
				Legend:   "",
				ReduceTo: v3.ReduceToOperatorSum,
				Having: []v3.Having{
					{
						ColumnName: "AVG(system_memory_usage)",
						Operator:   v3.HavingOperatorGreaterThan,
						Value:      5,
					},
				},
			},
			expectedQueryContains: "SELECT max(value) as aggregated_value, ts FROM (SELECT state, host_name, ts, avg(per_series_value) as value FROM (SELECT fingerprint, any(state) as state, any(host_name) as host_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, anyLast(value) as per_series_value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'state') as state, JSONExtractString(labels, 'host_name') as host_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['system_memory_usage'] AND temporality = 'Cumulative' AND unix_milli >= 1735891200000 AND unix_milli < 1735894800000 AND JSONExtractString(labels, 'os_type') = 'linux') as filtered_time_series USING fingerprint WHERE metric_name IN ['system_memory_usage'] AND unix_milli >= 1735891800000 AND unix_milli < 1735894800000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY state, host_name, ts ORDER BY state desc, host_name ASC, ts ASC) GROUP BY ts ORDER BY ts",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			// 1735891811000 - Friday, 3 January 2025 13:40:11 GMT+05:30
			// 1735894811000 - Friday, 3 January 2025 14:30:11 GMT+05:30
			query, err := PrepareMetricQuery(1735891811000, 1735894811000, v3.QueryTypeBuilder, v3.PanelTypeValue, testCase.builderQuery, metricsV3.Options{})
			assert.Nil(t, err)
			assert.Contains(t, query, testCase.expectedQueryContains)
		})
	}
}
