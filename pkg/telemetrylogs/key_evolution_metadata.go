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
	KeyEvolutionMetadataTableName = "distributed_column_key_evolution_metadata"
	// KeyEvolutionMetadataDBName is the database name for key evolution metadata
	KeyEvolutionMetadataDBName = "signoz_logs"
	// KeyEvolutionMetadataFetchInterval is the interval at which metadata is fetched from ClickHouse
	KeyEvolutionMetadataFetchInterval = 5 * time.Minute
)

var (
	// globalInstance is the singleton instance of KeyEvolutionMetadata
	globalInstance *KeyEvolutionMetadata
	// globalOnce ensures the singleton is initialized only once
	globalOnce sync.Once
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

// NewKeyEvolutionMetadata initializes the global instance with the provided telemetry store and logger.
// It ensures only one instance exists (singleton pattern) and starts the background fetcher if telemetryStore is provided.
// Returns the global instance, which will be initialized on first call.
func NewKeyEvolutionMetadata(telemetryStore telemetrystore.TelemetryStore, logger *slog.Logger) *KeyEvolutionMetadata {
	globalOnce.Do(func() {
		globalInstance = &KeyEvolutionMetadata{
			keys:           make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey),
			telemetryStore: telemetryStore,
			logger:         logger,
			stopChan:       make(chan struct{}),
		}

		// Start the background goroutine only once
		globalInstance.startBackgroundFetcher()
	})
	return globalInstance
}

// startBackgroundFetcher starts a goroutine that periodically fetches metadata from ClickHouse.
// Only one goroutine will run regardless of how many times NewKeyEvolutionMetadata is called.
func (k *KeyEvolutionMetadata) startBackgroundFetcher() {
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
	store := k.telemetryStore
	logger := k.logger

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if store.ClickhouseDB() == nil {
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

	rows, err := store.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		logger.Warn("Failed to fetch key evolution metadata from ClickHouse", "error", err)
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
			releaseTime    uint64
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
			ReleaseTime:    time.Unix(0, int64(releaseTime)),
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
