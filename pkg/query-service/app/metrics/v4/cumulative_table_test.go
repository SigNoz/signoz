package v4

import (
	"testing"

	"github.com/stretchr/testify/require"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func TestBuildCumulativeTableRateQuery(t *testing.T) {
	t.Run("TestBuildCumulativeTableRateQuery", func(t *testing.T) {
		q := &v3.QueryRangeParamsV3{
			Start: 1701581460000,
			End:   1701583260000,
			CompositeQuery: &v3.CompositeQuery{
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:           "A",
						StepInterval:        60,
						AggregateAttribute:  v3.AttributeKey{Key: "my_counter_cumulative"},
						Filters:             &v3.FilterSet{Operator: "AND", Items: []v3.FilterItem{}},
						TemporalAggregation: v3.TemporalAggregationRate,
						SpatialAggregation:  v3.SpatialAggregationSum,
						Expression:          "A",
						GroupBy: []v3.AttributeKey{
							{Key: "indian_city"},
						},
						Temporality: v3.Cumulative,
					},
				},
			},
		}
		query, err := buildMetricQueryCumulativeTable(q.Start, q.End, 60, q.CompositeQuery.BuilderQueries["A"])
		require.NoError(t, err)

		require.Equal(t, query, "SELECT indian_city, ts, toStartOfHour(now()) as ts,  sum(per_series_value)/30 as value FROM (SELECT indian_city, ts, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, nan, If((ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window) >= 86400, nan, (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDate('1970-01-01')) OVER rate_window))) as per_series_value FROM(SELECT fingerprint, any(indian_city) as indian_city, toStartOfInterval(toDateTime(intDiv(timestamp_ms, 1000)), INTERVAL 60 SECOND) as ts, max(value) as per_series_value FROM signoz_metrics.distributed_samples_v2 INNER JOIN (SELECT DISTINCT  JSONExtractString(labels, 'indian_city') as indian_city, fingerprint FROM signoz_metrics.time_series_v2 WHERE metric_name = 'my_counter_cumulative' AND temporality = 'Cumulative' ) as filtered_time_series USING fingerprint WHERE metric_name = 'my_counter_cumulative' AND timestamp_ms >= 1701581460000 AND timestamp_ms <= 1701583260000 GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window as (PARTITION BY fingerprint ORDER BY fingerprint, ts) ) WHERE isNaN(per_series_value) = 0 GROUP BY GROUPING SETS ( (indian_city, ts), (indian_city) ) ORDER BY indian_city ASC, ts ASC")
	})
}
