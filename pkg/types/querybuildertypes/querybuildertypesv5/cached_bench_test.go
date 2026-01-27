package querybuildertypesv5

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func createBuckets_TimeSeries(numBuckets int) []*CachedBucket {
	buckets := make([]*CachedBucket, numBuckets)

	for i := 0; i < numBuckets; i++ {
		startMs := uint64(i * 10000)
		endMs := uint64((i + 1) * 10000)

		timeSeriesData := &TimeSeriesData{
			QueryName: "A",
			Aggregations: []*AggregationBucket{
				{
					Index: 0,
					Series: []*TimeSeries{
						{
							Labels: []*Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "test"},
							},
							Values: []*TimeSeriesValue{
								{Timestamp: 1672563720000, Value: 1, Partial: true}, // 12:02
								{Timestamp: 1672563900000, Value: 2},                // 12:05
								{Timestamp: 1672564200000, Value: 2.5},              // 12:10
								{Timestamp: 1672564500000, Value: 2.6},              // 12:15
								{Timestamp: 1672566600000, Value: 2.9},              // 12:50
								{Timestamp: 1672566900000, Value: 3},                // 12:55
								{Timestamp: 1672567080000, Value: 4, Partial: true}, // 12:58
							},
						},
					},
				},
			},
		}

		value, err := json.Marshal(timeSeriesData)
		if err != nil {
			panic(err)
		}

		buckets[i] = &CachedBucket{
			StartMs: startMs,
			EndMs:   endMs,
			Type:    RequestTypeTimeSeries,
			Value:   json.RawMessage(value),
			Stats: ExecStats{
				RowsScanned:  uint64(i * 500),
				BytesScanned: uint64(i * 10000),
				DurationMS:   uint64(i * 1000),
			},
		}
	}

	return buckets
}

func BenchmarkCachedData_JSONMarshal_10kbuckets(b *testing.B) {
	buckets := createBuckets_TimeSeries(10000)
	data := &CachedData{Buckets: buckets}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_, err := json.Marshal(data)
		assert.NoError(b, err)
	}
}

func BenchmarkCachedData_Clone_10kbuckets(b *testing.B) {
	buckets := createBuckets_TimeSeries(10000)
	data := &CachedData{Buckets: buckets}

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		_ = data.Clone()
	}
}
