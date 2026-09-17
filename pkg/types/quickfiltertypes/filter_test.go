package quickfiltertypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestAIObservabilityQuickFilters(t *testing.T) {
	storableFilters, err := NewDefaultQuickFilter(valuer.MustNewUUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"))
	assert.NoError(t, err)

	var aiStorable *StorableQuickFilter
	for _, f := range storableFilters {
		if f.Source == SourceAiObservability {
			aiStorable = f
			break
		}
	}

	assert.NotNil(t, aiStorable, "ai_observability quick filter should exist")

	sourceFilter, err := NewSourceFilterFromStorableQuickFilter(aiStorable)
	assert.NoError(t, err)

	hasProviderName := false
	hasSystem := false

	for _, filter := range sourceFilter.Filters {
		if filter.Name == aiobservabilitytypes.GenAIProviderName {
			hasProviderName = true
		}
		if filter.Name == aiobservabilitytypes.GenAISystem {
			hasSystem = true
		}
	}

	assert.True(t, hasProviderName, "aiObservabilityFilters should include gen_ai.provider.name")
	assert.True(t, hasSystem, "aiObservabilityFilters should include gen_ai.system")
}
