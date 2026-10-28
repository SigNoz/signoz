package resolvercore

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// The flagger provider registration is process-global and keyed by provider
// name, so each flagger must be used before the next one is created.
func TestFamilyValueNames(t *testing.T) {
	selector := &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "deployment.environment"},
	}

	off := flaggertest.WithBooleanFlags(t, map[string]bool{})
	assert.Equal(t,
		[]string{"deployment.environment"},
		FamilyValueNames(context.Background(), valuer.UUID{}, off, telemetrytypes.SignalLogs, selector),
		"the flag default keeps values literal")

	on := flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})
	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		FamilyValueNames(context.Background(), valuer.UUID{}, on, telemetrytypes.SignalLogs, selector),
		"values for one spelling must cover the whole family")
	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		FamilyValueNames(context.Background(), valuer.UUID{}, on, telemetrytypes.SignalMetrics, selector),
		"metric values cover the family members")
	spanMetric := &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Name:          "deployment.environment",
			MetricContext: &telemetrytypes.MetricContext{MetricName: "signoz_calls_total"},
		},
	}
	assert.Equal(t,
		[]string{
			"deployment.environment.name", "resource_deployment.environment.name",
			"deployment.environment", "resource_deployment.environment",
		},
		FamilyValueNames(context.Background(), valuer.UUID{}, on, telemetrytypes.SignalMetrics, spanMetric),
		"span-metrics values cover the resource_ spellings too")
}
