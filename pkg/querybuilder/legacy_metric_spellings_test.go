package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestMetricLabelSpellingsExpandsLegacyLayouts(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t, []string{
		"resource_deployment.environment.name", "resource_deployment_environment_name",
		"deployment.environment.name", "deployment_environment_name",
		"resource_deployment.environment", "resource_deployment_environment",
		"deployment.environment", "deployment_environment",
	}, MetricLabelSpellings(selector), "members expand into dotted, normalized, and resource_-prefixed layouts")
}

func TestMetricLabelSpellingsPreservesRequestedLayout(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "resource_deployment_environment",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{
		"resource_deployment_environment_name", "resource_deployment.environment.name",
		"deployment_environment_name", "deployment.environment.name",
		"resource_deployment_environment", "resource_deployment.environment",
		"deployment_environment", "deployment.environment",
	}, MetricLabelSpellings(selector), "a normalized request lists normalized layouts first and keeps resource_ variants")
}

func TestMetricLabelSpellingsStaysLiteralOutsideTheVocabulary(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:   "http.route",
		Signal: telemetrytypes.SignalMetrics,
	}

	assert.Equal(t, []string{"http.route"}, MetricLabelSpellings(selector))
}

func TestMetricNameSpellingsPreservesLayout(t *testing.T) {
	assert.Equal(t, []string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"}, MetricNameSpellings("k8s.pod.cpu.utilization"))
	assert.Equal(t, []string{"k8s_pod_cpu_usage", "k8s_pod_cpu_utilization"}, MetricNameSpellings("k8s_pod_cpu_utilization"))
	assert.Equal(t, []string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"}, MetricNameSpellings("k8s.pod.cpu.usage"))
	assert.Equal(t, []string{"http.server.duration"}, MetricNameSpellings("http.server.duration"))
}
