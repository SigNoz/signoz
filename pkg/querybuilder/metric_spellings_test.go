package querybuilder

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestMetricLabelSpellingsReturnsTheFamilyMembers(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:          "deployment.environment",
		Signal:        telemetrytypes.SignalMetrics,
		MetricContext: &telemetrytypes.MetricContext{MetricName: "k8s.pod.cpu.usage"},
	}

	assert.Equal(t, []string{"deployment.environment.name", "deployment.environment"}, MetricLabelSpellings(selector))
}

func TestMetricLabelSpellingsAddsTheResourcePrefixForSpanMetrics(t *testing.T) {
	testCases := []struct {
		name     string
		metric   string
		expected []string
	}{
		{
			name:   "SpanMetric_ReadsPlainAndResourceSpellings",
			metric: "signoz_calls_total",
			expected: []string{
				"deployment.environment.name", "resource_deployment.environment.name",
				"deployment.environment", "resource_deployment.environment",
			},
		},
		{
			name:   "LatencyHistogramSubMetric_ReadsPlainAndResourceSpellings",
			metric: "signoz_latency.bucket",
			expected: []string{
				"deployment.environment.name", "resource_deployment.environment.name",
				"deployment.environment", "resource_deployment.environment",
			},
		},
		{
			name:     "OtherSignozMetric_ReadsPlainSpellings",
			metric:   "signoz_other_metric",
			expected: []string{"deployment.environment.name", "deployment.environment"},
		},
		{
			name:     "UnderscoreLatencySubMetric_ReadsPlainSpellings",
			metric:   "signoz_latency_bucket",
			expected: []string{"deployment.environment.name", "deployment.environment"},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			selector := telemetrytypes.FieldKeySelector{
				Name:          "deployment.environment",
				Signal:        telemetrytypes.SignalMetrics,
				MetricContext: &telemetrytypes.MetricContext{MetricName: testCase.metric},
			}
			assert.Equal(t, testCase.expected, MetricLabelSpellings(selector))
		})
	}
}

// A requested name is never rewritten: a resource_ spelling that is not a
// family member stays literal, on a span metric too.
func TestMetricLabelSpellingsKeepsThePrefixedRequestLiteral(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:          "resource_deployment.environment",
		Signal:        telemetrytypes.SignalMetrics,
		MetricContext: &telemetrytypes.MetricContext{MetricName: "signoz_calls_total"},
	}

	assert.Equal(t, []string{"resource_deployment.environment"}, MetricLabelSpellings(selector))
}

func TestMetricLabelSpellingsStaysLiteralOutsideTheVocabulary(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:   "http.route",
		Signal: telemetrytypes.SignalMetrics,
	}

	assert.Equal(t, []string{"http.route"}, MetricLabelSpellings(selector))
}

func TestFamilyMetricNames(t *testing.T) {
	on := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	assert.Equal(t, []string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"}, FamilyMetricNames(context.Background(), valuer.UUID{}, on, "k8s.pod.cpu.utilization"))
	assert.Equal(t, []string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"}, FamilyMetricNames(context.Background(), valuer.UUID{}, on, "k8s.pod.cpu.usage"))
	assert.Equal(t, []string{"http.server.duration"}, FamilyMetricNames(context.Background(), valuer.UUID{}, on, "http.server.duration"))

	off := flaggertest.WithBooleanFlags(t, map[string]bool{})
	assert.Equal(t, []string{"k8s.pod.cpu.utilization"}, FamilyMetricNames(context.Background(), valuer.UUID{}, off, "k8s.pod.cpu.utilization"))
}
