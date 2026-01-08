package telemetrylogs

// const (
// 	// KeyEvolutionMetadataTableName is the table name for key evolution metadata
// 	KeyEvolutionMetadataTableName = "distributed_key_evolution_metadata"
// 	// KeyEvolutionMetadataDBName is the database name for key evolution metadata
// 	KeyEvolutionMetadataDBName = "signoz_logs"
// 	// KeyEvolutionMetadataCacheKeyPrefix is the prefix for cache keys
// 	KeyEvolutionMetadataCacheKeyPrefix = "key_evolution_metadata:"

// 	base_column      = "base_column"
// 	base_column_type = "base_column_type"
// 	new_column       = "new_column"
// 	new_column_type  = "new_column_type"
// 	path             = "path"
// 	release_time     = "release_time"
// )

// // CachedKeyEvolutionMetadata is a cacheable type for storing key evolution metadata
// type CachedKeyEvolutionMetadata struct {
// 	Metadata []*telemetrytypes.ColumnEvolutionMetadata `json:"metadata"`
// }

// var _ cachetypes.Cacheable = (*CachedKeyEvolutionMetadata)(nil)

// func (c *CachedKeyEvolutionMetadata) MarshalBinary() ([]byte, error) {
// 	return json.Marshal(c)
// }

// func (c *CachedKeyEvolutionMetadata) UnmarshalBinary(data []byte) error {
// 	return json.Unmarshal(data, c)
// }

// // Each key can have multiple evolution entries, allowing for multiple column transitions over time.
// // The cache is organized by orgId, then by key name.
// type ColumnEvolutionMetadata struct {
// 	cache          cache.Cache
// 	telemetryStore telemetrystore.TelemetryStore
// 	logger         *slog.Logger
// }

// var _ telemetrytypes.KeyEvolutionMetadataStore = (*ColumnEvolutionMetadata)(nil)

// func NewKeyEvolutionMetadata(telemetryStore telemetrystore.TelemetryStore, cache cache.Cache, logger *slog.Logger) *ColumnEvolutionMetadata {
// 	return &ColumnEvolutionMetadata{
// 		cache:          cache,
// 		telemetryStore: telemetryStore,
// 		logger:         logger,
// 	}
// }

// func (k *ColumnEvolutionMetadata) fetchFromClickHouse(ctx context.Context, key string) []*telemetrytypes.ColumnEvolutionMetadata {
// 	store := k.telemetryStore
// 	logger := k.logger

// 	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
// 	defer cancel()

// 	// Build query to fetch all key evolution metadata
// 	sb := sqlbuilder.NewSelectBuilder()
// 	sb.Select(
// 		base_column,
// 		base_column_type,
// 		new_column,
// 		new_column_type,
// 		path,
// 		release_time,
// 	)
// 	sb.From(fmt.Sprintf("%s.%s", KeyEvolutionMetadataDBName, KeyEvolutionMetadataTableName))
// 	sb.OrderBy(base_column, release_time)
// 	sb.Where(sb.E(base_column, key))

// 	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

// 	rows, err := store.ClickhouseDB().Query(ctx, query, args...)
// 	if err != nil {
// 		logger.WarnContext(ctx, "Failed to fetch key evolution metadata from ClickHouse", "error", err)
// 		return nil
// 	}
// 	defer rows.Close()

// 	// Group metadata by base_column
// 	metadataByKey := make(map[string][]*telemetrytypes.ColumnEvolutionMetadata)

// 	for rows.Next() {
// 		var (
// 			baseColumn     string
// 			baseColumnType string
// 			newColumn      string
// 			newColumnType  string
// 			path           string
// 			releaseTime    uint64
// 		)

// 		if err := rows.Scan(&baseColumn, &baseColumnType, &newColumn, &newColumnType, &path, &releaseTime); err != nil {
// 			logger.WarnContext(ctx, "Failed to scan key evolution metadata row", "error", err)
// 			continue
// 		}

// 		key := &telemetrytypes.ColumnEvolutionMetadata{
// 			BaseColumn:     baseColumn,
// 			BaseColumnType: baseColumnType,
// 			NewColumn:      newColumn,
// 			NewColumnType:  newColumnType,
// 			Path:           path,
// 			ReleaseTime:    time.Unix(0, int64(releaseTime)),
// 		}

// 		metadataByKey[baseColumn] = append(metadataByKey[baseColumn], key)
// 	}

// 	if err := rows.Err(); err != nil {
// 		logger.WarnContext(ctx, "Error iterating key evolution metadata rows", "error", err)
// 		return nil
// 	}

// 	return metadataByKey[key]

// }

// // Get retrieves all metadata keys for the given key name and orgId from cache.
// // Returns an empty slice if the key is not found in cache.
// func (k *ColumnEvolutionMetadata) Get(ctx context.Context, orgId valuer.UUID, keyName string) []*telemetrytypes.ColumnEvolutionMetadata {

// 	cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
// 	cachedData := &CachedKeyEvolutionMetadata{}
// 	if err := k.cache.Get(ctx, orgId, cacheKey, cachedData); err != nil {

// 		if !errors.Ast(err, errors.TypeNotFound) {
// 			k.logger.ErrorContext(ctx, "Failed to get key evolution metadata from cache", "error", err)
// 			return nil
// 		}

// 		// Cache miss - fetch from ClickHouse and try again
// 		metadata := k.fetchFromClickHouse(ctx, keyName)

// 		cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
// 		cachedData = &CachedKeyEvolutionMetadata{Metadata: metadata}
// 		if err := k.cache.Set(ctx, orgId, cacheKey, cachedData, 24*time.Hour); err != nil {
// 			k.logger.WarnContext(ctx, "Failed to set key evolution metadata in cache", "key", keyName, "error", err)
// 		}
// 	}
// 	return cachedData.Metadata
// }
