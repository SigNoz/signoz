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
	"github.com/SigNoz/signoz/pkg/valuer"
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
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, anyLast(last) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT points.reduced_fingerprint AS fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, argMax(`sum_last`, unix_milli) AS per_series_value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000)},
			},
		},
		{
			name:  "gauge_avg_avg",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationAvg, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(sum) / sum(count) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT points.reduced_fingerprint AS fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, avg(`sum_last`) AS per_series_value, avg(`count_series`) AS per_series_weight FROM signoz_metrics.distributed_samples_v4_reduced_last_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000)},
			},
		},
		{
			name:  "gauge_min_min",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationMin, metrictypes.SpaceAggregationMin),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, min(min) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, min(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, min(`min`) AS value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000)},
			},
		},
		{
			name:  "gauge_max_max",
			query: reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationMax, metrictypes.SpaceAggregationMax),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, max(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(`max`) AS value FROM signoz_metrics.distributed_samples_v4_reduced_last_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000)},
			},
		},
		{
			name:  "counter_sum_rate",
			query: reducedQuery("test.metric.sum", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationSum),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(`sum`) / 300 AS value FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric.sum", uint64(1746921600000), uint64(1747172760000), "cumulative", "test.metric.sum", uint64(1746999600000), uint64(1747172760000), 0, "test.metric.sum", uint64(1746997200000), uint64(1747172760000), "test.metric.sum", uint64(1746999600000), uint64(1747172760000)},
			},
		},
		{
			name:  "counter_avg_increase",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationIncrease, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value, per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT points.reduced_fingerprint AS fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(`sum`) AS per_series_value, avg(`count_series`) AS per_series_weight FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", "test.metric", uint64(1746999600000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999600000), uint64(1747172760000)},
			},
		},
		{
			name:  "counter_min_omitted",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationMin),
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, min(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", "test.metric", uint64(1746999600000), uint64(1747172760000), 0},
			},
		},
		{
			name:  "counter_max_omitted",
			query: reducedQuery("test.metric", metrictypes.SumType, metrictypes.Cumulative, metrictypes.TimeAggregationRate, metrictypes.SpaceAggregationMax),
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, max(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "cumulative", "test.metric", uint64(1746999600000), uint64(1747172760000), 0},
			},
		},
		{
			name:  "histogram_p99",
			query: reducedQuery("test.metric.bucket", metrictypes.HistogramType, metrictypes.Cumulative, metrictypes.TimeAggregationUnspecified, metrictypes.SpaceAggregationPercentile99),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT ts, `le`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, `le`, max(max) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `le` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `le`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `le`) SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) AS value FROM __spatial_aggregation_cte GROUP BY ts ORDER BY ts) UNION ALL SELECT * FROM (WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, `le`, sum(`sum`) / 300 AS value FROM signoz_metrics.distributed_samples_v4_reduced_sum_60s AS points FINAL INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint, `le`) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `le`) SELECT ts, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.990) AS value FROM __spatial_aggregation_cte GROUP BY ts ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric.bucket", uint64(1746921600000), uint64(1747172760000), "cumulative", "test.metric.bucket", uint64(1746999900000), uint64(1747172760000), 0, "test.metric.bucket", uint64(1746997200000), uint64(1747172760000), "test.metric.bucket", uint64(1746999900000), uint64(1747172760000)},
			},
		},
		{
			name:  "summary_avg",
			query: reducedQuery("test.metric", metrictypes.SummaryType, metrictypes.Unspecified, metrictypes.TimeAggregationAvg, metrictypes.SpaceAggregationAvg),
			expected: qbtypes.Statement{
				Query: "SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, sum(sum) / sum(count) AS per_series_value FROM signoz_metrics.distributed_samples_v4_agg_5m AS points INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_1day WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) UNION ALL SELECT * FROM (WITH __temporal_aggregation_cte AS (SELECT points.reduced_fingerprint AS fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(300)) AS ts, avg(`sum_last`) AS per_series_value, avg(`count_series`) AS per_series_weight FROM signoz_metrics.distributed_samples_v4_reduced_last_60s AS points FINAL INNER JOIN (SELECT fingerprint FROM signoz_metrics.time_series_v4_reduced WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? GROUP BY fingerprint) AS filtered_time_series ON points.reduced_fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, sum(per_series_value) / sum(per_series_weight) AS value FROM __temporal_aggregation_cte GROUP BY ts) SELECT * FROM __spatial_aggregation_cte ORDER BY ts) ORDER BY ts SETTINGS do_not_merge_across_partitions_select_final = 1, optimize_move_to_prewhere_if_final = 1",
				Args:  []any{"test.metric", uint64(1746921600000), uint64(1747172760000), "unspecified", "test.metric", uint64(1746999900000), uint64(1747172760000), 0, "test.metric", uint64(1746997200000), uint64(1747172760000), "test.metric", uint64(1746999900000), uint64(1747172760000)},
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
			got, err := sb.Build(context.Background(), valuer.UUID{}, start, end, qbtypes.RequestTypeTimeSeries, c.query, nil)
			require.NoError(t, err)
			require.Equal(t, c.expected.Query, got.Query)
			require.Equal(t, c.expected.Args, got.Args)
		})
	}

	t.Run("buffer_recent_window", func(t *testing.T) {
		now := time.Now().UnixMilli()
		q := reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationLatest, metrictypes.SpaceAggregationSum)
		got, err := sb.Build(context.Background(), valuer.UUID{}, uint64(now-2*time.Hour.Milliseconds()), uint64(now), qbtypes.RequestTypeTimeSeries, q, nil)
		require.NoError(t, err)
		require.Contains(t, got.Query, "signoz_metrics.distributed_samples_v4_buffer")
		require.Contains(t, got.Query, "signoz_metrics.time_series_v4_buffer")
		require.Contains(t, got.Query, "is_reduced")
		require.NotContains(t, got.Query, "UNION ALL")
	})

	t.Run("not_reduced", func(t *testing.T) {
		q := reducedQuery("test.metric", metrictypes.GaugeType, metrictypes.Unspecified, metrictypes.TimeAggregationLatest, metrictypes.SpaceAggregationSum)
		q.Aggregations[0].Reduced = false
		got, err := sb.Build(context.Background(), valuer.UUID{}, start, end, qbtypes.RequestTypeTimeSeries, q, nil)
		require.NoError(t, err)
		require.NotContains(t, got.Query, "UNION ALL")
		require.NotContains(t, got.Query, "reduced")
		require.NotContains(t, got.Query, "buffer")
	})
}
