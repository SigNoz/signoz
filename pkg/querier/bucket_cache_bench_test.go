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

const benchStepMs = uint64(1000)

func benchStep() qbtypes.Step { return qbtypes.Step{Duration: time.Second} }

func benchRequest(fingerprint string, startMs, endMs uint64) CacheRequest {
	return CacheRequest{Key: CacheKey(fingerprint), Window: qbtypes.TimeRange{From: startMs, To: endMs}, Step: benchStep(), Kind: qbtypes.RequestTypeTimeSeries}
}

func BenchmarkBucketCache_GetMissRanges(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	for i := 0; i < 10; i++ {
		req := benchRequest(fmt.Sprintf("bench-query-%d", i), uint64(i*10000), uint64((i+1)*10000))
		bc.Put(ctx, orgID, req, req.Window, createBenchmarkResult(req.Window.From, req.Window.To))
	}

	requests := []struct {
		name string
		req  CacheRequest
	}{
		{name: "full_cache_hit", req: benchRequest("bench-query-5", 50000, 60000)},
		{name: "full_cache_miss", req: benchRequest("bench-query-new", 100000, 110000)},
		{name: "partial_cache_hit", req: benchRequest("bench-query-5", 45000, 65000)},
	}

	for _, tc := range requests {
		b.Run(tc.name, func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				cached, missing := bc.GetMissRanges(ctx, orgID, tc.req)
				_ = cached
				_ = missing
			}
		})
	}
}

func BenchmarkBucketCache_Put(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	testCases := []struct {
		name      string
		numSeries int
		numValues int
	}{
		{"small_result_1_series_100_values", 1, 100},
		{"medium_result_10_series_100_values", 10, 100},
		{"large_result_100_series_100_values", 100, 100},
		{"huge_result_1000_series_100_values", 1000, 100},
		{"many_values_10_series_1000_values", 10, 1000},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			req := benchRequest("bench-put-"+tc.name, 0, uint64(tc.numValues)*benchStepMs)
			result := createBenchmarkResultWithSeries(req.Window.From, req.Window.To, tc.numSeries, tc.numValues)

			b.ResetTimer()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				bc.Put(ctx, orgID, req, req.Window, result)
			}
		})
	}
}

// BenchmarkBucketCache_SlidingRefresh is the dashboard pattern: every refresh
// moves the window one step and writes the new step back.
func BenchmarkBucketCache_SlidingRefresh(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}
	window := uint64(3600) * benchStepMs

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		start := uint64(i) * benchStepMs
		req := benchRequest("bench-sliding", start, start+window)
		cached, missing := bc.GetMissRanges(ctx, orgID, req)
		_ = cached
		for _, gap := range missing {
			bc.Put(ctx, orgID, req, gap, createBenchmarkResult(gap.From, gap.To))
		}
	}
}

func BenchmarkMergeTimeSeriesData(b *testing.B) {
	testCases := []struct {
		name      string
		numParts  int
		numSeries int
		numValues int
	}{
		{"small_2_parts_10_series", 2, 10, 100},
		{"medium_5_parts_50_series", 5, 50, 100},
		{"large_10_parts_100_series", 10, 100, 100},
		{"many_parts_20_parts_50_series", 20, 50, 100},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			parts := make([]*qbtypes.TimeSeriesData, tc.numParts)
			for i := range parts {
				startMs := uint64(i) * uint64(tc.numValues) * benchStepMs
				parts[i] = createBenchmarkResultWithSeries(startMs, startMs+uint64(tc.numValues)*benchStepMs, tc.numSeries, tc.numValues).Value.(*qbtypes.TimeSeriesData)
			}

			b.ResetTimer()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				_ = mergeTimeSeriesData(parts)
			}
		})
	}
}

func BenchmarkBucketCache_Decode(b *testing.B) {
	bc := createBenchmarkBucketCache(b).(*bucketCache)
	testCases := []struct {
		name       string
		numBuckets int
		numSeries  int
	}{
		{"1_bucket_10_series", 1, 10},
		{"5_buckets_50_series", 5, 50},
		{"20_buckets_100_series", 20, 100},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			buckets := make([]*qbtypes.CachedBucket, tc.numBuckets)
			for i := range buckets {
				startMs := uint64(i * 10000)
				result := createBenchmarkResultWithSeries(startMs, startMs+10000, tc.numSeries, 10)
				value, err := json.Marshal(result.Value)
				require.NoError(b, err)
				buckets[i] = &qbtypes.CachedBucket{StartMs: startMs, EndMs: startMs + 10000, Type: qbtypes.RequestTypeTimeSeries, Value: value}
			}

			b.ResetTimer()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				_ = bc.decode(context.Background(), buckets)
			}
		})
	}
}

func BenchmarkGetUniqueSeriesKey(b *testing.B) {
	for _, numLabels := range []int{1, 5, 10, 20, 50} {
		b.Run(fmt.Sprintf("%d_labels", numLabels), func(b *testing.B) {
			labels := make([]*qbtypes.Label, numLabels)
			for i := range labels {
				labels[i] = &qbtypes.Label{
					Key:   telemetrytypes.TelemetryFieldKey{Name: fmt.Sprintf("label_%d", i), FieldDataType: telemetrytypes.FieldDataTypeString},
					Value: fmt.Sprintf("value_%d", i),
				}
			}

			b.ResetTimer()
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				_ = qbtypes.GetUniqueSeriesKey(labels)
			}
		})
	}
}

func BenchmarkBucketCache_ConcurrentOperations(b *testing.B) {
	bc := createBenchmarkBucketCache(b)
	ctx := context.Background()
	orgID := valuer.UUID{}

	for i := 0; i < 100; i++ {
		req := benchRequest(fmt.Sprintf("concurrent-query-%d", i), uint64(i*10000), uint64((i+1)*10000))
		bc.Put(ctx, orgID, req, req.Window, createBenchmarkResult(req.Window.From, req.Window.To))
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			switch i % 3 {
			case 0:
				req := benchRequest(fmt.Sprintf("concurrent-query-%d", i%100), uint64((i%100)*10000), uint64(((i%100)+1)*10000))
				cached, missing := bc.GetMissRanges(ctx, orgID, req)
				_ = cached
				_ = missing
			case 1:
				req := benchRequest(fmt.Sprintf("concurrent-query-new-%d", i), uint64(i*10000), uint64((i+1)*10000))
				bc.Put(ctx, orgID, req, req.Window, createBenchmarkResult(req.Window.From, req.Window.To))
			case 2:
				req := benchRequest(fmt.Sprintf("concurrent-query-%d", i%100), uint64((i%100)*10000+5000), uint64(((i%100)+1)*10000+5000))
				cached, missing := bc.GetMissRanges(ctx, orgID, req)
				_ = cached
				_ = missing
			}
			i++
		}
	})
}

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

func createBenchmarkResult(startMs, endMs uint64) *qbtypes.Result {
	return createBenchmarkResultWithSeries(startMs, endMs, 10, int((endMs-startMs)/benchStepMs))
}

// createBenchmarkResultWithSeries spreads numValuesPerSeries points over
// [startMs, endMs) on the step grid.
func createBenchmarkResultWithSeries(startMs, endMs uint64, numSeries, numValuesPerSeries int) *qbtypes.Result {
	series := make([]*qbtypes.TimeSeries, numSeries)
	valueStep := max((endMs-startMs)/uint64(max(numValuesPerSeries, 1)), benchStepMs)
	valueStep -= valueStep % benchStepMs

	for i := 0; i < numSeries; i++ {
		ts := &qbtypes.TimeSeries{
			Labels: []*qbtypes.Label{
				{Key: telemetrytypes.TelemetryFieldKey{Name: "host", FieldDataType: telemetrytypes.FieldDataTypeString}, Value: fmt.Sprintf("server-%d", i)},
				{Key: telemetrytypes.TelemetryFieldKey{Name: "service", FieldDataType: telemetrytypes.FieldDataTypeString}, Value: fmt.Sprintf("service-%d", i%5)},
			},
			Values: make([]*qbtypes.TimeSeriesValue, 0, numValuesPerSeries),
		}
		for j := 0; j < numValuesPerSeries; j++ {
			timestamp := startMs + uint64(j)*valueStep
			if timestamp+benchStepMs > endMs {
				break
			}
			ts.Values = append(ts.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(timestamp), Value: float64(i*100 + j)})
		}
		series[i] = ts
	}

	return &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName:    "benchmark_query",
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Series: series}},
		},
		Stats: qbtypes.ExecStats{
			RowsScanned:  uint64(numSeries * numValuesPerSeries),
			BytesScanned: uint64(numSeries * numValuesPerSeries * 100),
			DurationMS:   10,
		},
	}
}
