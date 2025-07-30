package telemetrymeter

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
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
		// {
		// 	name:        "test_cumulative_rate_sum",
		// 	requestType: qbtypes.RequestTypeTimeSeries,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		// 		Signal:       telemetrytypes.SignalMetrics,
		// 		StepInterval: qbtypes.Step{Duration: 30 * time.Second},
		// 		Aggregations: []qbtypes.MetricAggregation{
		// 			{
		// 				MetricName:       "signoz_calls_total",
		// 				Type:             metrictypes.SumType,
		// 				Temporality:      metrictypes.Cumulative,
		// 				TimeAggregation:  metrictypes.TimeAggregationRate,
		// 				SpaceAggregation: metrictypes.SpaceAggregationSum,
		// 			},
		// 		},
		// 		Filter: &qbtypes.Filter{
		// 			Expression: "service.name = 'cartservice'",
		// 		},
		// 		Limit: 10,
		// 		GroupBy: []qbtypes.GroupByKey{
		// 			{
		// 				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		// 					Name: "service.name",
		// 				},
		// 			},
		// 		},
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __temporal_aggregation_cte AS (SELECT ts, `service.name`, If((per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) < 0, per_series_value / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(1747947360000))) OVER rate_window), (per_series_value - lagInFrame(per_series_value, 1, 0) OVER rate_window) / (ts - lagInFrame(ts, 1, toDateTime(fromUnixTimestamp64Milli(1747947360000))) OVER rate_window)) AS per_series_value FROM (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, max(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `service.name` ORDER BY fingerprint, ts) WINDOW rate_window AS (PARTITION BY fingerprint ORDER BY fingerprint, ts)), __spatial_aggregation_cte AS (SELECT ts, `service.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `service.name`) SELECT * FROM __spatial_aggregation_cte",
		// 		Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", false, "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
		// 	},
		// 	expectedErr: nil,
		// },
		// {
		// 	name:        "test_delta_rate_sum",
		// 	requestType: qbtypes.RequestTypeTimeSeries,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		// 		Signal:       telemetrytypes.SignalMetrics,
		// 		StepInterval: qbtypes.Step{Duration: 30 * time.Second},
		// 		Aggregations: []qbtypes.MetricAggregation{
		// 			{
		// 				MetricName:       "signoz_calls_total",
		// 				Type:             metrictypes.SumType,
		// 				Temporality:      metrictypes.Delta,
		// 				TimeAggregation:  metrictypes.TimeAggregationRate,
		// 				SpaceAggregation: metrictypes.SpaceAggregationSum,
		// 			},
		// 		},
		// 		Filter: &qbtypes.Filter{
		// 			Expression: "service.name = 'cartservice'",
		// 		},
		// 		Limit: 10,
		// 		GroupBy: []qbtypes.GroupByKey{
		// 			{
		// 				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		// 					Name: "service.name",
		// 				},
		// 			},
		// 		},
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, sum(value)/30 AS value FROM signoz_meter.distributed_samples AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `service.name`) SELECT * FROM __spatial_aggregation_cte",
		// 		Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "delta", false, "cartservice", "signoz_calls_total", uint64(1747947390000), uint64(1747983420000)},
		// 	},
		// 	expectedErr: nil,
		// },
		{
			name:        "test_delta_rate_avg",
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
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
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
				Query: "WITH __spatial_aggregation_cte AS (SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `service.name`, sum(value)/30 AS value FROM signoz_meter.distributed_samples AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'service.name') AS `service.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'service.name') = ? GROUP BY fingerprint, `service.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY ts, `service.name`) SELECT * FROM __spatial_aggregation_cte",
				Args:  []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "delta", false, "cartservice", "signoz_calls_total", uint64(1747947390000), uint64(1747983420000)},
			},
			expectedErr: nil,
		},
		// {
		// 	name:        "test_gauge_avg_sum",
		// 	requestType: qbtypes.RequestTypeTimeSeries,
		// 	query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		// 		Signal:       telemetrytypes.SignalMetrics,
		// 		StepInterval: qbtypes.Step{Duration: 30 * time.Second},
		// 		Aggregations: []qbtypes.MetricAggregation{
		// 			{
		// 				MetricName:       "system.memory.usage",
		// 				Type:             metrictypes.GaugeType,
		// 				Temporality:      metrictypes.Unspecified,
		// 				TimeAggregation:  metrictypes.TimeAggregationAvg,
		// 				SpaceAggregation: metrictypes.SpaceAggregationSum,
		// 			},
		// 		},
		// 		Filter: &qbtypes.Filter{
		// 			Expression: "host.name = 'big-data-node-1'",
		// 		},
		// 		Limit: 10,
		// 		GroupBy: []qbtypes.GroupByKey{
		// 			{
		// 				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
		// 					Name: "host.name",
		// 				},
		// 			},
		// 		},
		// 	},
		// 	expected: qbtypes.Statement{
		// 		Query: "WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `host.name`, avg(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'host.name') AS `host.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND __normalized = ? AND JSONExtractString(labels, 'host.name') = ? GROUP BY fingerprint, `host.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `host.name` ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, `host.name`, sum(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `host.name`) SELECT * FROM __spatial_aggregation_cte",
		// 		Args:  []any{"system.memory.usage", uint64(1747936800000), uint64(1747983420000), "unspecified", false, "big-data-node-1", "system.memory.usage", uint64(1747947390000), uint64(1747983420000), 0},
		// 	},
		// 	expectedErr: nil,
		// },
	}

	fm := telemetrymetrics.NewFieldMapper()
	cb := telemetrymetrics.NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	if err != nil {
		t.Fatalf("failed to load field keys: %v", err)
	}
	mockMetadataStore.KeysMap = keys

	statementBuilder := NewMeterQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

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
