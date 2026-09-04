package metricsstatementbuilder

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatementBuilder(t *testing.T) {
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "test_cumulative_rate_sum",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_calls_total",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
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
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
			},
			expectedErr: nil,
		},
		{
			name:        "test_cumulative_rate_sum_with_mat_column",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_calls_total",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "materialized.key.name REGEXP 'cartservice' OR service.name = 'cartservice'",
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
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND (match(JSONExtractString(labels, 'materialized.key.name'), ?) OR JSONExtractString(labels, 'service.name') = ?) GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", "cartservice", "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
			},
			expectedErr: nil,
		},
		{
			name:        "test_delta_rate_sum",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_calls_total",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Delta,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
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
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, sum(value)/30 AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "delta", "cartservice", "signoz_calls_total", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			name:        "test_exp_histogram_percentile_delta",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_latency",
						Type:             metrictypes.ExpHistogramType,
						Temporality:      metrictypes.Delta,
						SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
					},
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, quantilesDDMerge(0.01, 0.950000)(sketch)[1] AS value FROM signoz_metrics.distributed_exp_hist AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			// the sketch merge spans the whole step, so `rate` must not add a /step divisor
			name:        "test_exp_histogram_percentile_delta_rate_time_aggregation",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_latency",
						Type:             metrictypes.ExpHistogramType,
						Temporality:      metrictypes.Delta,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
					},
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, quantilesDDMerge(0.01, 0.950000)(sketch)[1] AS value FROM signoz_metrics.distributed_exp_hist AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			name:        "test_histogram_percentile1",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_latency",
						Type:             metrictypes.HistogramType,
						Temporality:      metrictypes.Delta,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
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
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, `le`, sum(value)/30 AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`, `le`) SELECT ts, `__GROUP_BY_KEY_0_service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `__GROUP_BY_KEY_0_service.name`, ts ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", "cartservice", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			name:        "test_histogram_percentile_explicit_le",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_latency",
						Type:             metrictypes.HistogramType,
						Temporality:      metrictypes.Delta,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'cartservice'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "le",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, `le`, sum(value)/30 AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`, `le`) SELECT ts, `__GROUP_BY_KEY_0_service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `__GROUP_BY_KEY_0_service.name`, ts ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", "cartservice", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			name:        "test_histogram_count_no_param",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_latency",
						Type:             metrictypes.HistogramType,
						Temporality:      metrictypes.Delta,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationCount,
					},
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, `le`, sum(value) AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`, `le`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts, toFloat64(le)",
				Args:  []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		{
			name:        "test_gauge_avg_sum",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "system.memory.usage",
						Type:             metrictypes.GaugeType,
						Temporality:      metrictypes.Unspecified,
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "host.name = 'big-data-node-1'",
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "host.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_host.name`, avg(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'host.name') AS `__GROUP_BY_KEY_0_host.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'host.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_host.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_host.name` ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_host.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_host.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_host.name`, ts",
				Args:  []any{"system.memory.usage", uint64(1747936800000), uint64(1747983420000), "unspecified", "big-data-node-1", "system.memory.usage", uint64(1747947390000), uint64(1747983420000), 0},
			},
			expectedErr: nil,
		},
		{
			name:        "test_histogram_percentile2",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "http_server_duration_bucket",
						Type:             metrictypes.HistogramType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationPercentile95,
					},
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
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, `le`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, `le`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_service.name`, `le` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, `le`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`, `le`) SELECT ts, `__GROUP_BY_KEY_0_service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `__GROUP_BY_KEY_0_service.name`, ts ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"http_server_duration_bucket", uint64(1747936800000), uint64(1747983420000), "cumulative", "http_server_duration_bucket", uint64(1747947360000), uint64(1747983420000), 0},
			},
			expectedErr: nil,
		},
		{
			name:        "test_missing_key_falls_back_to_labels",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_calls_total",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "k8s.statefulset.name = 'my-statefulset'",
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "k8s.statefulset.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query:    "WITH __temporal_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_k8s.statefulset.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_k8s.statefulset.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'k8s.statefulset.name') AS `__GROUP_BY_KEY_0_k8s.statefulset.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'k8s.statefulset.name') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_k8s.statefulset.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_k8s.statefulset.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_k8s.statefulset.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_k8s.statefulset.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_k8s.statefulset.name`, ts",
				Args:     []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", "my-statefulset", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
				Warnings: []string{"key `k8s.statefulset.name` not found in metadata; querying the underlying data directly. If this is unexpected, check the key name for typos."},
			},
			expectedErr: nil,
		},
		{
			name:        "test_bool_label_filter",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{
					{
						MetricName:       "signoz_calls_total",
						Type:             metrictypes.SumType,
						Temporality:      metrictypes.Cumulative,
						TimeAggregation:  metrictypes.TimeAggregationRate,
						SpaceAggregation: metrictypes.SpaceAggregationSum,
					},
				},
				Filter: &qbtypes.Filter{
					Expression: "success = true",
				},
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "service.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __temporal_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `__GROUP_BY_KEY_0_service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND accurateCastOrNull(JSONExtractString(labels, 'success'), 'Bool') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_service.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_service.name`, ts",
				Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", true, "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
			},
			expectedErr: nil,
		},
	}

	storage := metricstelemetryschema.NewStorage()
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	if err != nil {
		t.Fatalf("failed to load field keys: %v", err)
	}
	mockMetadataStore.KeysMap = keys
	// NOTE: LoadFieldKeysFromJSON doesn't set Materialized field
	// for keys, so we have to set it manually here for testing
	if _, ok := mockMetadataStore.KeysMap["materialized.key.name"]; ok {
		if len(mockMetadataStore.KeysMap["materialized.key.name"]) > 0 {
			mockMetadataStore.KeysMap["materialized.key.name"][0].Materialized = true
		}
	}

	flagger, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	if err != nil {
		t.Fatalf("failed to create flagger: %v", err)
	}

	statementBuilder := NewMetricQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		storage,
		flagger,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, c.requestType, c.query, nil)

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

func TestGroupByAliasAvoidsColumnCollision(t *testing.T) {
	storage := metricstelemetryschema.NewStorage()
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	require.NoError(t, err)
	mockMetadataStore.KeysMap = keys

	fl, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	require.NoError(t, err)

	statementBuilder := NewMetricQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		storage,
		fl,
	)

	for _, groupBy := range []string{"ts", "value", "fingerprint", "service.name"} {
		t.Run(groupBy, func(t *testing.T) {
			stmt, err := statementBuilder.Build(
				context.Background(),
				valuer.UUID{},
				1747947419000,
				1747983448000,
				qbtypes.RequestTypeTimeSeries,
				qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Signal:       telemetrytypes.SignalMetrics,
					StepInterval: qbtypes.Step{Duration: 30 * time.Second},
					Aggregations: []qbtypes.MetricAggregation{
						{
							MetricName:       "signoz_calls_total",
							Type:             metrictypes.SumType,
							Temporality:      metrictypes.Cumulative,
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						},
					},
					GroupBy: []qbtypes.GroupByKey{
						{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: groupBy}},
					},
				},
				nil,
			)
			require.NoError(t, err)

			assert.Contains(t, stmt.Query, fmt.Sprintf("`__GROUP_BY_KEY_0_%s`", groupBy))
			assert.NotContains(t, stmt.Query, fmt.Sprintf("`%s`", groupBy),
				"the group-by column must not be selected under the label's own name")
			assert.Equal(t, 1, strings.Count(stmt.Query, " AS ts,"),
				"the step bucket is the only column named ts")
		})
	}
}
