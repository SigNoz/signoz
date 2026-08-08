package resourcefilter

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestResourceSemconvMembersExact(t *testing.T) {
	key := &telemetrytypes.TelemetryFieldKey{
		Name:            "deployment.environment",
		Signal:          telemetrytypes.SignalTraces,
		FieldContext:    telemetrytypes.FieldContextResource,
		FieldDataType:   telemetrytypes.FieldDataTypeString,
		FieldResolution: telemetrytypes.FieldResolutionExact,
		SemconvMembers: []string{
			"deployment.environment.name",
			"deployment.environment",
		},
	}

	assert.Equal(t, []string{"deployment.environment"}, resourceSemconvMembers(key), "exact resource filter should use only the requested physical name")
}
