package telemetrymetadata

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

// The flagger provider registration is process-global and keyed by provider
// name, so each flagger must be used before the next one is created.
func TestFamilyValueNames(t *testing.T) {
	selector := &telemetrytypes.FieldValueSelector{
		FieldKeySelector: &telemetrytypes.FieldKeySelector{Name: "deployment.environment"},
	}

	off := &telemetryMetaStore{fl: flaggertest.WithBooleanFlags(t, map[string]bool{})}
	assert.Equal(t,
		[]string{"deployment.environment"},
		off.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalLogs, selector),
		"the flag default keeps values literal")

	on := &telemetryMetaStore{fl: flaggertest.WithBooleanFlags(t, map[string]bool{
		flagger.FeatureResolveSemconvFamilies.String(): true,
	})}
	assert.Equal(t,
		[]string{"deployment.environment.name", "deployment.environment"},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalLogs, selector),
		"values for one spelling must cover the whole family")
	assert.Equal(t,
		[]string{
			"resource_deployment.environment.name", "resource_deployment_environment_name",
			"deployment.environment.name", "deployment_environment_name",
			"resource_deployment.environment", "resource_deployment_environment",
			"deployment.environment", "deployment_environment",
		},
		on.familyValueNames(context.Background(), valuer.UUID{}, telemetrytypes.SignalMetrics, selector),
		"metric values must cover the stored label spellings")
}
