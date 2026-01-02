package telemetrytypestest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MockKeyEvolutionMetadataStore implements the KeyEvolutionMetadataStore interface for testing purposes
type MockKeyEvolutionMetadataStore struct {
	metadata map[string]map[string][]*telemetrytypes.KeyEvolutionMetadata // orgId -> keyName -> metadata
}

// NewMockKeyEvolutionMetadataStore creates a new instance of MockKeyEvolutionMetadataStore with initialized maps
func NewMockKeyEvolutionMetadataStore(metadata map[string]map[string][]*telemetrytypes.KeyEvolutionMetadata) *MockKeyEvolutionMetadataStore {
	return &MockKeyEvolutionMetadataStore{
		metadata: metadata,
	}
}

// Get retrieves all metadata keys for the given key name and orgId.
// Returns an empty slice if the key is not found.
func (m *MockKeyEvolutionMetadataStore) Get(ctx context.Context, orgId valuer.UUID, keyName string) []*telemetrytypes.KeyEvolutionMetadata {
	if m.metadata == nil {
		return nil
	}
	orgMetadata, orgExists := m.metadata[orgId.String()]
	if !orgExists {
		return nil
	}
	keys, exists := orgMetadata[keyName]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	result := make([]*telemetrytypes.KeyEvolutionMetadata, len(keys))
	copy(result, keys)
	return result
}
