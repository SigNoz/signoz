package metricsstatementbuilder

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

func familyKeysMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	metricsKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalMetrics,
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"deployment.environment.name": {metricsKey("deployment.environment.name")},
		"deployment.environment":      {metricsKey("deployment.environment")},
		"deployment_environment":      {metricsKey("deployment_environment")},
	}
}

func familyStatementBuilder(t *testing.T, fl flagger.Flagger) *StatementBuilder {
	t.Helper()
	fm := metricstelemetryschema.NewFieldMapper(fl)
	cb := metricstelemetryschema.NewConditionBuilder(fm, fl)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = familyKeysMap()
	return NewMetricQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		fl,
	)
}

func familyQuery() qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation] {
	return qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Signal:       telemetrytypes.SignalMetrics,
		StepInterval: qbtypes.Step{Duration: 30 * time.Second},
		Aggregations: []qbtypes.MetricAggregation{
			{
				MetricName:       "k8s.pod.cpu.utilization",
				Type:             metrictypes.GaugeType,
				Temporality:      metrictypes.Unspecified,
				TimeAggregation:  metrictypes.TimeAggregationAvg,
				SpaceAggregation: metrictypes.SpaceAggregationAvg,
			},
		},
		Filter: &qbtypes.Filter{
			Expression: "deployment.environment = 'production'",
		},
		GroupBy: []qbtypes.GroupByKey{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: "deployment.environment.name",
				},
			},
		},
	}
}

// The flag merges the label spellings of the family and unions the storage
// names of the metric-name family, in the filter, the group-by column, and
// every metric_name filter.
func TestStatementBuilderResolvesFamilies(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	statementBuilder := familyStatementBuilder(t, fl)

	q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, qbtypes.RequestTypeTimeSeries, familyQuery(), nil)
	require.NoError(t, err)
	require.Equal(t, "WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_deployment.environment.name`, avg(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, COALESCE(NULLIF(JSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(JSONExtractString(labels, 'deployment.environment'), ''), NULLIF(JSONExtractString(labels, 'deployment_environment'), ''), '') AS `__GROUP_BY_KEY_0_deployment.environment.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?, ?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND COALESCE(NULLIF(JSONExtractString(labels, 'deployment.environment.name'), ''), NULLIF(JSONExtractString(labels, 'deployment.environment'), ''), NULLIF(JSONExtractString(labels, 'deployment_environment'), ''), '') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_deployment.environment.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?, ?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_deployment.environment.name`, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_deployment.environment.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_deployment.environment.name`, ts", q.Query)
	require.Equal(t, []any{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization", uint64(1747936800000), uint64(1747983420000), "unspecified", "production", "k8s.pod.cpu.usage", "k8s.pod.cpu.utilization", uint64(1747947390000), uint64(1747983420000), 0}, q.Args)
}

// With the flag at its default, both the labels and the metric name stay
// literal.
func TestStatementBuilderKeepsFamiliesLiteralByDefault(t *testing.T) {
	fl := flaggertest.WithBooleanFlags(t, map[string]bool{})
	statementBuilder := familyStatementBuilder(t, fl)

	q, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, qbtypes.RequestTypeTimeSeries, familyQuery(), nil)
	require.NoError(t, err)
	require.Equal(t, "WITH __temporal_aggregation_cte AS (SELECT fingerprint, toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(30)) AS ts, `__GROUP_BY_KEY_0_deployment.environment.name`, avg(value) AS per_series_value FROM signoz_metrics.distributed_samples_v4 AS points INNER JOIN (SELECT fingerprint, JSONExtractString(labels, 'deployment.environment.name') AS `__GROUP_BY_KEY_0_deployment.environment.name` FROM signoz_metrics.time_series_v4_6hrs WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli <= ? AND LOWER(temporality) LIKE LOWER(?) AND JSONExtractString(labels, 'deployment.environment') = ? GROUP BY fingerprint, `__GROUP_BY_KEY_0_deployment.environment.name`) AS filtered_time_series ON points.fingerprint = filtered_time_series.fingerprint WHERE metric_name IN (?) AND unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint, ts, `__GROUP_BY_KEY_0_deployment.environment.name` ORDER BY fingerprint, ts), __spatial_aggregation_cte AS (SELECT ts, `__GROUP_BY_KEY_0_deployment.environment.name`, avg(per_series_value) AS value FROM __temporal_aggregation_cte WHERE isNaN(per_series_value) = ? GROUP BY ts, `__GROUP_BY_KEY_0_deployment.environment.name`) SELECT * FROM __spatial_aggregation_cte ORDER BY `__GROUP_BY_KEY_0_deployment.environment.name`, ts", q.Query)
	require.Equal(t, []any{"k8s.pod.cpu.utilization", uint64(1747936800000), uint64(1747983420000), "unspecified", "production", "k8s.pod.cpu.utilization", uint64(1747947390000), uint64(1747983420000), 0}, q.Args)
}
