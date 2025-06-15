package querier

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBucketCacheStepAlignment(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.UUID{}
	cache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), cache, time.Hour, 5*time.Minute)

	// Test with 5-minute step
	step := qbtypes.Step{Duration: 5 * time.Minute}

	// Query from 12:02 to 12:58 (both unaligned)
	// Complete intervals: 12:05 to 12:55
	query := &mockQuery{
		fingerprint: "test-step-alignment",
		startMs:     1672563720000, // 12:02
		endMs:       1672567080000, // 12:58
	}

	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName: "test",
			Aggregations: []*qbtypes.AggregationBucket{
				{
					Index: 0,
					Series: []*qbtypes.TimeSeries{
						{
							Labels: []*qbtypes.Label{
								{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "test"},
							},
							Values: []*qbtypes.TimeSeriesValue{
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
		},
	}

	// Put result in cache
	bc.Put(ctx, orgID, query, step, result)

	// Get cached data
	cached, missing := bc.GetMissRanges(ctx, orgID, query, step)

	// Should have cached data
	require.NotNil(t, cached)

	// Log the missing ranges to debug
	t.Logf("Missing ranges: %v", missing)
	for i, r := range missing {
		t.Logf("Missing range %d: From=%d, To=%d", i, r.From, r.To)
	}

	// Should have 2 missing ranges for partial intervals
	require.Len(t, missing, 2)

	// First partial: 12:02 to 12:05
	assert.Equal(t, uint64(1672563720000), missing[0].From)
	assert.Equal(t, uint64(1672563900000), missing[0].To)

	// Second partial: 12:55 to 12:58
	assert.Equal(t, uint64(1672566900000), missing[1].From, "Second missing range From")
	assert.Equal(t, uint64(1672567080000), missing[1].To, "Second missing range To")
}

func TestBucketCacheNoStepInterval(t *testing.T) {
	ctx := context.Background()
	orgID := valuer.UUID{}
	cache := createTestCache(t)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), cache, time.Hour, 5*time.Minute)

	// Test with no step (stepMs = 0)
	step := qbtypes.Step{Duration: 0}

	query := &mockQuery{
		fingerprint: "test-no-step",
		startMs:     1672563720000,
		endMs:       1672567080000,
	}

	result := &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			QueryName:    "test",
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Series: []*qbtypes.TimeSeries{}}},
		},
	}

	// Should cache the entire range when step is 0
	bc.Put(ctx, orgID, query, step, result)

	cached, missing := bc.GetMissRanges(ctx, orgID, query, step)
	assert.NotNil(t, cached)
	assert.Len(t, missing, 0)
}
