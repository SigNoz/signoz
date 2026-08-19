package implsystemdashboard

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A schema migration cannot ship without updating the definitions: parsing them
// runs the same validation a create goes through, at the current schemaVersion.
func TestEmbeddedDefinitionsParseAtCurrentSchemaVersion(t *testing.T) {
	registry, err := NewRegistry()
	require.NoError(t, err)

	definitions := registry.List()
	assert.NotEmpty(t, definitions)

	for _, definition := range definitions {
		assert.NotEmpty(t, definition.Dashboard.Spec.Panels, "%s", definition.Name())
	}
}

// The frontend addresses the overview dashboard by this name.
func TestAIObservabilityOverviewIsRegistered(t *testing.T) {
	registry, err := NewRegistry()
	require.NoError(t, err)

	_, ok := registry.Get(dashboardtypes.SystemDashboardNamePrefix + "ai-o11y-overview")
	assert.True(t, ok)
}
