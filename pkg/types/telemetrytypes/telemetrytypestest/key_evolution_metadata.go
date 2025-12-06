package telemetrytypestest

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// MockKeyEvolutionMetadataStore implements the KeyEvolutionMetadataStore interface for testing purposes
type MockKeyEvolutionMetadataStore struct {
	metadata map[string][]*telemetrytypes.KeyEvolutionMetadataKey
}

// NewMockKeyEvolutionMetadataStore creates a new instance of MockKeyEvolutionMetadataStore with initialized maps
func NewMockKeyEvolutionMetadataStore() *MockKeyEvolutionMetadataStore {
	return &MockKeyEvolutionMetadataStore{
		metadata: make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey),
	}
}

// Get retrieves all metadata keys for the given key name.
// Returns an empty slice if the key is not found.
func (m *MockKeyEvolutionMetadataStore) Get(keyName string) []*telemetrytypes.KeyEvolutionMetadataKey {
	if m.metadata == nil {
		return nil
	}
	keys, exists := m.metadata[keyName]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	result := make([]*telemetrytypes.KeyEvolutionMetadataKey, len(keys))
	copy(result, keys)
	return result
}

// Add adds a metadata key for the given key name
func (m *MockKeyEvolutionMetadataStore) Add(keyName string, key *telemetrytypes.KeyEvolutionMetadataKey) {
	if m.metadata == nil {
		m.metadata = make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey)
	}
	m.metadata[keyName] = append(m.metadata[keyName], key)
}
