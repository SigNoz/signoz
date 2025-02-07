package v3

import (
	"testing"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestPanelTableForDelta(t *testing.T) {
	cases := []struct {
		name     string
		query    *v3.BuilderQuery
		expected string
	}{
		{
			name: "request rate",
			query: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorSumRate,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_count",
				},
				Temporality: v3.Delta,
				Filters: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key:      v3.AttributeKey{Key: "service_name"},
							Operator: v3.FilterOperatorIn,
							Value:    []interface{}{"frontend"},
						},
						{
							Key:      v3.AttributeKey{Key: "operation"},
							Operator: v3.FilterOperatorIn,
							Value:    []interface{}{"HTTP GET /dispatch"},
						},
					},
				},
				Expression: "A",
			},
			expected: "SELECT  toStartOfHour(now()) as ts, sum(value)/1800 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['signoz_latency_count'] AND temporality = 'Delta' AND unix_milli >= 1689253200000 AND unix_milli < 1689257640000 AND JSONExtractString(labels, 'service_name') IN ['frontend'] AND JSONExtractString(labels, 'operation') IN ['HTTP GET /dispatch']) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_count'] AND unix_milli >= 1689255866000 AND unix_milli <= 1689257640000 GROUP BY ts ORDER BY  ts",
		},
		{
			name: "latency p50",
			query: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorHistQuant50,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
				},
				Temporality: v3.Delta,
				Filters: &v3.FilterSet{
					Items: []v3.FilterItem{
						{
							Key:      v3.AttributeKey{Key: "service_name"},
							Operator: v3.FilterOperatorEqual,
							Value:    "frontend",
						},
					},
				},
				Expression: "A",
			},
			expected: "SELECT  ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.500) as value FROM (SELECT le,  toStartOfHour(now()) as ts, sum(value)/1800 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1689253200000 AND unix_milli < 1689257640000 AND JSONExtractString(labels, 'service_name') = 'frontend') as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1689255866000 AND unix_milli <= 1689257640000 GROUP BY le,ts ORDER BY le ASC, ts) GROUP BY ts ORDER BY  ts",
		},
		{
			name: "latency p99 with group by",
			query: &v3.BuilderQuery{
				QueryName:         "A",
				DataSource:        v3.DataSourceMetrics,
				AggregateOperator: v3.AggregateOperatorHistQuant99,
				AggregateAttribute: v3.AttributeKey{
					Key: "signoz_latency_bucket",
				},
				Temporality: v3.Delta,
				GroupBy: []v3.AttributeKey{
					{
						Key: "service_name",
					},
				},
				Expression: "A",
			},
			expected: "SELECT service_name,  ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) as value FROM (SELECT service_name,le,  toStartOfHour(now()) as ts, sum(value)/1800 as value FROM signoz_metrics.distributed_samples_v4 INNER JOIN (SELECT DISTINCT JSONExtractString(labels, 'service_name') as service_name, fingerprint FROM signoz_metrics.time_series_v4 WHERE metric_name IN ['signoz_latency_bucket'] AND temporality = 'Delta' AND unix_milli >= 1689253200000 AND unix_milli < 1689257640000) as filtered_time_series USING fingerprint WHERE metric_name IN ['signoz_latency_bucket'] AND unix_milli >= 1689255866000 AND unix_milli <= 1689257640000 GROUP BY service_name,le,ts ORDER BY service_name ASC,le ASC, ts) GROUP BY service_name,ts ORDER BY service_name ASC, ts",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			query, err := buildDeltaMetricQueryForTable(1689255866000, 1689257640000, 1800, c.query)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if query != c.expected {
				t.Fatalf("expected: %s, got: %s", c.expected, query)
			}
		})
	}
}
