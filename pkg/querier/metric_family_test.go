package querier

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The metric metadata of a query on one name of a metric-name family comes
// from every name of the family: the temporality is Multiple when the names
// differ, and the reduced flag is set when any name has reduced data.
func TestResolveMetricMetadataReadsTheFamily(t *testing.T) {
	testCases := []struct {
		name                string
		temporalities       map[string]metrictypes.Temporality
		reduced             map[string]bool
		expectedTemporality metrictypes.Temporality
		expectedReduced     bool
	}{
		{
			name: "SameTemporality_KeepsIt",
			temporalities: map[string]metrictypes.Temporality{
				"k8s.pod.cpu.usage":       metrictypes.Cumulative,
				"k8s.pod.cpu.utilization": metrictypes.Cumulative,
			},
			expectedTemporality: metrictypes.Cumulative,
		},
		{
			name: "DifferentTemporalities_ReadAsMultiple",
			temporalities: map[string]metrictypes.Temporality{
				"k8s.pod.cpu.usage":       metrictypes.Delta,
				"k8s.pod.cpu.utilization": metrictypes.Cumulative,
			},
			expectedTemporality: metrictypes.Multiple,
		},
		{
			name: "OnlyOldNameKnown_TakesItsTemporality",
			temporalities: map[string]metrictypes.Temporality{
				"k8s.pod.cpu.utilization": metrictypes.Delta,
			},
			expectedTemporality: metrictypes.Delta,
		},
		{
			name: "OldNameReduced_MarksTheAggregationReduced",
			temporalities: map[string]metrictypes.Temporality{
				"k8s.pod.cpu.usage": metrictypes.Cumulative,
			},
			reduced:             map[string]bool{"k8s.pod.cpu.utilization": true},
			expectedTemporality: metrictypes.Cumulative,
			expectedReduced:     true,
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			metadataStore := telemetrytypestest.NewMockMetadataStore()
			metadataStore.TemporalityMap = testCase.temporalities
			metadataStore.TypeMap = map[string]metrictypes.Type{
				"k8s.pod.cpu.usage":       metrictypes.GaugeType,
				"k8s.pod.cpu.utilization": metrictypes.GaugeType,
			}
			metadataStore.ReducedMap = testCase.reduced
			q := &querier{
				logger:        instrumentationtest.New().Logger(),
				metadataStore: metadataStore,
				fl: flaggertest.WithBooleanFlags(t, map[string]bool{
					flagger.FeatureResolveSemconvFamilies.String(): true,
				}),
			}
			queries := []qbtypes.QueryEnvelope{{
				Type: qbtypes.QueryTypeBuilder,
				Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
					Name:   "A",
					Signal: telemetrytypes.SignalMetrics,
					Aggregations: []qbtypes.MetricAggregation{{
						MetricName:       "k8s.pod.cpu.usage",
						TimeAggregation:  metrictypes.TimeAggregationAvg,
						SpaceAggregation: metrictypes.SpaceAggregationAvg,
					}},
				},
			}}

			missing, warnings, err := q.resolveMetricMetadata(context.Background(), valuer.UUID{}, queries, 0, 0, qbtypes.RequestTypeTimeSeries)
			require.NoError(t, err)
			assert.Empty(t, missing)
			assert.Empty(t, warnings)

			spec := queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation])
			assert.Equal(t, testCase.expectedTemporality, spec.Aggregations[0].Temporality)
			assert.Equal(t, testCase.expectedReduced, spec.Aggregations[0].Reduced)
		})
	}
}
