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

func TestStatementBuilder(t *testing.T) {
	type baseQuery struct {
		name     string
		query    qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		orderKey string
		args     []any
		cte      string
	}

	bases := []baseQuery{
		{
			name: "cumulative_rate_sum",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				},
			},
			orderKey: "service.name",
			args:     []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", false, "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
			cte:      "WITH __temporal_aggregation_cte AS (SELECT ts, `service.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `service.name`)",
		},
		{
			name: "cumulative_rate_sum_with_mat_column",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				},
			},
			orderKey: "service.name",
			args:     []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", false, "cartservice", "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
			cte:      "WITH __temporal_aggregation_cte AS (SELECT ts, `service.name`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND (match(JSONExtractString(labels, 'materialized.key.name'), ?) OR JSONExtractString(labels, 'service.name') = ?) GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `service.name`)",
		},
		{
			name: "delta_rate_sum",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				},
			},
			orderKey: "service.name",
			args:     []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "delta", false, "cartservice", "signoz_calls_total", uint64(1747947390000), uint64(1747983420000)},
			cte:      "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, sum(value)/30 AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `service.name`)",
		},
		{
			name: "histogram_percentile1",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				},
			},
			orderKey: "service.name",
			args:     []any{"signoz_latency", uint64(1747936800000), uint64(1747983420000), "delta", false, "cartservice", "signoz_latency", uint64(1747947390000), uint64(1747983420000)},
			cte:      "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, `le`, sum(value)/30 AS value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `service.name`, `le`)",
		},
		{
			name: "gauge_avg_sum",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "host.name"}},
				},
			},
			orderKey: "host.name",
			args:     []any{"system.memory.usage", uint64(1747936800000), uint64(1747983420000), "unspecified", false, "big-data-node-1", "system.memory.usage", uint64(1747947390000), uint64(1747983420000), 0},
			cte:      "WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `host.name`, avg(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'host.name') AS `host.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY fingerprint, `host.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `host.name` ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, `host.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `host.name`)",
		},
		{
			name: "histogram_percentile2",
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
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}},
				},
			},
			orderKey: "service.name",
			args:     []any{"http_server_duration_bucket", uint64(1747936800000), uint64(1747983420000), "cumulative", false, "http_server_duration_bucket", uint64(1747947360000), uint64(1747983420000), 0},
			cte:      "WITH __temporal_aggregation_cte AS (SELECT ts, `service.name`, `le`, multiIf(row_number() OVER rate_window = 1, nan, (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1) OVER rate_window) / (ts - lagInFrame(ts, 1) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, `le`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name`, JSONExtractString(labels, 'le') AS `le` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? GROUP BY fingerprint, `service.name`, `le`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `service.name`, `le` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `service.name`, `le`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `service.name`, `le`)",
		},
	}

	type variant struct {
		name     string
		limit    int
		hasOrder bool
	}

	variants := []variant{
		{"with_limits", 10, false},
		{"without_limits", 0, false},
		{"with_order_by", 0, true},
		{"with_order_by_and_limits", 10, true},
	}

	// expectedFinalSelects maps "base/variant" to the final SELECT portion after the CTE.
	// The full expected query is: base.cte + expectedFinalSelects[name]
	expectedFinalSelects := map[string]string{
		// cumulative_rate_sum
		"cumulative_rate_sum/with_limits":              " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT `service.name` FROM __spatial_aggregation_cte GROUP BY `service.name` ORDER BY avg(value) LIMIT 10) ORDER BY `service.name`, ts ASC",
		"cumulative_rate_sum/without_limits":           " SELECT * FROM __spatial_aggregation_cte ORDER BY avg(value) OVER (PARTITION BY `service.name`) DESC, `service.name`, ts ASC",
		"cumulative_rate_sum/with_order_by":            " SELECT * FROM __spatial_aggregation_cte ORDER BY `service.name` asc, ts ASC",
		"cumulative_rate_sum/with_order_by_and_limits": " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT DISTINCT `service.name` FROM __spatial_aggregation_cte ORDER BY `service.name` asc LIMIT 10) ORDER BY `service.name` asc, ts ASC",

		// cumulative_rate_sum_with_mat_column
		"cumulative_rate_sum_with_mat_column/with_limits":              " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT `service.name` FROM __spatial_aggregation_cte GROUP BY `service.name` ORDER BY avg(value) LIMIT 10) ORDER BY `service.name`, ts ASC",
		"cumulative_rate_sum_with_mat_column/without_limits":           " SELECT * FROM __spatial_aggregation_cte ORDER BY avg(value) OVER (PARTITION BY `service.name`) DESC, `service.name`, ts ASC",
		"cumulative_rate_sum_with_mat_column/with_order_by":            " SELECT * FROM __spatial_aggregation_cte ORDER BY `service.name` asc, ts ASC",
		"cumulative_rate_sum_with_mat_column/with_order_by_and_limits": " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT DISTINCT `service.name` FROM __spatial_aggregation_cte ORDER BY `service.name` asc LIMIT 10) ORDER BY `service.name` asc, ts ASC",

		// delta_rate_sum
		"delta_rate_sum/with_limits":              " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT `service.name` FROM __spatial_aggregation_cte GROUP BY `service.name` ORDER BY avg(value) LIMIT 10) ORDER BY `service.name`, ts ASC",
		"delta_rate_sum/without_limits":           " SELECT * FROM __spatial_aggregation_cte ORDER BY avg(value) OVER (PARTITION BY `service.name`) DESC, `service.name`, ts ASC",
		"delta_rate_sum/with_order_by":            " SELECT * FROM __spatial_aggregation_cte ORDER BY `service.name` asc, ts ASC",
		"delta_rate_sum/with_order_by_and_limits": " SELECT * FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT DISTINCT `service.name` FROM __spatial_aggregation_cte ORDER BY `service.name` asc LIMIT 10) ORDER BY `service.name` asc, ts ASC",

		// histogram_percentile1
		"histogram_percentile1/with_limits":              " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT `service.name` FROM __spatial_aggregation_cte GROUP BY `service.name` ORDER BY avg(value) LIMIT 10) GROUP BY `service.name`, ts ORDER BY `service.name`, ts ASC",
		"histogram_percentile1/without_limits":           " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `service.name`, ts ORDER BY avg(value) OVER (PARTITION BY `service.name`) DESC, `service.name`, ts ASC",
		"histogram_percentile1/with_order_by":            " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `service.name`, ts ORDER BY `service.name` asc, ts ASC",
		"histogram_percentile1/with_order_by_and_limits": " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT DISTINCT `service.name` FROM __spatial_aggregation_cte ORDER BY `service.name` asc LIMIT 10) GROUP BY `service.name`, ts ORDER BY `service.name` asc, ts ASC",

		// gauge_avg_sum
		"gauge_avg_sum/with_limits":              " SELECT * FROM __spatial_aggregation_cte WHERE (`host.name`) IN (SELECT `host.name` FROM __spatial_aggregation_cte GROUP BY `host.name` ORDER BY avg(value) LIMIT 10) ORDER BY `host.name`, ts ASC",
		"gauge_avg_sum/without_limits":           " SELECT * FROM __spatial_aggregation_cte ORDER BY avg(value) OVER (PARTITION BY `host.name`) DESC, `host.name`, ts ASC",
		"gauge_avg_sum/with_order_by":            " SELECT * FROM __spatial_aggregation_cte ORDER BY `host.name` asc, ts ASC",
		"gauge_avg_sum/with_order_by_and_limits": " SELECT * FROM __spatial_aggregation_cte WHERE (`host.name`) IN (SELECT DISTINCT `host.name` FROM __spatial_aggregation_cte ORDER BY `host.name` asc LIMIT 10) ORDER BY `host.name` asc, ts ASC",

		// histogram_percentile2
		"histogram_percentile2/with_limits":              " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT `service.name` FROM __spatial_aggregation_cte GROUP BY `service.name` ORDER BY avg(value) LIMIT 10) GROUP BY `service.name`, ts ORDER BY `service.name`, ts ASC",
		"histogram_percentile2/without_limits":           " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `service.name`, ts ORDER BY avg(value) OVER (PARTITION BY `service.name`) DESC, `service.name`, ts ASC",
		"histogram_percentile2/with_order_by":            " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte GROUP BY `service.name`, ts ORDER BY `service.name` asc, ts ASC",
		"histogram_percentile2/with_order_by_and_limits": " SELECT ts, `service.name`, histogramQuantile(arrayMap(x -> toFloat64(x), groupArray(le)), groupArray(value), 0.950) AS value FROM __spatial_aggregation_cte WHERE (`service.name`) IN (SELECT DISTINCT `service.name` FROM __spatial_aggregation_cte ORDER BY `service.name` asc LIMIT 10) GROUP BY `service.name`, ts ORDER BY `service.name` asc, ts ASC",
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	if err != nil {
		t.Fatalf("failed to load field keys: %v", err)
	}
	mockMetadataStore.KeysMap = keys
	if _, ok := mockMetadataStore.KeysMap["materialized.key.name"]; ok {
		if len(mockMetadataStore.KeysMap["materialized.key.name"]) > 0 {
			mockMetadataStore.KeysMap["materialized.key.name"][0].Materialized = true
		}
	}

	fl, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	if err != nil {
		t.Fatalf("failed to create flagger: %v", err)
	}

	statementBuilder := NewMetricQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		fl,
	)

	for _, b := range bases {
		for _, v := range variants {
			name := b.name + "/" + v.name
			t.Run(name, func(t *testing.T) {
				q := b.query
				q.Limit = v.limit
				if v.hasOrder {
					q.Order = []qbtypes.OrderBy{
						{
							Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: b.orderKey}},
							Direction: qbtypes.OrderDirectionAsc,
						},
					}
				}

				result, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, qbtypes.RequestTypeTimeSeries, q, nil)

				require.NoError(t, err)
				require.Equal(t, b.cte+expectedFinalSelects[name], result.Query)
				require.Equal(t, b.args, result.Args)
			})
		}
	}
}
