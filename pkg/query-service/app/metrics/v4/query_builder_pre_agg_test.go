package v4

import (
	"testing"

	"github.com/stretchr/testify/assert"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPrepareMetricQueryCumulativeRatePreAgg(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "true")
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
			expectedQueryContains: "SELECT service_name, ts, sum(per_series_value) as value FROM (SELECT service_name, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(max) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
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
			expectedQueryContains: "SELECT service_name, endpoint, ts, sum(per_series_value) as value FROM (SELECT service_name, endpoint, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, any(endpoint) as endpoint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(max) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'endpoint') as endpoint, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991920000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, endpoint, ts ORDER BY service_name ASC, endpoint ASC, ts ASC",
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

func TestPrepareMetricQueryDeltaRatePreAgg(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "true")
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
			expectedQueryContains: "SELECT  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum)/60 as value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY ts ORDER BY ts ASC",
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
			expectedQueryContains: "SELECT service_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum)/60 as value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_calls_total'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_calls_total'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
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

func TestPrepreMetricQueryCumulativeQuantilePreAgg(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "true")
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
			expectedQueryContains: "SELECT service_name, ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT service_name, le, ts, sum(per_series_value) as value FROM (SELECT service_name, le, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(service_name) as service_name, any(le) as le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(max) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY service_name, le, ts ORDER BY service_name ASC, le ASC, ts ASC) GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
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
			expectedQueryContains: "SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT le, ts, sum(per_series_value) as value FROM (SELECT le, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM (SELECT fingerprint, any(le) as le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, max(max) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Cumulative' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts)) WHERE isNaN(per_series_value) = 0 GROUP BY le, ts ORDER BY le ASC, ts ASC) GROUP BY ts ORDER BY ts ASC",
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

func TestPrepreMetricQueryDeltaQuantilePreAgg(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "true")
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
			expectedQueryContains: "SELECT service_name, ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT service_name, le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum)/60 as value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY service_name, le, ts ORDER BY service_name ASC, le ASC, ts ASC) GROUP BY service_name, ts ORDER BY service_name ASC, ts ASC",
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
			expectedQueryContains: "SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT le, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum)/60 as value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'le') as le, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000 AND like(JSONExtractString(labels, 'service_name'), '%frontend%')) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY le, ts ORDER BY le ASC, ts ASC) GROUP BY ts ORDER BY ts ASC",
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

func TestPrepareMetricQueryGaugePreAgg(t *testing.T) {
	t.Setenv("USE_METRICS_PRE_AGGREGATION", "true")
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
			expectedQueryContains: "SELECT ts, sum(per_series_value) as value FROM (SELECT fingerprint,  toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum) / sum(count) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system_cpu_usage'] AND temporality = 'Unspecified' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['system_cpu_usage'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY ts ORDER BY ts ASC",
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
			expectedQueryContains: "SELECT host_name, ts, sum(per_series_value) as value FROM (SELECT fingerprint, any(host_name) as host_name, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) as ts, sum(sum) / sum(count) as per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'host_name') as host_name, fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN ['system_cpu_usage'] AND temporality = 'Unspecified' AND unix_milli >= 1650931200000 AND unix_milli < 1651078380000) as filtered_time_series USING fingerprint WHERE metric_name IN ['system_cpu_usage'] AND unix_milli >= 1650991980000 AND unix_milli < 1651078380000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WHERE isNaN(per_series_value) = 0 GROUP BY host_name, ts ORDER BY host_name ASC, ts ASC",
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
