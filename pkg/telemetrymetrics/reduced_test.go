package telemetrymetrics

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func reducedQuery(metric string, ty metrictypes.Type, temp metrictypes.Temporality, ta metrictypes.TimeAggregation, sa metrictypes.SpaceAggregation) qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation] {
	return qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Signal:       telemetrytypes.SignalMetrics,
		StepInterval: qbtypes.Step{Duration: 5 * time.Minute},
		Aggregations: []qbtypes.MetricAggregation{{
			MetricName:       metric,
			Type:             ty,
			Temporality:      temp,
			TimeAggregation:  ta,
			SpaceAggregation: sa,
			Reduced:          true,
		}},
	}
}

func TestReducedStatementBuilder(t *testing.T) {
	cases := []struct {
		name     string
		query    qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		expected qbtypes.Statement
	}{
		{
			name:  "gauge_sum_latest",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationLatest, metrictypes.SpaceAggregationSum),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, anyLast(last) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, argMax(value, unix_milli) AS per_series_value FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum_last`, computed_at) AS value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", false, "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746999900000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
		{
			name:  "gauge_avg_avg",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationAvg, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(sum) / sum(count) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, avg(value) AS per_series_value, avg(weight) AS per_series_weight FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum_last`, computed_at) AS value, argMax(`count_series`, computed_at) AS weight FROM signoz_metrics.distributed_samples_v4_reduced_last_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", false, "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746999900000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
		{
			name:  "gauge_min_min",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationMin, metrictypes.SpaceAggregationMin),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, min(min) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, min(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, min(value) AS per_series_value FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`min`, computed_at) AS value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, min(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", false, "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746999900000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
		{
			name:  "gauge_max_max",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationMax, metrictypes.SpaceAggregationMax),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, max(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(value) AS per_series_value FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`max`, computed_at) AS value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, max(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", false, "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746999900000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
		{
			name:  "counter_sum_rate",
			query: reducedQuery("test.metric.sum", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationSum),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(value) / 300 AS per_series_value FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum`, computed_at) AS value FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric.sum", uint64(1746921600000), uint64(1747172760000), "cumulative", false, "test.metric.sum", uint64(1746999600000), uint64(1747172760000), 0, "test.metric.sum", uint64(1746999600000), uint64(1747172760000), "test.metric.sum", uint64(1746999600000), uint64(1747172760000), false},
			},
		},
		{
			name:  "counter_avg_increase",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationIncrease, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(value) AS per_series_value, avg(weight) AS per_series_weight FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum`, computed_at) AS value, argMax(`count_series`, computed_at) AS weight FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", false, "test.metric", uint64(1746999600000), uint64(1747172760000), 0, "test.metric", uint64(1746999600000), uint64(1747172760000), "test.metric", uint64(1746999600000), uint64(1747172760000), false},
			},
		},
		{
			name:  "counter_min_omitted",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationMin),
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, min(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", false, "test.metric", uint64(1746999600000), uint64(1747172760000), 0},
			},
		},
		{
			name:  "counter_max_omitted",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationMax),
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, max(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", false, "test.metric", uint64(1746999600000), uint64(1747172760000), 0},
			},
		},
		{
			name:  "histogram_p99",
			query: reducedQuery("test.metric.bucket", metrictypes.HistogramType, metrictypes.Cumulative, metrictypes.TimeAggregationUnspecified, metrictypes.SpaceAggregationPercentile99),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, `le`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, `le`, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `le` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `le`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `le`) SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) AS value FROM __spatial_aggregation_cte GROUP BY ts ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, `le`, sum(value) / 300 AS per_series_value FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum`, computed_at) AS value FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts, `le`), __spatial_aggregation_cte AS (SELECT ts, `le`, sum(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts, `le`) SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) AS value FROM __spatial_aggregation_cte GROUP BY ts ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric.bucket", uint64(1746921600000), uint64(1747172760000), "cumulative", false, "test.metric.bucket", uint64(1746999900000), uint64(1747172760000), 0, "test.metric.bucket", uint64(1746999900000), uint64(1747172760000), "test.metric.bucket", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
		{
			name:  "summary_avg",
			query: reducedQuery("test.metric", metrictypes.SummaryType, metrictypes.Unspecified, metrictypes.TimeAggregationAvg, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(sum) / sum(count) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, avg(value) AS per_series_value, avg(weight) AS per_series_weight FROM (SELECT reduced_fingerprint AS fingerprint, unix_milli, argMax(`sum_last`, computed_at) AS value, argMax(`count_series`, computed_at) AS weight FROM signoz_metrics.distributed_samples_v4_reduced_last_60s WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY reduced_fingerprint, unix_milli) AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.distributed_time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND __normalized = ? GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", false, "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746999900000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000), false},
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	fl, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	require.NoError(t, err)
	sb := NewMetricQueryStatementBuilder(instrumentationtest.New().ToProviderSettings(), telemetrytypestest.NewMockMetadataStore(), fm, cb, fl)

	const start, end = uint64(1747000000000), uint64(1747172800000)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := sb.Build(context.Background(), start, end, qbtypes.RequestTypeTimeSeries, c.query, nil)
			require.NoError(t, err)
			require.Equal(t, c.expected.Query, got.Query)
			require.Equal(t, c.expected.Args, got.Args)
		})
	}

	t.Run("buffer_recent_window", func(t *testing.T) {
		now := time.Now().UnixMilli()
		q := reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationLatest, metrictypes.SpaceAggregationSum)
		got, err := sb.Build(context.Background(), uint64(now-2*time.Hour.Milliseconds()), uint64(now), qbtypes.RequestTypeTimeSeries, q, nil)
		require.NoError(t, err)
		require.Contains(t, got.Query, "signoz_metrics.distributed_samples_v4_buffer")
		require.Contains(t, got.Query, "signoz_metrics.time_series_v4_buffer")
		require.Contains(t, got.Query, "is_reduced")
		require.NotContains(t, got.Query, "UNION ALL")
	})

	t.Run("not_reduced", func(t *testing.T) {
		q := reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationLatest, metrictypes.SpaceAggregationSum)
		q.Aggregations[0].Reduced = false
		got, err := sb.Build(context.Background(), start, end, qbtypes.RequestTypeTimeSeries, q, nil)
		require.NoError(t, err)
		require.NotContains(t, got.Query, "UNION ALL")
		require.NotContains(t, got.Query, "reduced")
		require.NotContains(t, got.Query, "buffer")
	})
}
