package semconv

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestMembersReturnsCurrentBeforeHistoricalName(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		Members(KindAttribute, selector),
		"members should use current-first fallback order",
	)
}

func TestCurrentReturnsCanonicalName(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "deployment.environment",
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t,
		"deployment.environment.name",
		Current(KindAttribute, selector),
		"historical name should resolve to the current family name",
	)
}

func TestAllScopedFamilyMatchesSupportedScopes(t *testing.T) {
	tests := []struct {
		name         string
		signal       telemetrytypes.Signal
		fieldContext telemetrytypes.FieldContext
	}{
		{name: "trace resource", signal: telemetrytypes.SignalTraces, fieldContext: telemetrytypes.FieldContextResource},
		{name: "trace attribute", signal: telemetrytypes.SignalTraces, fieldContext: telemetrytypes.FieldContextAttribute},
		{name: "log resource", signal: telemetrytypes.SignalLogs, fieldContext: telemetrytypes.FieldContextResource},
		{name: "log attribute", signal: telemetrytypes.SignalLogs, fieldContext: telemetrytypes.FieldContextAttribute},
		{name: "metric resource", signal: telemetrytypes.SignalMetrics, fieldContext: telemetrytypes.FieldContextResource},
		{name: "metric attribute", signal: telemetrytypes.SignalMetrics, fieldContext: telemetrytypes.FieldContextAttribute},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			selector := telemetrytypes.FieldKeySelector{
				Name:         "deployment.environment",
				Signal:       test.signal,
				FieldContext: test.fieldContext,
			}

			assert.Equal(t,
				"deployment.environment.name",
				Current(KindAttribute, selector),
				"an all-scoped family should match every supported signal and attribute context",
			)
		})
	}
}

func TestMembersReturnsInputWhenKindDoesNotMatch(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:   "deployment.environment",
		Signal: telemetrytypes.SignalTraces,
	}

	assert.Equal(t,
		[]string{"deployment.environment"},
		Members(KindMetric, selector),
		"an attribute family must not match a metric-name lookup",
	)
}
func TestAttributeMembersIncludesMetricResourceStorageSpellings(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "db.system.name",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t, []string{
		"resource_db.system.name", "resource_db_system_name", "db.system.name", "db_system_name",
		"resource_db.system", "resource_db_system", "db.system", "db_system",
	}, AttributeMembers(selector), "resource metric attributes should cover every historical storage layout")
}

func TestCurrentAttributeResolvesNormalizedMetricResourceSpelling(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "resource_db_system",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextResource,
	}

	assert.Equal(t, "db.system.name", CurrentAttribute(selector), "normalized resource spelling should resolve to the dotted current name")
}

func TestAttributeMembersPreservesNormalizedMetricPointStyle(t *testing.T) {
	selector := telemetrytypes.FieldKeySelector{
		Name:         "db_system",
		Signal:       telemetrytypes.SignalMetrics,
		FieldContext: telemetrytypes.FieldContextAttribute,
	}

	assert.Equal(t, []string{
		"db_system_name", "db.system.name", "db_system", "db.system",
	}, AttributeMembers(selector), "normalized point attribute should remain the preferred storage spelling")
}

func TestMetricNamesPreservesDottedStyle(t *testing.T) {
	assert.Equal(t,
		[]string{"k8s.pod.cpu.usage", "k8s.pod.cpu.utilization"},
		MetricNames("k8s.pod.cpu.usage"),
		"dotted metric input should produce dotted family names",
	)
}

func TestMetricNamesPreservesNormalizedStyle(t *testing.T) {
	assert.Equal(t,
		[]string{"k8s_pod_cpu_usage", "k8s_pod_cpu_utilization"},
		MetricNames("k8s_pod_cpu_utilization"),
		"normalized metric input should produce normalized family names",
	)
}

func TestMetricNamesReturnsUnknownNameUnchanged(t *testing.T) {
	assert.Equal(t, []string{"custom_metric"}, MetricNames("custom_metric"), "unknown metrics should not be expanded")
}
