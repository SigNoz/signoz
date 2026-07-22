package telemetrymetrics

// Harness emitter: writes the exact SQL the statement builder produces (args
// inlined) into the counter-reset verification harness
// (tests/integration/testdata/counter_reset_epochs/). Skips unless
// EPOCH_HARNESS_DIR is set; run it after builder changes to refresh the
// harness queries. The pinned goldens live in epoch_stmt_builder_test.go.

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
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
)

const harnessDay = uint64(1784332800000) // 2026-07-18T00:00:00Z

func inlineArgs(q string, args []any) string {
	for _, a := range args {
		var s string
		switch v := a.(type) {
		case string:
			s = "'" + strings.ReplaceAll(v, "'", "\\'") + "'"
		default:
			s = fmt.Sprintf("%v", v)
		}
		q = strings.Replace(q, "?", s, 1)
	}
	return q
}

func TestEmitHarnessQueries(t *testing.T) {
	outDir := os.Getenv("EPOCH_HARNESS_DIR")
	if outDir == "" {
		t.Skip("EPOCH_HARNESS_DIR not set")
	}
	if err := os.MkdirAll(filepath.Join(outDir, "queries"), 0o755); err != nil {
		t.Fatal(err)
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	keys, err := telemetrytypestest.LoadFieldKeysFromJSON("testdata/keys_map.json")
	if err != nil {
		t.Fatalf("failed to load field keys: %v", err)
	}
	mockMetadataStore.KeysMap = keys

	baseQuery := func(step time.Duration, timeAgg metrictypes.TimeAggregation, hints *metrictypes.MetricTableHints) qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation] {
		return qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Signal:       telemetrytypes.SignalMetrics,
			StepInterval: qbtypes.Step{Duration: step},
			Aggregations: []qbtypes.MetricAggregation{{
				MetricName:       "it_counter_total",
				Type:             metrictypes.SumType,
				Temporality:      metrictypes.Cumulative,
				TimeAggregation:  timeAgg,
				SpaceAggregation: metrictypes.SpaceAggregationSum,
				TableHints:       hints,
			}},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "scenario"}}},
		}
	}

	agg5m := &metrictypes.MetricTableHints{SamplesTableName: SamplesV4Agg5mTableName}
	agg30m := &metrictypes.MetricTableHints{SamplesTableName: SamplesV4Agg30mTableName}

	cases := []struct {
		name    string
		epochs  bool
		step    time.Duration
		timeAgg metrictypes.TimeAggregation
		hints   *metrictypes.MetricTableHints
	}{
		{"e_inc_60_raw", true, 60 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"e_inc_300_raw", true, 300 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"e_inc_300_agg5m", true, 300 * time.Second, metrictypes.TimeAggregationIncrease, agg5m},
		{"e_inc_1800_agg30m", true, 1800 * time.Second, metrictypes.TimeAggregationIncrease, agg30m},
		{"e_inc_86400_raw", true, 86400 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"e_inc_86400_agg30m", true, 86400 * time.Second, metrictypes.TimeAggregationIncrease, agg30m},
		{"e_rate_300_raw", true, 300 * time.Second, metrictypes.TimeAggregationRate, nil},
		{"l_inc_60_raw", false, 60 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"l_inc_300_raw", false, 300 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"l_inc_86400_raw", false, 86400 * time.Second, metrictypes.TimeAggregationIncrease, nil},
		{"l_rate_300_raw", false, 300 * time.Second, metrictypes.TimeAggregationRate, nil},
	}

	for _, tc := range cases {
		fl := flaggertest.WithBooleans(t, map[string]bool{
			flagger.FeatureUseCounterEpochs.String(): tc.epochs,
		})
		b := NewMetricQueryStatementBuilder(
			instrumentationtest.New().ToProviderSettings(),
			mockMetadataStore, fm, cb, fl,
		)
		stmt, err := b.Build(
			context.Background(), valuer.UUID{},
			harnessDay, harnessDay+86400000,
			qbtypes.RequestTypeTimeSeries, baseQuery(tc.step, tc.timeAgg, tc.hints), nil,
		)
		if err != nil {
			t.Fatalf("%s: %v", tc.name, err)
		}
		sql := inlineArgs(stmt.Query, stmt.Args)
		out := fmt.Sprintf("-- %s (epochs=%v step=%s agg=%s)\nSELECT toUnixTimestamp(ts) AS ts_s, `scenario`, value FROM (\n%s\n) ORDER BY scenario, ts_s FORMAT CSV;\n", tc.name, tc.epochs, tc.step, tc.timeAgg.StringValue(), sql)
		if err := os.WriteFile(filepath.Join(outDir, "queries", tc.name+".sql"), []byte(out), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
