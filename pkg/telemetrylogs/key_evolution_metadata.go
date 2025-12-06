package telemetrylogs

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

const (
	// KeyEvolutionMetadataTableName is the table name for key evolution metadata
	KeyEvolutionMetadataTableName = "key_evolution_metadata"
	// KeyEvolutionMetadataDBName is the database name for key evolution metadata
	KeyEvolutionMetadataDBName = "signoz_metadata"
	// KeyEvolutionMetadataFetchInterval is the interval at which metadata is fetched from ClickHouse
	KeyEvolutionMetadataFetchInterval = 5 * time.Minute
)

var (
	// globalInstance is the singleton instance of KeyEvolutionMetadata
	globalInstance *KeyEvolutionMetadata
	// globalOnce ensures the singleton is initialized only once
	globalOnce sync.Once
	// globalInitOnce ensures the goroutine is started only once
	globalInitOnce sync.Once
)

// KeyEvolutionMetadata manages key evolution metadata with thread-safe access.
// It can be updated from a database source at regular intervals.
// Each key can have multiple evolution entries, allowing for multiple column transitions over time.
type KeyEvolutionMetadata struct {
	mu             sync.RWMutex
	keys           map[string][]*telemetrytypes.KeyEvolutionMetadataKey
	telemetryStore telemetrystore.TelemetryStore
	logger         *slog.Logger
	stopChan       chan struct{}
	started        bool
}

// GetGlobalInstance returns the singleton instance of KeyEvolutionMetadata.
// This ensures only one instance exists regardless of how many times NewFieldMapper is called.
func GetGlobalInstance() *KeyEvolutionMetadata {
	globalOnce.Do(func() {
		globalInstance = &KeyEvolutionMetadata{
			keys:     make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey),
			stopChan: make(chan struct{}),
		}
		// Initialize with dummy data as fallback
		globalInstance.initializeWithDummyData()
	})
	return globalInstance
}

// Initialize sets up the KeyEvolutionMetadata with a TelemetryStore and starts the background goroutine.
// This should be called once during application startup. The goroutine will only start once,
// even if Initialize is called multiple times.
func (k *KeyEvolutionMetadata) Initialize(telemetryStore telemetrystore.TelemetryStore, logger *slog.Logger) {
	k.mu.Lock()
	k.telemetryStore = telemetryStore
	if logger != nil {
		k.logger = logger
	} else {
		k.logger = slog.Default()
	}
	k.mu.Unlock()

	// Start the background goroutine only once
	globalInitOnce.Do(func() {
		k.startBackgroundFetcher()
	})
}

// startBackgroundFetcher starts a goroutine that periodically fetches metadata from ClickHouse.
// Only one goroutine will run regardless of how many times Initialize is called.
func (k *KeyEvolutionMetadata) startBackgroundFetcher() {
	k.mu.Lock()
	if k.started {
		k.mu.Unlock()
		return
	}
	k.started = true
	k.mu.Unlock()

	go func() {
		ticker := time.NewTicker(KeyEvolutionMetadataFetchInterval)
		defer ticker.Stop()

		// Fetch immediately on startup
		k.fetchFromClickHouse()

		for {
			select {
			case <-ticker.C:
				k.fetchFromClickHouse()
			case <-k.stopChan:
				return
			}
		}
	}()
}

// fetchFromClickHouse fetches key evolution metadata from ClickHouse database.
func (k *KeyEvolutionMetadata) fetchFromClickHouse() {
	k.mu.RLock()
	store := k.telemetryStore
	logger := k.logger
	k.mu.RUnlock()

	if store == nil {
		// TelemetryStore not initialized, skip fetch
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	db := store.ClickhouseDB()
	if db == nil {
		logger.Warn("ClickHouse connection not available for key evolution metadata fetch")
		return
	}

	// Build query to fetch all key evolution metadata
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"base_column",
		"base_column_type",
		"new_column",
		"new_column_type",
		"release_time",
	)
	sb.From(fmt.Sprintf("%s.%s", KeyEvolutionMetadataDBName, KeyEvolutionMetadataTableName))
	sb.OrderBy("base_column", "release_time")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		// Table might not exist yet, log as debug instead of error
		logger.Debug("Failed to fetch key evolution metadata from ClickHouse", "error", err)
		return
	}
	defer rows.Close()

	// Build new metadata map
	newKeys := make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey)

	for rows.Next() {
		var (
			baseColumn     string
			baseColumnType string
			newColumn      string
			newColumnType  string
			releaseTime    time.Time
		)

		if err := rows.Scan(&baseColumn, &baseColumnType, &newColumn, &newColumnType, &releaseTime); err != nil {
			logger.Warn("Failed to scan key evolution metadata row", "error", err)
			continue
		}

		key := &telemetrytypes.KeyEvolutionMetadataKey{
			BaseColumn:     baseColumn,
			BaseColumnType: baseColumnType,
			NewColumn:      newColumn,
			NewColumnType:  newColumnType,
			ReleaseTime:    releaseTime,
		}

		newKeys[baseColumn] = append(newKeys[baseColumn], key)
	}

	if err := rows.Err(); err != nil {
		logger.Warn("Error iterating key evolution metadata rows", "error", err)
		return
	}

	// Update the keys map atomically
	k.mu.Lock()
	k.keys = newKeys
	k.mu.Unlock()

	logger.Debug("Successfully fetched key evolution metadata from ClickHouse", "count", len(newKeys))
}

// initializeWithDummyData initializes the metadata with dummy data as a fallback.
func (k *KeyEvolutionMetadata) initializeWithDummyData() {
	nanoTimestamp := int64(1763960572502890000)
	t := time.Unix(0, nanoTimestamp)
	metadata := map[string][]*telemetrytypes.KeyEvolutionMetadataKey{
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
	k.keys = metadata
}

// Add adds a metadata key for the given key name.
// This is primarily for testing purposes. In production, data should come from ClickHouse.
func (k *KeyEvolutionMetadata) Add(keyName string, key *telemetrytypes.KeyEvolutionMetadataKey) {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.keys == nil {
		k.keys = make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey)
	}
	k.keys[keyName] = append(k.keys[keyName], key)
}

// Get retrieves all metadata keys for the given key name.
// Returns an empty slice if the key is not found.
func (k *KeyEvolutionMetadata) Get(keyName string) []*telemetrytypes.KeyEvolutionMetadataKey {
	k.mu.RLock()
	defer k.mu.RUnlock()
	if k.keys == nil {
		return nil
	}
	keys, exists := k.keys[keyName]
	if !exists {
		return nil
	}
	// Return a copy to prevent external modification
	result := make([]*telemetrytypes.KeyEvolutionMetadataKey, len(keys))
	copy(result, keys)
	return result
}

// Stop stops the background fetcher goroutine.
// This is primarily for testing purposes.
func (k *KeyEvolutionMetadata) Stop() {
	close(k.stopChan)
}

// NewKeyEvolutionMetadata creates a new KeyEvolutionMetadata instance with dummy data.
// Deprecated: Use GetGlobalInstance() instead to get the singleton instance.
func NewKeyEvolutionMetadata() *KeyEvolutionMetadata {
	return GetGlobalInstance()
}
