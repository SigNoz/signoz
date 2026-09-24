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
