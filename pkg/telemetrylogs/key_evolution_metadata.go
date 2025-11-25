package telemetrylogs

import (
	"sync"
	"time"
)

// KeyEvolutionMetadataKey represents metadata for a key evolution from an old column to a new column.
type KeyEvolutionMetadataKey struct {
	BaseColumn     string
	BaseColumnType string
	NewColumn      string
	NewColumnType  string
	ReleaseTime    time.Time
}

// KeyEvolutionMetadata manages key evolution metadata with thread-safe access.
// It can be updated from a database source at regular intervals.
// Each key can have multiple evolution entries, allowing for multiple column transitions over time.
type KeyEvolutionMetadata struct {
	mu   sync.RWMutex
	keys map[string][]*KeyEvolutionMetadataKey
}

// NewKeyEvolutionMetadata creates a new KeyEvolutionMetadata instance with dummy data.
// Later, this can be updated to fetch from database at regular intervals.
func NewKeyEvolutionMetadata() *KeyEvolutionMetadata {
	nanoTimestamp := int64(1763960572502890000)
	t := time.Unix(0, nanoTimestamp)
	metadata := map[string][]*KeyEvolutionMetadataKey{
		"resources_string": {
			{
				BaseColumn:     "resources_string",
				BaseColumnType: "Map(LowCardinality(String), String)",
				NewColumn:      "resource",
				NewColumnType:  "JSON(max_dynamic_paths=100)",
				ReleaseTime:    t,
			},
		},
	}
	return &KeyEvolutionMetadata{
		keys: metadata,
	}
}

// Get retrieves all metadata keys for the given key name.
// Returns an empty slice if the key is not found.
func (k *KeyEvolutionMetadata) Get(keyName string) []*KeyEvolutionMetadataKey {
	k.mu.RLock()
	defer k.mu.RUnlock()
	keys, exists := k.keys[keyName]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	result := make([]*KeyEvolutionMetadataKey, len(keys))
	copy(result, keys)
	return result
}
