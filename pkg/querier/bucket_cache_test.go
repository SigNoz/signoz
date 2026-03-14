package querier

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	cacheTTL                    = 1 * time.Hour
	defaultFluxInterval         = 5 * time.Minute
	defaultHeatmapCacheRounding = 5 * time.Minute
)

// Helper function to create test cache
func createTestCache(t *testing.T) cache.Cache {
	config := cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	}
	memCache, err := cachetest.New(config)
	require.NoError(t, err)
	return memCache
}

// mockQuery implements the Query interface for testing
type mockQuery struct {
	fingerprint string
	startMs     uint64
	endMs       uint64
	result      *qbtypes.Result
	kind        qbtypes.RequestType
}

func (m *mockQuery) Fingerprint() string {
	return m.fingerprint
}

func (m *mockQuery) Window() (uint64, uint64) {
	return m.startMs, m.endMs
}

func (m *mockQuery) GetKind() qbtypes.RequestType {
	return m.kind
}

func (m *mockQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
	if m.result != nil {
		return m.result, nil
	}
	// Default result
	return &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{},
		Stats: qbtypes.ExecStats{
			RowsScanned:  100,
			BytesScanned: 1000,
			DurationMS:   10,
		},
	}, nil
}

// createTestBucketCache creates a test bucket cache
func createTestBucketCache(t *testing.T) *bucketCache {
	memCache := createTestCache(t)
	return NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding).(*bucketCache)
}

func createTestTimeSeries(queryName string, startMs, endMs uint64, step uint64) *qbtypes.TimeSeriesData {
	series := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "method",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "GET",
			},
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "status",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "200",
			},
		},
		Values: []*qbtypes.TimeSeriesValue{},
	}

	// Generate values for each step
	for ts := startMs; ts < endMs; ts += step {
		series.Values = append(series.Values, &qbtypes.TimeSeriesValue{
			Timestamp: int64(ts),
			Value:     float64(ts % 100),
		})
	}

	return &qbtypes.TimeSeriesData{
		QueryName: queryName,
		Aggregations: []*qbtypes.AggregationBucket{
			{
				Index:  0,
				Series: []*qbtypes.TimeSeries{series},
			},
		},
	}
}

func TestBucketCache_GetMissRanges_EmptyCache(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       5000,
	}

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	assert.Nil(t, cached)
	assert.Len(t, missing, 1)
	assert.Equal(t, uint64(1000), missing[0].From)
	assert.Equal(t, uint64(5000), missing[0].To)
}

func TestBucketCache_Put_And_Get(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Create a query and result
	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       5000,
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", 1000, 5000, 1000),
		Stats: qbtypes.ExecStats{
			RowsScanned:  100,
			BytesScanned: 1000,
			DurationMS:   10,
		},
		Warnings: []string{"test warning"},
	}

	// Store in cache
	bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Wait a bit for cache to be written
	time.Sleep(10 * time.Millisecond)

	// Retrieve from cache
	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	assert.NotNil(t, cached.Value)
	assert.Len(t, missing, 0)
	assert.Equal(t, qbtypes.RequestTypeTimeSeries, cached.Type)
	assert.Equal(t, uint64(100), cached.Stats.RowsScanned)
	assert.Equal(t, []string{"test warning"}, cached.Warnings)

	// Verify the time series data
	_, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
}

func TestBucketCache_PartialHit(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// First query: cache data for 1000-3000ms
	query1 := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       3000,
	}
	result1 := &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", 1000, 3000, 1000),
	}
	bc.Put(context.Background(), valuer.UUID{}, query1, qbtypes.Step{Duration: 1000 * time.Millisecond}, result1)

	// Wait for cache write
	time.Sleep(10 * time.Millisecond)

	// Second query: request 2000-5000ms (partial overlap)
	query2 := &mockQuery{
		fingerprint: "test-query",
		startMs:     2000,
		endMs:       5000,
	}

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query2, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have cached data
	assert.NotNil(t, cached.Value)

	// Should have one missing range: 3000-5000
	assert.Len(t, missing, 1)
	assert.Equal(t, uint64(3000), missing[0].From)
	assert.Equal(t, uint64(5000), missing[0].To)
}

func TestBucketCache_MultipleBuckets(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Cache multiple non-contiguous ranges
	query1 := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       2000,
	}
	bc.Put(context.Background(), valuer.UUID{}, query1, qbtypes.Step{Duration: 100 * time.Millisecond}, &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", 1000, 2000, 100),
	})

	query2 := &mockQuery{
		fingerprint: "test-query",
		startMs:     3000,
		endMs:       4000,
	}
	bc.Put(context.Background(), valuer.UUID{}, query2, qbtypes.Step{Duration: 100 * time.Millisecond}, &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", 3000, 4000, 100),
	})

	// Wait for cache writes
	time.Sleep(10 * time.Millisecond)

	// Query spanning all ranges
	query3 := &mockQuery{
		fingerprint: "test-query",
		startMs:     500,
		endMs:       4500,
	}

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query3, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have cached data
	assert.NotNil(t, cached.Value)

	// Should have three missing ranges: 500-1000, 2000-3000, 4000-4500
	assert.Len(t, missing, 3)
	assert.Equal(t, uint64(500), missing[0].From)
	assert.Equal(t, uint64(1000), missing[0].To)
	assert.Equal(t, uint64(2000), missing[1].From)
	assert.Equal(t, uint64(3000), missing[1].To)
	assert.Equal(t, uint64(4000), missing[2].From)
	assert.Equal(t, uint64(4500), missing[2].To)
}

func TestBucketCache_FluxInterval(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Try to cache data too close to current time
	currentMs := uint64(time.Now().UnixMilli())
	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     currentMs - 60000, // 1 minute ago
		endMs:       currentMs,         // now
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", query.startMs, query.endMs, 1000),
	}

	// This should not be cached due to flux interval
	bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Wait a bit
	time.Sleep(10 * time.Millisecond)

	// Try to get the data
	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have no cached data
	assert.Nil(t, cached)
	assert.Len(t, missing, 1)
}

func TestBucketCache_MergeTimeSeriesResults(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Create time series with same labels but different time ranges
	series1 := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "method",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "GET",
			},
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "status",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "200",
			},
		},
		Values: []*qbtypes.TimeSeriesValue{
			{Timestamp: 1000, Value: 10},
			{Timestamp: 2000, Value: 20},
		},
	}

	series2 := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "method",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "GET",
			},
			{
				Key: telemetrytypes.TelemetryFieldKey{
					Name:          "status",
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				Value: "200",
			},
		},
		Values: []*qbtypes.TimeSeriesValue{
			{Timestamp: 3000, Value: 30},
			{Timestamp: 4000, Value: 40},
		},
	}

	// Cache first part
	query1 := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       3000,
	}
	bc.Put(context.Background(), valuer.UUID{}, query1, qbtypes.Step{Duration: 1000 * time.Millisecond}, &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{Series: []*qbtypes.TimeSeries{series1}},
			},
		},
	})

	// Cache second part
	query2 := &mockQuery{
		fingerprint: "test-query",
		startMs:     3000,
		endMs:       5000,
	}
	bc.Put(context.Background(), valuer.UUID{}, query2, qbtypes.Step{Duration: 1000 * time.Millisecond}, &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{Series: []*qbtypes.TimeSeries{series2}},
			},
		},
	})

	// Wait for cache writes
	time.Sleep(10 * time.Millisecond)

	// Query full range
	query3 := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       5000,
	}

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query3, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have no missing ranges
	assert.Len(t, missing, 0)

	// Verify merged series
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	assert.Len(t, tsData.Aggregations[0].Series, 1)

	// Should have all 4 values merged and sorted
	values := tsData.Aggregations[0].Series[0].Values
	assert.Len(t, values, 4)
	assert.Equal(t, int64(1000), values[0].Timestamp)
	assert.Equal(t, int64(2000), values[1].Timestamp)
	assert.Equal(t, int64(3000), values[2].Timestamp)
	assert.Equal(t, int64(4000), values[3].Timestamp)
}

func TestBucketCache_RawData(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Test with raw data type
	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       5000,
	}

	rawData := &qbtypes.RawData{
		QueryName: "test",
		Rows: []*qbtypes.RawRow{
			{
				Timestamp: time.Unix(1, 0),
				Data: map[string]any{
					"value": 10.5,
					"label": "test1",
				},
			},
			{
				Timestamp: time.Unix(2, 0),
				Data: map[string]any{
					"value": 20.5,
					"label": "test2",
				},
			},
		},
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeRaw,
		Value: rawData,
	}

	bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Raw data should not be cached
	assert.Nil(t, cached)
	assert.Len(t, missing, 1)
	assert.Equal(t, query.startMs, missing[0].From)
	assert.Equal(t, query.endMs, missing[0].To)
}

func TestBucketCache_ScalarData(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       5000,
	}

	scalarData := &qbtypes.ScalarData{
		Columns: []*qbtypes.ColumnDescriptor{
			{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "value"},
				QueryName:         "test",
				Type:              qbtypes.ColumnTypeAggregation,
			},
		},
		Data: [][]any{
			{42.5},
		},
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeScalar,
		Value: scalarData,
	}

	bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Scalar data should not be cached
	assert.Nil(t, cached)
	assert.Len(t, missing, 1)
	assert.Equal(t, query.startMs, missing[0].From)
	assert.Equal(t, query.endMs, missing[0].To)
}

func TestBucketCache_EmptyFingerprint(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Query with empty fingerprint should generate a fallback key
	query := &mockQuery{
		fingerprint: "",
		startMs:     1000,
		endMs:       5000,
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: createTestTimeSeries("A", 1000, 5000, 1000),
	}

	bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	// Should still be able to retrieve
	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
	assert.NotNil(t, cached.Value)
	assert.Len(t, missing, 0)
}

func TestBucketCache_FindMissingRanges_EdgeCases(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding).(*bucketCache)

	// Test with buckets that have gaps and overlaps
	buckets := []*qbtypes.CachedBucket{
		{StartMs: 1000, EndMs: 2000},
		{StartMs: 2500, EndMs: 3500},
		{StartMs: 3000, EndMs: 4000}, // Overlaps with previous
		{StartMs: 5000, EndMs: 6000},
	}

	// Query range that spans all buckets
	missing := bc.findMissingRangesWithStep(buckets, 500, 6500, 500, qbtypes.RequestTypeTimeSeries)

	// Expected missing ranges: 500-1000, 2000-2500, 4000-5000, 6000-6500
	assert.Len(t, missing, 4)
	assert.Equal(t, uint64(500), missing[0].From)
	assert.Equal(t, uint64(1000), missing[0].To)
	assert.Equal(t, uint64(2000), missing[1].From)
	assert.Equal(t, uint64(2500), missing[1].To)
	assert.Equal(t, uint64(4000), missing[2].From)
	assert.Equal(t, uint64(5000), missing[2].To)
	assert.Equal(t, uint64(6000), missing[3].From)
	assert.Equal(t, uint64(6500), missing[3].To)
}

func TestBucketCache_ConcurrentAccess(t *testing.T) {
	memCache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, cacheTTL, defaultFluxInterval, defaultHeatmapCacheRounding)

	// Test concurrent puts and gets
	done := make(chan bool)

	// Multiple writers
	for i := 0; i < 5; i++ {
		go func(id int) {
			query := &mockQuery{
				fingerprint: fmt.Sprintf("query-%d", id),
				startMs:     uint64(id * 1000),
				endMs:       uint64((id + 1) * 1000),
			}
			result := &qbtypes.Result{
				Type:  qbtypes.RequestTypeTimeSeries,
				Value: createTestTimeSeries(fmt.Sprintf("Q%d", id), query.startMs, query.endMs, 100),
			}
			bc.Put(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 100 * time.Microsecond}, result)
			done <- true
		}(i)
	}

	// Multiple readers
	for i := 0; i < 5; i++ {
		go func(id int) {
			query := &mockQuery{
				fingerprint: fmt.Sprintf("query-%d", id),
				startMs:     uint64(id * 1000),
				endMs:       uint64((id + 1) * 1000),
			}
			bc.GetMissRanges(context.Background(), valuer.UUID{}, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}
}

func TestBucketCache_GetMissRanges_FluxInterval(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create test query
	query := &mockQuery{
		fingerprint: "test-query",
		startMs:     1000,
		endMs:       10000,
	}

	// Pre-populate cache with data that's outside flux interval
	currentMs := uint64(time.Now().UnixMilli())
	fluxBoundary := currentMs - uint64(defaultFluxInterval.Milliseconds())

	cachedResult := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10},
								{Timestamp: 2000, Value: 20},
								{Timestamp: int64(fluxBoundary - 1000), Value: 30},
							},
						},
					},
				},
			},
		},
	}

	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, cachedResult)

	// Get miss ranges
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
	assert.NotNil(t, cached)
	t.Logf("Missing ranges: %+v, query range: %d-%d", missing, query.startMs, query.endMs)

	// The cache implementation with flux interval handling should either:
	// 1. Have no missing ranges if all data is cached and within bounds
	// 2. Have missing ranges for data beyond flux boundary
	// Since we're caching data that includes a point at fluxBoundary-1000,
	// and our query extends to 10000 (which is way in the past),
	// we expect the entire range to be considered cached
}

func TestBucketCache_Put_FluxIntervalTrimming(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Calculate flux boundary
	currentMs := uint64(time.Now().UnixMilli())
	fluxBoundary := currentMs - uint64(defaultFluxInterval.Milliseconds())

	// Create a query that spans before and after flux boundary
	query := &mockQuery{
		fingerprint: "test-trim-query",
		startMs:     fluxBoundary - 10000, // 10 seconds before flux boundary
		endMs:       currentMs,            // current time
	}

	// Create result with data points before and after flux boundary
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: int64(fluxBoundary - 5000), Value: 10}, // Should be cached
								{Timestamp: int64(fluxBoundary - 1000), Value: 20}, // Should be cached
								{Timestamp: int64(fluxBoundary + 1000), Value: 30}, // Should NOT be cached
								{Timestamp: int64(fluxBoundary + 5000), Value: 40}, // Should NOT be cached
							},
						},
					},
				},
			},
		},
		Stats: qbtypes.ExecStats{
			RowsScanned:  100,
			BytesScanned: 1000,
			DurationMS:   10,
		},
	}

	// Put the result
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Retrieve cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have cached data
	assert.NotNil(t, cached)

	// Verify that only data before flux boundary was cached
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	require.Len(t, tsData.Aggregations[0].Series, 1)

	series := tsData.Aggregations[0].Series[0]
	assert.Len(t, series.Values, 2) // Only 2 values should be cached

	// Verify the cached values are the ones before flux boundary
	assert.Equal(t, int64(fluxBoundary-5000), series.Values[0].Timestamp)
	assert.Equal(t, float64(10), series.Values[0].Value)
	assert.Equal(t, int64(fluxBoundary-1000), series.Values[1].Timestamp)
	assert.Equal(t, float64(20), series.Values[1].Value)

	// Should have missing ranges - one for the gap and one after flux boundary
	t.Logf("Missing ranges: %+v, fluxBoundary: %d", missing, fluxBoundary)
	// We may have multiple missing ranges due to gaps
	assert.True(t, len(missing) >= 1)

	// The last missing range should be after or at the flux boundary
	lastMissing := missing[len(missing)-1]
	assert.True(t, lastMissing.From >= fluxBoundary || lastMissing.To >= fluxBoundary)
}

func TestBucketCache_Put_EntireRangeInFluxInterval(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Calculate flux boundary
	currentMs := uint64(time.Now().UnixMilli())
	fluxBoundary := currentMs - uint64(defaultFluxInterval.Milliseconds())

	// Create a query entirely within flux interval
	query := &mockQuery{
		fingerprint: "test-flux-query",
		startMs:     fluxBoundary + 1000,
		endMs:       currentMs,
	}

	// Create result
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: int64(fluxBoundary + 2000), Value: 10},
								{Timestamp: int64(fluxBoundary + 3000), Value: 20},
							},
						},
					},
				},
			},
		},
	}

	// Put the result - should not cache anything
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Try to get cached data - should have no cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have no cached value
	assert.Nil(t, cached)

	// Entire range should be missing
	assert.Len(t, missing, 1)
	assert.Equal(t, query.startMs, missing[0].From)
	assert.Equal(t, query.endMs, missing[0].To)
}

func TestBucketCache_EmptyDataHandling(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	tests := []struct {
		name        string
		result      *qbtypes.Result
		shouldCache bool
		description string
	}{
		{
			name: "filtered_empty_time_series",
			result: &qbtypes.Result{
				Type: qbtypes.RequestTypeTimeSeries,
				Value: &qbtypes.TimeSeriesData{
					QueryName: "A",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Index:  0,
							Series: []*qbtypes.TimeSeries{}, // No series but has aggregation
						},
					},
				},
			},
			shouldCache: true,
			description: "Has aggregations but no series - data was filtered out - should cache",
		},
		{
			name: "series_with_no_values",
			result: &qbtypes.Result{
				Type: qbtypes.RequestTypeTimeSeries,
				Value: &qbtypes.TimeSeriesData{
					QueryName: "A",
					Aggregations: []*qbtypes.AggregationBucket{
						{
							Index: 0,
							Series: []*qbtypes.TimeSeries{
								{
									Labels: []*qbtypes.Label{
										{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
									},
									Values: []*qbtypes.TimeSeriesValue{}, // Series exists but no values
								},
							},
						},
					},
				},
			},
			shouldCache: true,
			description: "Has series but no values - data was filtered - should cache",
		},
		{
			name: "empty_raw_data",
			result: &qbtypes.Result{
				Type: qbtypes.RequestTypeRaw,
				Value: &qbtypes.RawData{
					QueryName: "test",
					Rows:      []*qbtypes.RawRow{},
				},
			},
			shouldCache: false,
			description: "Empty raw data - should not cache",
		},
		{
			name: "empty_scalar_data",
			result: &qbtypes.Result{
				Type: qbtypes.RequestTypeScalar,
				Value: &qbtypes.ScalarData{
					Columns: []*qbtypes.ColumnDescriptor{},
					Data:    [][]any{},
				},
			},
			shouldCache: false,
			description: "Empty scalar data - should not cache",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Use timestamps that are definitely outside flux interval (1 hour ago)
			currentMs := uint64(time.Now().UnixMilli())
			startMs := currentMs - (60 * 60 * 1000) // 1 hour ago
			endMs := startMs + 4000                 // 4 seconds range

			query := &mockQuery{
				fingerprint: "test-empty-" + tt.name,
				startMs:     startMs,
				endMs:       endMs,
			}

			// Put the result
			bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, tt.result)

			// Wait a bit for cache to be written
			time.Sleep(10 * time.Millisecond)

			// Try to get cached data
			cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

			if tt.shouldCache {
				assert.NotNil(t, cached, tt.description)
			} else {
				assert.Nil(t, cached, tt.description)
				assert.Len(t, missing, 1, "Should have entire range as missing when data is not cached")
				if len(missing) > 0 {
					assert.Equal(t, query.startMs, missing[0].From)
					assert.Equal(t, query.endMs, missing[0].To)
				}
			}
		})
	}
}

func TestBucketCache_PartialValues(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a query with partial values
	query := &mockQuery{
		fingerprint: "test-partial-query",
		startMs:     1000,
		endMs:       5000,
	}

	// Create result with both partial and non-partial values
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10, Partial: true},  // Partial value - should not be cached
								{Timestamp: 2000, Value: 20, Partial: false}, // Normal value - should be cached
								{Timestamp: 3000, Value: 30, Partial: false}, // Normal value - should be cached
								{Timestamp: 4000, Value: 40, Partial: true},  // Partial value - should not be cached
							},
						},
					},
				},
			},
		},
		Stats: qbtypes.ExecStats{
			RowsScanned:  100,
			BytesScanned: 1000,
			DurationMS:   10,
		},
	}

	// Put the result
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Wait for cache to be written
	time.Sleep(10 * time.Millisecond)

	// Get cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have cached data
	assert.NotNil(t, cached)
	assert.NotNil(t, cached.Value)
	assert.Len(t, missing, 0) // No missing ranges since we cached the valid values

	// Verify that only non-partial values were cached
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	require.Len(t, tsData.Aggregations[0].Series, 1)

	series := tsData.Aggregations[0].Series[0]
	assert.Len(t, series.Values, 2) // Only 2 non-partial values should be cached

	// Verify the cached values are the non-partial ones
	assert.Equal(t, int64(2000), series.Values[0].Timestamp)
	assert.Equal(t, float64(20), series.Values[0].Value)
	assert.False(t, series.Values[0].Partial)

	assert.Equal(t, int64(3000), series.Values[1].Timestamp)
	assert.Equal(t, float64(30), series.Values[1].Value)
	assert.False(t, series.Values[1].Partial)
}

func TestBucketCache_AllPartialValues(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a query with all partial values
	query := &mockQuery{
		fingerprint: "test-all-partial-query",
		startMs:     1000,
		endMs:       5000,
	}

	// Create result with only partial values
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10, Partial: true},
								{Timestamp: 2000, Value: 20, Partial: true},
								{Timestamp: 3000, Value: 30, Partial: true},
								{Timestamp: 4000, Value: 40, Partial: true},
							},
						},
					},
				},
			},
		},
	}

	// Put the result
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)

	// Wait for cache to be written
	time.Sleep(10 * time.Millisecond)

	// Get cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// When all values are partial and filtered out, the result is cached as empty
	// This prevents re-querying for the same misaligned time range
	assert.NotNil(t, cached)
	assert.NotNil(t, cached.Value)
	assert.Len(t, missing, 0)

	// Verify the cached result is empty (all partial values were filtered)
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	require.Len(t, tsData.Aggregations[0].Series, 1)

	series := tsData.Aggregations[0].Series[0]
	assert.Len(t, series.Values, 0) // All values were partial and filtered out
}

func TestBucketCache_FilteredCachedResults(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// First, cache data for a wide time range (1000-5000ms)
	query1 := &mockQuery{
		fingerprint: "test-filter-query",
		startMs:     1000,
		endMs:       5000,
	}

	result1 := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10},
								{Timestamp: 2000, Value: 20},
								{Timestamp: 3000, Value: 30},
								{Timestamp: 4000, Value: 40},
							},
						},
					},
				},
			},
		},
	}

	// Cache the wide range
	bc.Put(ctx, orgID, query1, qbtypes.Step{Duration: 1000 * time.Millisecond}, result1)
	time.Sleep(10 * time.Millisecond)

	// Now query for a smaller range (2000-3500ms)
	query2 := &mockQuery{
		fingerprint: "test-filter-query",
		startMs:     2000,
		endMs:       3500,
	}

	// Get cached data - should be filtered to requested range
	cached, missing := bc.GetMissRanges(ctx, orgID, query2, qbtypes.Step{Duration: 1000 * time.Millisecond})

	// Should have no missing ranges
	assert.Len(t, missing, 0)
	assert.NotNil(t, cached)

	// Verify the cached result only contains values within the requested range
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)
	require.Len(t, tsData.Aggregations[0].Series, 1)

	series := tsData.Aggregations[0].Series[0]
	assert.Len(t, series.Values, 2) // Only values at 2000 and 3000 should be included

	// Verify the exact values
	assert.Equal(t, int64(2000), series.Values[0].Timestamp)
	assert.Equal(t, float64(20), series.Values[0].Value)
	assert.Equal(t, int64(3000), series.Values[1].Timestamp)
	assert.Equal(t, float64(30), series.Values[1].Value)

	// Value at 1000 should not be included (before requested range)
	// Value at 4000 should not be included (after requested range)
}

func TestBucketCache_FindMissingRangesWithStep(t *testing.T) {
	bc := createTestBucketCache(t)

	tests := []struct {
		name         string
		buckets      []*qbtypes.CachedBucket
		startMs      uint64
		endMs        uint64
		stepMs       uint64
		expectedMiss []*qbtypes.TimeRange
		description  string
	}{
		{
			name:    "start_not_aligned_to_step",
			buckets: []*qbtypes.CachedBucket{},
			startMs: 1500, // Not aligned to 1000ms step
			endMs:   5000,
			stepMs:  1000,
			expectedMiss: []*qbtypes.TimeRange{
				{From: 1500, To: 2000}, // Partial window at start
				{From: 2000, To: 5000}, // Rest of the range
			},
			description: "Start not aligned to step should create partial window",
		},
		{
			name:    "end_not_aligned_to_step",
			buckets: []*qbtypes.CachedBucket{},
			startMs: 1000,
			endMs:   4500, // Not aligned to 1000ms step
			stepMs:  1000,
			expectedMiss: []*qbtypes.TimeRange{
				{From: 1000, To: 4500},
			},
			description: "End not aligned to step should be included",
		},
		{
			name: "bucket_boundaries_not_aligned",
			buckets: []*qbtypes.CachedBucket{
				{StartMs: 1500, EndMs: 2500}, // Not aligned
			},
			startMs: 1000,
			endMs:   4000,
			stepMs:  1000,
			expectedMiss: []*qbtypes.TimeRange{
				{From: 1000, To: 2000}, // Gap before aligned bucket start
				{From: 2000, To: 4000}, // Gap after aligned bucket end
			},
			description: "Bucket boundaries should be aligned to step",
		},
		{
			name:    "small_window_less_than_step",
			buckets: []*qbtypes.CachedBucket{},
			startMs: 1000,
			endMs:   1500, // Less than one step
			stepMs:  1000,
			expectedMiss: []*qbtypes.TimeRange{
				{From: 1000, To: 1500},
			},
			description: "Window smaller than step should use basic algorithm",
		},
		{
			name:    "zero_step_uses_basic_algorithm",
			buckets: []*qbtypes.CachedBucket{},
			startMs: 1000,
			endMs:   5000,
			stepMs:  0,
			expectedMiss: []*qbtypes.TimeRange{
				{From: 1000, To: 5000},
			},
			description: "Zero step should use basic algorithm",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Mock current time for flux boundary tests
			result := bc.findMissingRangesWithStep(tt.buckets, tt.startMs, tt.endMs, tt.stepMs, qbtypes.RequestTypeTimeSeries)

			// Compare lengths first
			assert.Len(t, result, len(tt.expectedMiss), tt.description)

			// Compare individual ranges
			for i, expected := range tt.expectedMiss {
				if i < len(result) {
					assert.Equal(t, expected.From, result[i].From,
						"Range %d From mismatch: %s", i, tt.description)
					assert.Equal(t, expected.To, result[i].To,
						"Range %d To mismatch: %s", i, tt.description)
				}
			}
		})
	}
}

func TestBucketCache_PartialValueDetection(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Test case 1: Query with misaligned start time
	t.Run("misaligned_start_time", func(t *testing.T) {
		// Query from 1500ms to 5000ms with 1000ms step
		// First value at 1500ms should be marked as partial
		query := &mockQuery{
			fingerprint: "test-partial-start",
			startMs:     1500, // Not aligned to 1000ms step
			endMs:       5000,
		}

		result := &qbtypes.Result{
			Type: qbtypes.RequestTypeTimeSeries,
			Value: &qbtypes.TimeSeriesData{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1500, Value: 10, Partial: true},  // Partial - misaligned start
									{Timestamp: 2000, Value: 20, Partial: false}, // Complete interval
									{Timestamp: 3000, Value: 30, Partial: false}, // Complete interval
									{Timestamp: 4000, Value: 40, Partial: false}, // Complete interval
								},
							},
						},
					},
				},
			},
		}

		// Put the result
		bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
		time.Sleep(10 * time.Millisecond)

		// Get cached data
		cached, _ := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

		// Should have cached data
		assert.NotNil(t, cached)
		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)

		// Verify that the partial value was excluded from cache
		series := tsData.Aggregations[0].Series[0]
		assert.Len(t, series.Values, 3) // Only 3 non-partial values
		assert.Equal(t, int64(2000), series.Values[0].Timestamp)
		assert.Equal(t, int64(3000), series.Values[1].Timestamp)
		assert.Equal(t, int64(4000), series.Values[2].Timestamp)
	})

	// Test case 2: Query with misaligned end time
	t.Run("misaligned_end_time", func(t *testing.T) {
		// Query from 1000ms to 4500ms with 1000ms step
		// Last value at 4000ms should be marked as partial (doesn't cover full interval to 5000ms)
		query := &mockQuery{
			fingerprint: "test-partial-end",
			startMs:     1000,
			endMs:       4500, // Not aligned to 1000ms step
		}

		result := &qbtypes.Result{
			Type: qbtypes.RequestTypeTimeSeries,
			Value: &qbtypes.TimeSeriesData{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1000, Value: 10, Partial: false}, // Complete interval
									{Timestamp: 2000, Value: 20, Partial: false}, // Complete interval
									{Timestamp: 3000, Value: 30, Partial: false}, // Complete interval
									{Timestamp: 4000, Value: 40, Partial: true},  // Partial - doesn't cover to 5000ms
								},
							},
						},
					},
				},
			},
		}

		// Put the result
		bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
		time.Sleep(10 * time.Millisecond)

		// Get cached data
		cached, _ := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

		// Should have cached data
		assert.NotNil(t, cached)
		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)

		// Verify that the partial value was excluded from cache
		series := tsData.Aggregations[0].Series[0]
		assert.Len(t, series.Values, 3) // Only 3 non-partial values
		assert.Equal(t, int64(1000), series.Values[0].Timestamp)
		assert.Equal(t, int64(2000), series.Values[1].Timestamp)
		assert.Equal(t, int64(3000), series.Values[2].Timestamp)
	})

	// Test case 3: Query with both misaligned start and end
	t.Run("misaligned_both_start_and_end", func(t *testing.T) {
		query := &mockQuery{
			fingerprint: "test-partial-both",
			startMs:     1500, // Not aligned
			endMs:       4500, // Not aligned
		}

		result := &qbtypes.Result{
			Type: qbtypes.RequestTypeTimeSeries,
			Value: &qbtypes.TimeSeriesData{
				QueryName: "A",
				Aggregations: []*qbtypes.AggregationBucket{
					{
						Series: []*qbtypes.TimeSeries{
							{
								Labels: []*qbtypes.Label{
									{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
								},
								Values: []*qbtypes.TimeSeriesValue{
									{Timestamp: 1500, Value: 10, Partial: true},  // Partial - misaligned start
									{Timestamp: 2000, Value: 20, Partial: false}, // Complete interval
									{Timestamp: 3000, Value: 30, Partial: false}, // Complete interval
									{Timestamp: 4000, Value: 40, Partial: true},  // Partial - misaligned end
								},
							},
						},
					},
				},
			},
		}

		// Put the result
		bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
		time.Sleep(10 * time.Millisecond)

		// Get cached data
		cached, _ := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})

		// Should have cached data
		assert.NotNil(t, cached)
		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)

		// Verify that both partial values were excluded from cache
		series := tsData.Aggregations[0].Series[0]
		assert.Len(t, series.Values, 2) // Only 2 non-partial values
		assert.Equal(t, int64(2000), series.Values[0].Timestamp)
		assert.Equal(t, int64(3000), series.Values[1].Timestamp)
	})
}

func TestBucketCache_NoCache(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a query
	query := &mockQuery{
		fingerprint: "test-nocache-query",
		startMs:     1000,
		endMs:       5000,
	}

	// Create result
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"},
							},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Value: 10},
								{Timestamp: 2000, Value: 20},
								{Timestamp: 3000, Value: 30},
								{Timestamp: 4000, Value: 40},
							},
						},
					},
				},
			},
		},
	}

	// Put the result in cache
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	// Verify data is cached
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
	assert.NotNil(t, cached)
	assert.Len(t, missing, 0)

	// Test NoCache behavior in querier would bypass the cache entirely
	// The actual NoCache logic is implemented in querier.run(), not in bucket cache
	// This test verifies that the cache works normally and NoCache bypasses it at a higher level
}

func TestBucketCache_HeatmapExactMatch(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a heatmap query with time range that works with 5-minute rounding
	// Use time range 600000-900000 ms (10-15 minutes) which rounds to 600000-600000
	query := &mockQuery{
		fingerprint: "test-heatmap-query",
		startMs:     600000, // 10 minutes
		endMs:       900000, // 15 minutes
		kind:        qbtypes.RequestTypeHeatmap,
	}

	// Create heatmap result with bounds and bucket values
	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeHeatmap,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Index: 0,
					Alias: "__result_0",
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "api"},
							},
							Bounds: []float64{0, 10, 20, 30}, // 3 buckets with 4 boundary points
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 650000, Values: []float64{5, 3, 0}},
								{Timestamp: 750000, Values: []float64{2, 6, 4}},
								{Timestamp: 850000, Values: []float64{8, 1, 2}},
							},
						},
					},
				},
			},
		},
	}

	// Put the result in cache
	bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	// Test exact match - same time range should return cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
	require.NotNil(t, cached, "exact match should return cached data")
	assert.Len(t, missing, 0, "exact match should have no missing ranges")

	// Verify the cached data structure
	assert.Equal(t, qbtypes.RequestTypeHeatmap, cached.Type)
	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	require.Len(t, tsData.Aggregations, 1)

	series := tsData.Aggregations[0].Series[0]

	// Verify bounds are preserved
	assert.Equal(t, []float64{0, 10, 20, 30}, series.Bounds, "bounds should be preserved")

	// Verify values are preserved
	require.Len(t, series.Values, 3)
	assert.Equal(t, []float64{5, 3, 0}, series.Values[0].Values)
	assert.Equal(t, []float64{2, 6, 4}, series.Values[1].Values)
	assert.Equal(t, []float64{8, 1, 2}, series.Values[2].Values)
}

func TestBucketCache_HeatmapDifferentTimeRange(t *testing.T) {
	bc := createTestBucketCache(t)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create and cache a heatmap query for time range 1000-5000
	query1 := &mockQuery{
		fingerprint: "test-heatmap-different-range",
		startMs:     1000,
		endMs:       5000,
	}

	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeHeatmap,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Index: 0,
					Series: []*qbtypes.TimeSeries{
						{
							Bounds: []float64{0, 10, 20, 30},
							Values: []*qbtypes.TimeSeriesValue{
								{Timestamp: 1000, Values: []float64{5, 3, 0}},
								{Timestamp: 2000, Values: []float64{2, 6, 4}},
							},
						},
					},
				},
			},
		},
	}

	bc.Put(ctx, orgID, query1, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	time.Sleep(10 * time.Millisecond)

	// Query with different time range - should have missing ranges
	query2 := &mockQuery{
		fingerprint: "test-heatmap-different-range",
		startMs:     3000,
		endMs:       7000,
	}

	_, missing := bc.GetMissRanges(ctx, orgID, query2, qbtypes.Step{Duration: 1000 * time.Millisecond})

	assert.True(t, len(missing) > 0, "different time range should have missing ranges")
}

func TestBucketCache_HeatmapHybridCaching(t *testing.T) {
	config := cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	}
	memCache, err := cachetest.New(config)
	require.NoError(t, err)

	bc := NewBucketCache(
		instrumentationtest.New().ToProviderSettings(),
		memCache,
		1*time.Hour,
		5*time.Minute,
		5*time.Minute, // 5-minute rounding for window cache
	)

	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a 4-hour heatmap query
	query4h := &mockQuery{
		fingerprint: "test-heatmap",
		startMs:     1000000,
		endMs:       1000000 + (4 * 60 * 60 * 1000), // 4 hours
		kind:        qbtypes.RequestTypeHeatmap,
	}

	// Create heatmap data with histogram buckets
	heatmapData := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{
			{
				Index: 0,
				Series: []*qbtypes.TimeSeries{
					{
						Labels: []*qbtypes.Label{
							{
								Key: telemetrytypes.TelemetryFieldKey{
									Name:          "le",
									FieldDataType: telemetrytypes.FieldDataTypeString,
								},
								Value: "100",
							},
						},
						Bounds: []float64{0, 100, 500, 1000, 2000, 5000}, // Histogram bucket boundaries
						Values: []*qbtypes.TimeSeriesValue{
							{Timestamp: 1000000, Value: 10},
							{Timestamp: 1000000 + (1 * 60 * 60 * 1000), Value: 20}, // 1 hour
							{Timestamp: 1000000 + (2 * 60 * 60 * 1000), Value: 30}, // 2 hours
							{Timestamp: 1000000 + (3 * 60 * 60 * 1000), Value: 40}, // 3 hours
						},
					},
				},
			},
		},
	}

	result4h := &qbtypes.Result{
		Type:  qbtypes.RequestTypeHeatmap,
		Value: heatmapData,
		Stats: qbtypes.ExecStats{
			RowsScanned:  1000,
			BytesScanned: 10000,
			DurationMS:   100,
		},
	}

	// Cache the 4-hour result
	bc.Put(ctx, orgID, query4h, qbtypes.Step{Duration: 60 * time.Second}, result4h)
	time.Sleep(10 * time.Millisecond)

	t.Run("exact_window_match", func(t *testing.T) {
		// Query the same 4-hour window - should hit window cache
		cached, missing := bc.GetMissRanges(ctx, orgID, query4h, qbtypes.Step{Duration: 60 * time.Second})

		assert.NotNil(t, cached)
		assert.Len(t, missing, 0, "Should have no missing ranges for exact window match")

		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)

		// Should have all 4 values
		assert.Len(t, tsData.Aggregations[0].Series[0].Values, 4)
		// Should preserve histogram bucket boundaries
		assert.Equal(t, []float64{0, 100, 500, 1000, 2000, 5000}, tsData.Aggregations[0].Series[0].Bounds)
	})

	t.Run("zoom_in_2_hours", func(t *testing.T) {
		// Query a 2-hour window within the cached 4-hour range (zoom in)
		query2h := &mockQuery{
			fingerprint: "test-heatmap",
			startMs:     1000000 + (1 * 60 * 60 * 1000), // Start at 1 hour
			endMs:       1000000 + (3 * 60 * 60 * 1000), // End at 3 hours (2-hour window)
			kind:        qbtypes.RequestTypeHeatmap,
		}

		cached, _ := bc.GetMissRanges(ctx, orgID, query2h, qbtypes.Step{Duration: 60 * time.Second})

		assert.NotNil(t, cached, "Should have cached data from partial hit")
		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)

		series := tsData.Aggregations[0].Series[0]

		// Should have only 2 values (filtered to 2-hour window)
		assert.Len(t, series.Values, 2, "Should have 2 values for 2-hour window")
		assert.Equal(t, int64(1000000+(1*60*60*1000)), series.Values[0].Timestamp)
		assert.Equal(t, float64(20), series.Values[0].Value)
		assert.Equal(t, int64(1000000+(2*60*60*1000)), series.Values[1].Timestamp)
		assert.Equal(t, float64(30), series.Values[1].Value)

		// Should preserve the same histogram bucket boundaries from 4-hour query
		assert.Equal(t, []float64{0, 100, 500, 1000, 2000, 5000}, series.Bounds,
			"Should preserve histogram bucket boundaries from original query")
	})

	t.Run("zoom_in_1_hour", func(t *testing.T) {
		// Query a 1-hour window within the cached 4-hour range
		query1h := &mockQuery{
			fingerprint: "test-heatmap",
			startMs:     1000000 + (2 * 60 * 60 * 1000), // Start at 2 hours
			endMs:       1000000 + (3 * 60 * 60 * 1000), // End at 3 hours (1-hour window)
			kind:        qbtypes.RequestTypeHeatmap,
		}

		cached, _ := bc.GetMissRanges(ctx, orgID, query1h, qbtypes.Step{Duration: 60 * time.Second})

		assert.NotNil(t, cached)
		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)

		series := tsData.Aggregations[0].Series[0]

		// Should have only 1 value (filtered to 1-hour window)
		assert.Len(t, series.Values, 1)
		assert.Equal(t, int64(1000000+(2*60*60*1000)), series.Values[0].Timestamp)
		assert.Equal(t, float64(30), series.Values[0].Value)

		// Should preserve histogram bucket boundaries
		assert.Equal(t, []float64{0, 100, 500, 1000, 2000, 5000}, series.Bounds)
	})

	t.Run("partial_overlap", func(t *testing.T) {
		// Query a range that partially overlaps with cached data
		queryPartial := &mockQuery{
			fingerprint: "test-heatmap",
			startMs:     1000000 + (3 * 60 * 60 * 1000),                        // Start at 3 hours
			endMs:       1000000 + (3 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000), // End at 5 hours (extends beyond cache)
			kind:        qbtypes.RequestTypeHeatmap,
		}

		cached, missing := bc.GetMissRanges(ctx, orgID, queryPartial, qbtypes.Step{Duration: 60 * time.Second})

		// Should get partial cache hit for the overlapping part
		assert.NotNil(t, cached)
		assert.True(t, len(missing) >= 1, "Should have at least one missing range for data beyond cached range")

		// The last missing range should be for data beyond the cached 4-hour window
		lastMissing := missing[len(missing)-1]
		t.Logf("Last missing range: From=%d, To=%d", lastMissing.From, lastMissing.To)
		assert.True(t, lastMissing.To > 1000000+(4*60*60*1000), "Last missing range should extend beyond 4-hour cache")

		tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 1)

		series := tsData.Aggregations[0].Series[0]

		// Should have 1 value from cached data (at 3 hours)
		assert.Len(t, series.Values, 1)
		assert.Equal(t, int64(1000000+(3*60*60*1000)), series.Values[0].Timestamp)
	})
}

// TestBucketCache_HeatmapWindowCachePriority tests that window cache is checked first
func TestBucketCache_HeatmapWindowCachePriority(t *testing.T) {
	config := cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	}
	memCache, err := cachetest.New(config)
	require.NoError(t, err)

	bc := NewBucketCache(
		instrumentationtest.New().ToProviderSettings(),
		memCache,
		1*time.Hour,
		5*time.Minute,
		5*time.Minute,
	)

	ctx := context.Background()
	orgID := valuer.UUID{}

	// Create a "last 1 hour" query (common pattern)
	currentMs := uint64(time.Now().UnixMilli())
	query1h := &mockQuery{
		fingerprint: "test-heatmap-last-1h",
		startMs:     currentMs - (60 * 60 * 1000), // 1 hour ago
		endMs:       currentMs,
		kind:        qbtypes.RequestTypeHeatmap,
	}

	heatmapData := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{
			{
				Index: 0,
				Series: []*qbtypes.TimeSeries{
					{
						Bounds: []float64{0, 100, 500, 1000},
						Values: []*qbtypes.TimeSeriesValue{
							{Timestamp: int64(currentMs - (30 * 60 * 1000)), Value: 10},
						},
					},
				},
			},
		},
	}

	result := &qbtypes.Result{
		Type:  qbtypes.RequestTypeHeatmap,
		Value: heatmapData,
	}

	// Cache the result
	bc.Put(ctx, orgID, query1h, qbtypes.Step{Duration: 60 * time.Second}, result)
	time.Sleep(10 * time.Millisecond)

	// Query again with the same "last 1 hour" pattern (rounded to same window)
	query1hAgain := &mockQuery{
		fingerprint: "test-heatmap-last-1h",
		startMs:     currentMs - (60 * 60 * 1000),
		endMs:       currentMs,
		kind:        qbtypes.RequestTypeHeatmap,
	}

	cached, missing := bc.GetMissRanges(ctx, orgID, query1hAgain, qbtypes.Step{Duration: 60 * time.Second})

	// Should hit window cache (exact match)
	assert.NotNil(t, cached)
	assert.Len(t, missing, 0, "Should have no missing ranges for window cache hit")

	tsData, ok := cached.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	assert.Len(t, tsData.Aggregations[0].Series[0].Values, 1)
}
