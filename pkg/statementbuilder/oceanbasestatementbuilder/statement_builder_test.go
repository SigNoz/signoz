package oceanbasestatementbuilder

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func TestOriginalFilterParserAndOrganizationScope(t *testing.T) {
	cfg := telemetrystore.NewConfigFactory().New().(telemetrystore.Config).OceanBase
	b := New[qbtypes.TraceAggregation](cfg)
	org := valuer.GenerateUUID()
	q := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name: "A", Signal: telemetrytypes.SignalTraces,
		Filter:       &qbtypes.Filter{Expression: `space_id = 'space-A' AND (user_id = 'x OR 1=1' OR user_id IN ['u1', 'u2'])`},
		SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "trace_id"}, {Name: "attributes"}},
		Limit:        25, Offset: 5,
	}
	stmt, err := b.Build(context.Background(), org, 1000, 2000, qbtypes.RequestTypeRaw, q, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "FROM `signoz_traces`")
	require.Contains(t, stmt.Query, "org_id = ?")
	require.Contains(t, stmt.Query, " OR ")
	require.NotContains(t, stmt.Query, "x OR 1=1")
	require.Contains(t, stmt.Args, "x OR 1=1")
	require.Contains(t, stmt.Args, org.StringValue())
	require.Contains(t, stmt.Args, uint64(1000000000))
	require.Contains(t, stmt.Query, "JSON_EXTRACT(`attributes`, '$')")
	q.Filter.Expression = `space_id = 'space-A' OR (`
	_, err = b.Build(context.Background(), org, 1000, 2000, qbtypes.RequestTypeRaw, q, nil)
	require.Error(t, err)
}

func TestAggregatesAndUnsupportedInputs(t *testing.T) {
	cfg := telemetrystore.NewConfigFactory().New().(telemetrystore.Config).OceanBase
	b := New[qbtypes.LogAggregation](cfg)
	q := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{Name: "A", Signal: telemetrytypes.SignalLogs, StepInterval: qbtypes.Step{Duration: time.Minute}, Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}, {Expression: "sum(tokens)"}}, GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "user_id"}}}}
	stmt, err := b.Build(context.Background(), valuer.GenerateUUID(), 1000, 120000, qbtypes.RequestTypeTimeSeries, q, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "COUNT(*) AS __result_0")
	require.Contains(t, stmt.Query, "AS __result_1")
	require.Contains(t, stmt.Query, "TIMESTAMPADD")
	require.Contains(t, stmt.Query, "GROUP BY ts, `__GROUP_BY_KEY_0_user_id`")
	q.Aggregations[0].Expression = "quantile(0.95)(tokens)"
	_, err = b.Build(context.Background(), valuer.GenerateUUID(), 1000, 120000, qbtypes.RequestTypeScalar, q, nil)
	require.ErrorContains(t, err, "not supported")
	_, err = b.Build(context.Background(), valuer.UUID{}, 1000, 120000, qbtypes.RequestTypeRaw, q, nil)
	require.ErrorContains(t, err, "organization")
}

func TestFiltersThroughStorageResolver(t *testing.T) {
	cfg := telemetrystore.NewConfigFactory().New().(telemetrystore.Config).OceanBase
	b := New[qbtypes.LogAggregation](cfg)
	for _, tc := range []struct {
		name       string
		expression string
		contains   []string
		argument   any
	}{
		{"intrinsic", `user_id = 'alice'`, []string{"CAST(`user_id` AS CHAR) COLLATE utf8mb4_bin = ?"}, "alice"},
		{"resource context", `resource.user_id = 'alice'`, []string{"JSON_EXTRACT(`resource_attributes`, '$.\"user_id\"')"}, "alice"},
		{"numeric attribute", `attribute.tokens > 5`, []string{"JSON_EXTRACT(`attributes`, '$.\"tokens\"')", "AS DECIMAL(38,9)"}, float64(5)},
		{"missing attribute", `attribute.tokens NOT EXISTS`, []string{"JSON_EXTRACT(`attributes`, '$.\"tokens\"')", "IS NULL"}, nil},
		{"negative includes missing", `attribute.status != 'ok'`, []string{"IS NULL OR", "<> ?"}, "ok"},
		{"boolean attribute", `attribute.ok = true`, []string{"JSON_EXTRACT(`attributes`, '$.\"ok\"')"}, "true"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			q := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Name: "A", Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: tc.expression},
			}
			org := valuer.GenerateUUID()
			stmt, err := b.Build(context.Background(), org, 1000, 2000, qbtypes.RequestTypeRaw, q, nil)
			require.NoError(t, err)
			require.Contains(t, stmt.Args, org.StringValue())
			for _, fragment := range tc.contains {
				require.Contains(t, stmt.Query, fragment)
			}
			if tc.argument != nil {
				require.Contains(t, stmt.Args, tc.argument)
			}
		})
	}
}

func TestMetricsTwoStageAggregation(t *testing.T) {
	cfg := telemetrystore.NewConfigFactory().New().(telemetrystore.Config).OceanBase
	b := New[qbtypes.MetricAggregation](cfg)
	q := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "M", Signal: telemetrytypes.SignalMetrics, StepInterval: qbtypes.Step{Duration: time.Minute}, Aggregations: []qbtypes.MetricAggregation{{MetricName: "tool.calls", Type: metrictypes.GaugeType, TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg}}}
	stmt, err := b.Build(context.Background(), valuer.GenerateUUID(), 1000, 120000, qbtypes.RequestTypeTimeSeries, q, nil)
	require.NoError(t, err)
	require.Contains(t, stmt.Query, "AVG(value) AS series_value")
	require.Contains(t, stmt.Query, "AVG(series_value) AS __result_0")
	require.Contains(t, stmt.Query, "GROUP BY bucket_ms, series_key")
	require.Contains(t, stmt.Args, "tool.calls")
	require.Equal(t, cfg.MaxResultRows+1, stmt.Args[len(stmt.Args)-1], "include the overflow sentinel")
	q.Aggregations[0].TimeAggregation = metrictypes.TimeAggregationRate
	q.Aggregations[0].Temporality = metrictypes.Cumulative
	_, err = b.Build(context.Background(), valuer.GenerateUUID(), 1000, 120000, qbtypes.RequestTypeTimeSeries, q, nil)
	require.ErrorContains(t, err, "cumulative")
}
