package telemetrylogs

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const (
	// KeyEvolutionMetadataTableName is the table name for key evolution metadata
	KeyEvolutionMetadataTableName = "distributed_column_key_evolution_metadata"
	// KeyEvolutionMetadataDBName is the database name for key evolution metadata
	KeyEvolutionMetadataDBName = "signoz_logs"
	// KeyEvolutionMetadataCacheKeyPrefix is the prefix for cache keys
	KeyEvolutionMetadataCacheKeyPrefix = "key_evolution_metadata:"
)

// CachedKeyEvolutionMetadata is a cacheable type for storing key evolution metadata
type CachedKeyEvolutionMetadata struct {
	Keys []*telemetrytypes.KeyEvolutionMetadataKey `json:"keys"`
}

var _ cachetypes.Cacheable = (*CachedKeyEvolutionMetadata)(nil)

func (c *CachedKeyEvolutionMetadata) MarshalBinary() ([]byte, error) {
	return json.Marshal(c)
}

func (c *CachedKeyEvolutionMetadata) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

// Each key can have multiple evolution entries, allowing for multiple column transitions over time.
// The cache is organized by orgId, then by key name.
type KeyEvolutionMetadata struct {
	cache          cache.Cache
	telemetryStore telemetrystore.TelemetryStore
	logger         *slog.Logger
}

func NewKeyEvolutionMetadata(telemetryStore telemetrystore.TelemetryStore, cache cache.Cache, logger *slog.Logger) *KeyEvolutionMetadata {
	return &KeyEvolutionMetadata{
		cache:          cache,
		telemetryStore: telemetryStore,
		logger:         logger,
	}
}

func (k *KeyEvolutionMetadata) fetchFromClickHouse(ctx context.Context, orgID valuer.UUID) {
	store := k.telemetryStore
	logger := k.logger

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if store.ClickhouseDB() == nil {
		logger.WarnContext(ctx, "ClickHouse connection not available for key evolution metadata fetch")
		return
	}

	// Build query to fetch all key evolution metadata for the org
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
		logger.WarnContext(ctx, "Failed to fetch key evolution metadata from ClickHouse", "error", err)
		return
	}
	defer rows.Close()

	// Group metadata by base_column
	metadataByKey := make(map[string][]*telemetrytypes.KeyEvolutionMetadataKey)

	for rows.Next() {
		var (
			baseColumn     string
			baseColumnType string
			newColumn      string
			newColumnType  string
			releaseTime    uint64
		)

		if err := rows.Scan(&baseColumn, &baseColumnType, &newColumn, &newColumnType, &releaseTime); err != nil {
			logger.WarnContext(ctx, "Failed to scan key evolution metadata row", "error", err)
			continue
		}

		key := &telemetrytypes.KeyEvolutionMetadataKey{
			BaseColumn:     baseColumn,
			BaseColumnType: baseColumnType,
			NewColumn:      newColumn,
			NewColumnType:  newColumnType,
			ReleaseTime:    time.Unix(0, int64(releaseTime)),
		}

		metadataByKey[baseColumn] = append(metadataByKey[baseColumn], key)
	}

	if err := rows.Err(); err != nil {
		logger.WarnContext(ctx, "Error iterating key evolution metadata rows", "error", err)
		return
	}

	// Store each key's metadata in cache
	for keyName, keys := range metadataByKey {
		cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
		cachedData := &CachedKeyEvolutionMetadata{Keys: keys}
		if err := k.cache.Set(ctx, orgID, cacheKey, cachedData, 24*time.Hour); err != nil {
			logger.WarnContext(ctx, "Failed to set key evolution metadata in cache", "key", keyName, "error", err)
		}
	}

	logger.DebugContext(ctx, "Successfully fetched key evolution metadata from ClickHouse", "count", len(metadataByKey))
}

// Add adds a metadata key for the given key name and orgId.
// This is primarily for testing purposes. In production, data should come from ClickHouse.
func (k *KeyEvolutionMetadata) Add(ctx context.Context, orgId valuer.UUID, keyName string, key *telemetrytypes.KeyEvolutionMetadataKey) {
	cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
	var cachedData CachedKeyEvolutionMetadata
	if err := k.cache.Get(ctx, orgId, cacheKey, &cachedData); err != nil {
		cachedData = CachedKeyEvolutionMetadata{Keys: []*telemetrytypes.KeyEvolutionMetadataKey{}}
	}

	cachedData.Keys = append(cachedData.Keys, key)
	if err := k.cache.Set(ctx, orgId, cacheKey, &cachedData, 24*time.Hour); err != nil {
		k.logger.WarnContext(ctx, "Failed to set key evolution metadata in cache", "key", keyName, "error", err)
	}
}

// Get retrieves all metadata keys for the given key name and orgId from cache.
// Returns an empty slice if the key is not found in cache.
func (k *KeyEvolutionMetadata) Get(ctx context.Context, orgId valuer.UUID, keyName string) []*telemetrytypes.KeyEvolutionMetadataKey {

	cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
	var cachedData CachedKeyEvolutionMetadata
	if err := k.cache.Get(ctx, orgId, cacheKey, &cachedData); err != nil {
		// Cache miss - fetch from ClickHouse and try again
		k.fetchFromClickHouse(ctx, orgId)

		// Check cache again after fetching
		if err := k.cache.Get(ctx, orgId, cacheKey, &cachedData); err != nil {
			return nil
		}
	}

	// Return a copy to prevent external modification
	result := make([]*telemetrytypes.KeyEvolutionMetadataKey, len(cachedData.Keys))
	copy(result, cachedData.Keys)
	return result
}
