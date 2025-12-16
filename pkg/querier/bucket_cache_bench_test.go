package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// BenchmarkBucketCache_GetMissRanges benchmarks the GetMissRanges operation
func BenchmarkBucketCache_GetMissRanges(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Pre-populate cache with some data
	for i := 0; i < 10; i++ {
		query := &mockQuery{
			fingerprint: fmt.Sprintf("bench-query-%d", i),
			startMs:     uint64(i * 10000),
			endMs:       uint64((i + 1) * 10000),
		}
		result := createBenchmarkResult(query.startMs, query.endMs, 1000)
		bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	}

	// Create test queries with varying cache hit patterns
	queries := []struct {
		name  string
		query *mockQuery
	}{
		{
			name: "full_cache_hit",
			query: &mockQuery{
				fingerprint: "bench-query-5",
				startMs:     50000,
				endMs:       60000,
			},
		},
		{
			name: "full_cache_miss",
			query: &mockQuery{
				fingerprint: "bench-query-new",
				startMs:     100000,
				endMs:       110000,
			},
		},
		{
			name: "partial_cache_hit",
			query: &mockQuery{
				fingerprint: "bench-query-5",
				startMs:     45000,
				endMs:       65000,
			},
		},
	}

	for _, tc := range queries {
		b.Run(tc.name, func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				cached, missing := bc.GetMissRanges(ctx, orgID, tc.query, qbtypes.Step{Duration: 1000 * time.Millisecond})
				_ = cached
				_ = missing
			}
		})
	}
}

// BenchmarkBucketCache_Put benchmarks the Put operation
func BenchmarkBucketCache_Put(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	testCases := []struct {
		name       string
		numSeries  int
		numValues  int
		numQueries int
	}{
		{"small_result_1_series_100_values", 1, 100, 1},
		{"medium_result_10_series_100_values", 10, 100, 1},
		{"large_result_100_series_100_values", 100, 100, 1},
		{"huge_result_1000_series_100_values", 1000, 100, 1},
		{"many_values_10_series_1000_values", 10, 1000, 1},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			// Create test data
			queries := make([]*mockQuery, tc.numQueries)
			results := make([]*qbtypes.Result, tc.numQueries)

			for i := 0; i < tc.numQueries; i++ {
				queries[i] = &mockQuery{
					fingerprint: fmt.Sprintf("bench-put-query-%d", i),
					startMs:     uint64(i * 100000),
					endMs:       uint64((i + 1) * 100000),
				}
				results[i] = createBenchmarkResultWithSeries(
					queries[i].startMs,
					queries[i].endMs,
					1000,
					tc.numSeries,
					tc.numValues,
				)
			}

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				for j := 0; j < tc.numQueries; j++ {
					bc.Put(ctx, orgID, queries[j], qbtypes.Step{Duration: 1000 * time.Millisecond}, results[j])
				}
			}
		})
	}
}

// BenchmarkBucketCache_MergeTimeSeriesValues benchmarks merging of time series data
func BenchmarkBucketCache_MergeTimeSeriesValues(b *testing.B) {
	bc := createBenchmarkBucketCache(b).(*bucketCache)

	testCases := []struct {
		name       string
		numBuckets int
		numSeries  int
		numValues  int
	}{
		{"small_2_buckets_10_series", 2, 10, 100},
		{"medium_5_buckets_50_series", 5, 50, 100},
		{"large_10_buckets_100_series", 10, 100, 100},
		{"many_buckets_20_buckets_50_series", 20, 50, 100},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			// Create test buckets
			buckets := make([]*cachedBucket, tc.numBuckets)
			for i := 0; i < tc.numBuckets; i++ {
				startMs := uint64(i * 10000)
				endMs := uint64((i + 1) * 10000)
				result := createBenchmarkResultWithSeries(startMs, endMs, 1000, tc.numSeries, tc.numValues)

				valueBytes, _ := json.Marshal(result.Value)
				buckets[i] = &cachedBucket{
					StartMs: startMs,
					EndMs:   endMs,
					Type:    qbtypes.RequestTypeTimeSeries,
					Value:   valueBytes,
					Stats:   result.Stats,
				}
			}

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				result := bc.mergeTimeSeriesValues(context.Background(), buckets)
				_ = result
			}
		})
	}
}

// BenchmarkBucketCache_FindMissingRangesWithStep benchmarks finding missing ranges
func BenchmarkBucketCache_FindMissingRangesWithStep(b *testing.B) {
	bc := createBenchmarkBucketCache(b).(*bucketCache)

	testCases := []struct {
		name       string
		numBuckets int
		gapPattern string // "none", "uniform", "random"
	}{
		{"no_gaps_10_buckets", 10, "none"},
		{"uniform_gaps_10_buckets", 10, "uniform"},
		{"random_gaps_20_buckets", 20, "random"},
		{"many_buckets_100", 100, "uniform"},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			// Create test buckets based on pattern
			buckets := createBucketsWithPattern(tc.numBuckets, tc.gapPattern)
			startMs := uint64(0)
			endMs := uint64(tc.numBuckets * 20000)
			stepMs := uint64(1000)

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				missing := bc.findMissingRangesWithStep(buckets, startMs, endMs, stepMs)
				_ = missing
			}
		})
	}
}

// BenchmarkGetUniqueSeriesKey benchmarks the series key generation
func BenchmarkGetUniqueSeriesKey(b *testing.B) {
	testCases := []struct {
		name      string
		numLabels int
	}{
		{"1_label", 1},
		{"5_labels", 5},
		{"10_labels", 10},
		{"20_labels", 20},
		{"50_labels", 50},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			labels := make([]*qbtypes.Label, tc.numLabels)
			for i := 0; i < tc.numLabels; i++ {
				labels[i] = &qbtypes.Label{
					Key: telemetrytypes.TelemetryFieldKey{
						Name:          fmt.Sprintf("label_%d", i),
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					Value: fmt.Sprintf("value_%d", i),
				}
			}

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				key := qbtypes.GetUniqueSeriesKey(labels)
				_ = key
			}
		})
	}
}

// BenchmarkBucketCache_ConcurrentOperations benchmarks concurrent cache operations
func BenchmarkBucketCache_ConcurrentOperations(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	// Pre-populate cache
	for i := 0; i < 100; i++ {
		query := &mockQuery{
			fingerprint: fmt.Sprintf("concurrent-query-%d", i),
			startMs:     uint64(i * 10000),
			endMs:       uint64((i + 1) * 10000),
		}
		result := createBenchmarkResult(query.startMs, query.endMs, 1000)
		bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			// Mix of operations
			switch i % 3 {
			case 0: // Read
				query := &mockQuery{
					fingerprint: fmt.Sprintf("concurrent-query-%d", i%100),
					startMs:     uint64((i % 100) * 10000),
					endMs:       uint64(((i % 100) + 1) * 10000),
				}
				cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
				_ = cached
				_ = missing
			case 1: // Write
				query := &mockQuery{
					fingerprint: fmt.Sprintf("concurrent-query-new-%d", i),
					startMs:     uint64(i * 10000),
					endMs:       uint64((i + 1) * 10000),
				}
				result := createBenchmarkResult(query.startMs, query.endMs, 1000)
				bc.Put(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond}, result)
			case 2: // Partial read
				query := &mockQuery{
					fingerprint: fmt.Sprintf("concurrent-query-%d", i%100),
					startMs:     uint64((i%100)*10000 - 5000),
					endMs:       uint64(((i%100)+1)*10000 + 5000),
				}
				cached, missing := bc.GetMissRanges(ctx, orgID, query, qbtypes.Step{Duration: 1000 * time.Millisecond})
				_ = cached
				_ = missing
			}
			i++
		}
	})
}

// BenchmarkBucketCache_FilterResultToTimeRange benchmarks filtering results to time range
func BenchmarkBucketCache_FilterResultToTimeRange(b *testing.B) {
	bc := createBenchmarkBucketCache(b).(*bucketCache)

	testCases := []struct {
		name      string
		numSeries int
		numValues int
	}{
		{"small_10_series_100_values", 10, 100},
		{"medium_50_series_500_values", 50, 500},
		{"large_100_series_1000_values", 100, 1000},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			// Create a large result
			result := createBenchmarkResultWithSeries(0, 100000, 1000, tc.numSeries, tc.numValues)

			// Filter to middle 50%
			startMs := uint64(25000)
			endMs := uint64(75000)

			b.ResetTimer()
			b.ReportAllocs()

			for i := 0; i < b.N; i++ {
				filtered := bc.filterResultToTimeRange(result, startMs, endMs)
				_ = filtered
			}
		})
	}
}

// Helper function to create benchmark bucket cache
func createBenchmarkBucketCache(tb testing.TB) BucketCache {
	config := cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	}
	memCache, err := cachetest.New(config)
	require.NoError(tb, err)
	return NewBucketCache(instrumentationtest.New().ToProviderSettings(), memCache, time.Hour, 5*time.Minute)
}

// Helper function to create benchmark result
func createBenchmarkResult(startMs, endMs uint64, step uint64) *qbtypes.Result {
	return createBenchmarkResultWithSeries(startMs, endMs, step, 10, 100)
}

// Helper function to create benchmark result with specific series and values
func createBenchmarkResultWithSeries(startMs, endMs uint64, _ uint64, numSeries, numValuesPerSeries int) *qbtypes.Result {
	series := make([]*qbtypes.TimeSeries, numSeries)

	for i := 0; i < numSeries; i++ {
		ts := &qbtypes.TimeSeries{
			Labels: []*qbtypes.Label{
				{
					Key: telemetrytypes.TelemetryFieldKey{
						Name:          "host",
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					Value: fmt.Sprintf("server-%d", i),
				},
				{
					Key: telemetrytypes.TelemetryFieldKey{
						Name:          "service",
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					Value: fmt.Sprintf("service-%d", i%5),
				},
			},
			Values: make([]*qbtypes.TimeSeriesValue, 0, numValuesPerSeries),
		}

		// Generate values
		valueStep := (endMs - startMs) / uint64(numValuesPerSeries)
		if valueStep == 0 {
			valueStep = 1
		}

		for j := 0; j < numValuesPerSeries; j++ {
			timestamp := int64(startMs + uint64(j)*valueStep)
			if timestamp < int64(endMs) {
				ts.Values = append(ts.Values, &qbtypes.TimeSeriesValue{
					Timestamp: timestamp,
					Value:     float64(i*100 + j),
				})
			}
		}

		series[i] = ts
	}

	return &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "benchmark_query",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Index:  0,
					Series: series,
				},
			},
		},
		Stats: qbtypes.ExecStats{
			RowsScanned:  uint64(numSeries * numValuesPerSeries),
			BytesScanned: uint64(numSeries * numValuesPerSeries * 100),
			DurationMS:   10,
		},
	}
}

// Helper function to create buckets with specific gap patterns
func createBucketsWithPattern(numBuckets int, pattern string) []*cachedBucket {
	buckets := make([]*cachedBucket, 0, numBuckets)

	for i := 0; i < numBuckets; i++ {
		// Skip some buckets based on pattern
		if pattern == "uniform" && i%3 == 0 {
			continue // Create gaps every 3rd bucket
		}
		if pattern == "random" && i%7 < 2 {
			continue // Create random gaps
		}

		startMs := uint64(i * 10000)
		endMs := uint64((i + 1) * 10000)

		buckets = append(buckets, &cachedBucket{
			StartMs: startMs,
			EndMs:   endMs,
			Type:    qbtypes.RequestTypeTimeSeries,
			Value:   json.RawMessage(`{}`),
			Stats:   qbtypes.ExecStats{},
		})
	}

	return buckets
}
