package telemetrytypestest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// MockKeyEvolutionMetadataStore implements the KeyEvolutionMetadataStore interface for testing purposes
type MockKeyEvolutionMetadataStore struct {
	metadata map[string]map[string][]*telemetrytypes.KeyEvolutionMetadataKey // orgId -> keyName -> metadata
}

// NewMockKeyEvolutionMetadataStore creates a new instance of MockKeyEvolutionMetadataStore with initialized maps
func NewMockKeyEvolutionMetadataStore() *MockKeyEvolutionMetadataStore {
	return &MockKeyEvolutionMetadataStore{
		metadata: make(map[string]map[string][]*telemetrytypes.KeyEvolutionMetadataKey),
	}
}

// Get retrieves all metadata keys for the given key name and orgId.
// Returns an empty slice if the key is not found.
func (m *MockKeyEvolutionMetadataStore) Get(ctx context.Context, orgId valuer.UUID, keyName string) []*telemetrytypes.KeyEvolutionMetadataKey {
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
	result := make([]*telemetrytypes.KeyEvolutionMetadataKey, len(keys))
	copy(result, keys)
	return result
}

// Add adds a metadata key for the given key name and orgId
func (m *MockKeyEvolutionMetadataStore) Add(ctx context.Context, orgId valuer.UUID, keyName string, key *telemetrytypes.KeyEvolutionMetadataKey) {
	if m.metadata == nil {
		m.metadata = make(map[string]map[string][]*telemetrytypes.KeyEvolutionMetadataKey)
	}
	if m.metadata[orgId.String()] == nil {
		m.metadata[orgId.String()] = make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey)
	}
	m.metadata[orgId.String()][keyName] = append(m.metadata[orgId.String()][keyName], key)
}
