package telemetrymetrics

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// TestStatementBuilderCounterEpochs pins the SQL of the epoch-aware cumulative
// pipeline (use_counter_epochs). The golden files in testdata/ are the exact
// statements validated row-for-row against the reference implementations and a
// real ClickHouse in the counter-reset harness (see the design doc
// docs/counter-reset-epochs.md); regenerate them deliberately, not to make a
// failing test pass.
func TestStatementBuilderCounterEpochs(t *testing.T) {
	cases := []struct {
		name       string
		goldenFile string
		start, end uint64
		query      qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		args       []any
	}{
		{
			name:       "cumulative_rate_raw",
			goldenFile: "epoch_cumulative_rate_raw.sql",
			start:      1747947419000,
			end:        1747983448000,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{{
					MetricName:       "signoz_calls_total",
					Type:             metrictypes.SumType,
					Temporality:      metrictypes.Cumulative,
					TimeAggregation:  metrictypes.TimeAggregationRate,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				}},
				Filter:  &qbtypes.Filter{Expression: "service.name = 'cartservice'"},
				GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}},
			},
			args: []any{"signoz_calls_total", uint64(1747936800000), uint64(1747983420000), "cumulative", "cartservice", "signoz_calls_total", uint64(1747947360000), uint64(1747983420000), 0},
		},
		{
			name:       "cumulative_increase_agg5m",
			goldenFile: "epoch_cumulative_increase_agg5m.sql",
			start:      1747800000000,
			end:        1747983448000,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 300 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{{
					MetricName:       "signoz_calls_total",
					Type:             metrictypes.SumType,
					Temporality:      metrictypes.Cumulative,
					TimeAggregation:  metrictypes.TimeAggregationIncrease,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				}},
			},
			args: []any{"signoz_calls_total", uint64(1747785600000), uint64(1747983420000), "cumulative", "signoz_calls_total", uint64(1747799700000), uint64(1747983420000), 0},
		},
		{
			name:       "multi_temporality_rate_raw",
			goldenFile: "epoch_multi_temporality_rate_raw.sql",
			start:      1747947419000,
			end:        1747983448000,
			query: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				StepInterval: qbtypes.Step{Duration: 60 * time.Second},
				Aggregations: []qbtypes.MetricAggregation{{
					MetricName:       "signoz_calls_total",
					Type:             metrictypes.SumType,
					Temporality:      metrictypes.Multiple,
					TimeAggregation:  metrictypes.TimeAggregationRate,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				}},
			},
			// delta side reads only the display range (no base needed); the
			// cumulative side keeps the one-step lookback for bases
			args: []any{
				"signoz_calls_total", uint64(1747936800000), uint64(1747983420000),
				"signoz_calls_total", uint64(1747947360000), uint64(1747983420000),
				"signoz_calls_total", uint64(1747936800000), uint64(1747983420000),
				"signoz_calls_total", uint64(1747947300000), uint64(1747983420000),
				0,
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	require.NoError(t, err)
	mockMetadataStore.KeysMap = keys

	fl := flaggertest.WithBooleans(t, map[string]bool{
		flagger.FeatureUseCounterEpochs.String(): true,
	})
	statementBuilder := NewMetricQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		fl,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, c.start, c.end, qbtypes.RequestTypeTimeSeries, c.query, nil)
			require.NoError(t, err)

			goldenPath := filepath.Join("testdata", c.goldenFile)
			if os.Getenv("UPDATE_GOLDEN") != "" {
				require.NoError(t, os.WriteFile(goldenPath, []byte(q.Query+"\n"), 0o644))
			}
			golden, err := os.ReadFile(goldenPath)
			require.NoError(t, err)
			require.Equal(t, string(golden), q.Query+"\n")
			require.Equal(t, c.args, q.Args)
		})
	}
}
