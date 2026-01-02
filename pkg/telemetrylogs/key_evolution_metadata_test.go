package telemetrylogs

import (
	"context"
	"log/slog"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	clickHouseQueryPattern = "SELECT.*base_column.*base_column_type.*new_column.*new_column_type.*path.*release_time.*FROM.*distributed_key_evolution_metadata.*WHERE.*base_column.*=.*"
	clickHouseColumns      = []cmock.ColumnType{
		{Name: base_column, Type: "String"},
		{Name: base_column_type, Type: "String"},
		{Name: new_column, Type: "String"},
		{Name: new_column_type, Type: "String"},
		{Name: path, Type: "String"},
		{Name: release_time, Type: "UInt64"},
	}
)

func newTestCache(t *testing.T) cache.Cache {
	t.Helper()
	testCache, err := cachetest.New(cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	})
	require.NoError(t, err)
	return testCache
}

func newTestTelemetryStore() *telemetrystoretest.Provider {
	return telemetrystoretest.New(telemetrystore.Config{Provider: "clickhouse"}, sqlmock.QueryMatcherRegexp)
}

func newKeyEvolutionMetadata(telemetryStore telemetrystore.TelemetryStore, cache cache.Cache) *KeyEvolutionMetadata {
	return NewKeyEvolutionMetadata(telemetryStore, cache, slog.Default())
}

func createMockRows(values [][]any) *cmock.Rows {
	return cmock.NewRows(clickHouseColumns, values)
}

func assertMetadataEqual(t *testing.T, expected, actual *telemetrytypes.KeyEvolutionMetadata) {
	t.Helper()
	assert.Equal(t, expected.BaseColumn, actual.BaseColumn)
	assert.Equal(t, expected.BaseColumnType, actual.BaseColumnType)
	assert.Equal(t, expected.NewColumn, actual.NewColumn)
	assert.Equal(t, expected.NewColumnType, actual.NewColumnType)
	assert.Equal(t, expected.ReleaseTime, actual.ReleaseTime)
}

func TestKeyEvolutionMetadata_Get_CacheHit(t *testing.T) {
	ctx := context.Background()
	orgId := valuer.GenerateUUID()
	keyName := "service.name"

	testCache := newTestCache(t)
	telemetryStore := newTestTelemetryStore()
	kem := newKeyEvolutionMetadata(telemetryStore, testCache)

	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	expectedMetadata := []*telemetrytypes.KeyEvolutionMetadata{
		{
			BaseColumn:     "resources_string",
			BaseColumnType: "Map(LowCardinality(String), String)",
			NewColumn:      "resource",
			NewColumnType:  "JSON(max_dynamic_paths=100)",
			ReleaseTime:    releaseTime,
		},
	}

	cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
	cachedData := &CachedKeyEvolutionMetadata{Metadata: expectedMetadata}
	err := testCache.Set(ctx, orgId, cacheKey, cachedData, 24*time.Hour)
	require.NoError(t, err)

	result := kem.Get(ctx, orgId, keyName)

	require.Len(t, result, 1)
	assertMetadataEqual(t, expectedMetadata[0], result[0])
}

func TestKeyEvolutionMetadata_Get_CacheMiss_FetchFromClickHouse(t *testing.T) {
	ctx := context.Background()
	orgId := valuer.GenerateUUID()
	keyName := "resources_string"

	testCache := newTestCache(t)
	telemetryStore := newTestTelemetryStore()

	releaseTime := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	values := [][]any{
		{
			"resources_string",
			"Map(LowCardinality(String), String)",
			"resource",
			"JSON(max_dynamic_paths=100)",
			"",
			uint64(releaseTime.UnixNano()),
		},
	}

	rows := createMockRows(values)
	telemetryStore.Mock().ExpectQuery(clickHouseQueryPattern).WithArgs(keyName).WillReturnRows(rows)

	kem := newKeyEvolutionMetadata(telemetryStore, testCache)
	result := kem.Get(ctx, orgId, keyName)

	require.Len(t, result, 1)
	assert.Equal(t, "resources_string", result[0].BaseColumn)
	assert.Equal(t, "Map(LowCardinality(String), String)", result[0].BaseColumnType)
	assert.Equal(t, "resource", result[0].NewColumn)
	assert.Equal(t, "JSON(max_dynamic_paths=100)", result[0].NewColumnType)
	assert.Equal(t, releaseTime.UnixNano(), result[0].ReleaseTime.UnixNano())

	// Verify data was cached
	var cachedData CachedKeyEvolutionMetadata
	cacheKey := KeyEvolutionMetadataCacheKeyPrefix + keyName
	err := testCache.Get(ctx, orgId, cacheKey, &cachedData)
	require.NoError(t, err)
	require.Len(t, cachedData.Metadata, 1)
	assert.Equal(t, result[0].BaseColumn, cachedData.Metadata[0].BaseColumn)
}

func TestKeyEvolutionMetadata_Get_MultipleMetadataEntries(t *testing.T) {
	ctx := context.Background()
	orgId := valuer.GenerateUUID()
	keyName := "resources_string"

	testCache := newTestCache(t)
	telemetryStore := newTestTelemetryStore()

	releaseTime1 := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)
	releaseTime2 := time.Date(2024, 2, 15, 10, 0, 0, 0, time.UTC)

	values := [][]any{
		{
			"resources_string",
			"Map(LowCardinality(String), String)",
			"resource",
			"JSON(max_dynamic_paths=100)",
			"",
			uint64(releaseTime1.UnixNano()),
		},
		{
			"resources_string",
			"Map(LowCardinality(String), String)",
			"resource_v2",
			"JSON(max_dynamic_paths=100, max_dynamic_path_depth=10)",
			"",
			uint64(releaseTime2.UnixNano()),
		},
	}

	rows := createMockRows(values)
	telemetryStore.Mock().ExpectQuery(clickHouseQueryPattern).WithArgs(keyName).WillReturnRows(rows)

	kem := newKeyEvolutionMetadata(telemetryStore, testCache)
	result := kem.Get(ctx, orgId, keyName)

	require.Len(t, result, 2)
	assert.Equal(t, "resources_string", result[0].BaseColumn)
	assert.Equal(t, "resource", result[0].NewColumn)
	assert.Equal(t, "JSON(max_dynamic_paths=100)", result[0].NewColumnType)
	assert.Equal(t, releaseTime1.UnixNano(), result[0].ReleaseTime.UnixNano())
	assert.Equal(t, "resource_v2", result[1].NewColumn)
	assert.Equal(t, "JSON(max_dynamic_paths=100, max_dynamic_path_depth=10)", result[1].NewColumnType)
	assert.Equal(t, releaseTime2.UnixNano(), result[1].ReleaseTime.UnixNano())
}

func TestKeyEvolutionMetadata_Get_EmptyResultFromClickHouse(t *testing.T) {
	ctx := context.Background()
	orgId := valuer.GenerateUUID()
	keyName := "resources_string"

	testCache := newTestCache(t)
	telemetryStore := newTestTelemetryStore()

	rows := createMockRows([][]any{})
	telemetryStore.Mock().ExpectQuery(clickHouseQueryPattern).WithArgs(keyName).WillReturnRows(rows)

	kem := newKeyEvolutionMetadata(telemetryStore, testCache)
	result := kem.Get(ctx, orgId, keyName)

	assert.Empty(t, result)
}

func TestKeyEvolutionMetadata_Get_ClickHouseQueryError(t *testing.T) {
	ctx := context.Background()
	orgId := valuer.GenerateUUID()
	keyName := "resources_string"

	testCache := newTestCache(t)
	telemetryStore := newTestTelemetryStore()

	telemetryStore.Mock().ExpectQuery(clickHouseQueryPattern).WithArgs(keyName).WillReturnError(assert.AnError)

	kem := newKeyEvolutionMetadata(telemetryStore, testCache)
	result := kem.Get(ctx, orgId, keyName)

	assert.Empty(t, result)
}
