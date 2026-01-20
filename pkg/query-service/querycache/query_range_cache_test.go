package querycache_test

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/querycache"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFindMissingTimeRanges(t *testing.T) {
	// Initialize the mock cache
	opts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)

	// Create a queryCache instance with the mock cache and a fluxInterval
	q := querycache.NewQueryCache(
		querycache.WithCache(c),
		querycache.WithFluxInterval(0), // Set to zero for testing purposes
	)

	// Define the test cases
	testCases := []struct {
		name           string
		requestedStart int64 // in milliseconds
		requestedEnd   int64 // in milliseconds
		step           int64 // in seconds
		cacheKey       string
		cachedData     []querycache.CachedSeriesData
		expectedMiss   []querycache.MissInterval
	}{
		{
			name:           "Cached time range is a subset of the requested time range",
			requestedStart: 1000,
			requestedEnd:   5000,
			step:           60,
			cacheKey:       "testKey1",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 2000,
					End:   3000,
					Data:  []*v3.Series{}, // Data can be empty for this test
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1000, End: 2000},
				{Start: 3000, End: 5000},
			},
		},
		{
			name:           "Cached time range is a superset of the requested time range",
			requestedStart: 2000,
			requestedEnd:   3000,
			step:           60,
			cacheKey:       "testKey2",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1000,
					End:   4000,
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: nil, // No missing intervals
		},
		{
			name:           "Cached time range is a left overlap of the requested time range",
			requestedStart: 2000,
			requestedEnd:   4000,
			step:           60,
			cacheKey:       "testKey3",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1000,
					End:   2500,
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 2500, End: 4000},
			},
		},
		{
			name:           "Cached time range is a right overlap of the requested time range",
			requestedStart: 2000,
			requestedEnd:   4000,
			step:           60,
			cacheKey:       "testKey4",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 3500,
					End:   5000,
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 2000, End: 3500},
			},
		},
		{
			name:           "Cached time range is disjoint from the requested time range",
			requestedStart: 2000,
			requestedEnd:   4000,
			step:           60,
			cacheKey:       "testKey5",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 5000,
					End:   6000,
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 2000, End: 4000},
			},
		},
		// Additional test cases for non-overlapping cached data
		{
			name:           "Multiple non-overlapping cached intervals within requested range",
			requestedStart: 1000,
			requestedEnd:   5000,
			step:           60,
			cacheKey:       "testKey6",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1100, End: 1200, Data: []*v3.Series{}},
				{Start: 1300, End: 1400, Data: []*v3.Series{}},
				{Start: 1500, End: 1600, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1000, End: 1100},
				{Start: 1200, End: 1300},
				{Start: 1400, End: 1500},
				{Start: 1600, End: 5000},
			},
		},
		{
			name:           "Cached intervals covering some parts with gaps",
			requestedStart: 1000,
			requestedEnd:   2000,
			step:           60,
			cacheKey:       "testKey7",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1000, End: 1100, Data: []*v3.Series{}},
				{Start: 1200, End: 1300, Data: []*v3.Series{}},
				{Start: 1400, End: 1500, Data: []*v3.Series{}},
				{Start: 1600, End: 1700, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1100, End: 1200},
				{Start: 1300, End: 1400},
				{Start: 1500, End: 1600},
				{Start: 1700, End: 2000},
			},
		},
		{
			name:           "Non-overlapping cached intervals outside requested range",
			requestedStart: 2000,
			requestedEnd:   3000,
			step:           60,
			cacheKey:       "testKey8",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1000, End: 1500, Data: []*v3.Series{}},
				{Start: 3500, End: 4000, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 2000, End: 3000},
			},
		},
		{
			name:           "No cached data at all",
			requestedStart: 1000,
			requestedEnd:   2000,
			step:           60,
			cacheKey:       "testKey10",
			cachedData:     nil,
			expectedMiss: []querycache.MissInterval{
				{Start: 1000, End: 2000},
			},
		},
		{
			name:           "Cached intervals with overlapping and non-overlapping mix",
			requestedStart: 1000,
			requestedEnd:   5000,
			step:           60,
			cacheKey:       "testKey11",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1000, End: 2000, Data: []*v3.Series{}},
				{Start: 1500, End: 2500, Data: []*v3.Series{}}, // Overlaps with previous
				{Start: 3000, End: 3500, Data: []*v3.Series{}},
				{Start: 4000, End: 4500, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 2500, End: 3000},
				{Start: 3500, End: 4000},
				{Start: 4500, End: 5000},
			},
		},
		{
			name:           "Cached intervals covering the edges but missing middle",
			requestedStart: 1000,
			requestedEnd:   5000,
			step:           60,
			cacheKey:       "testKey12",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1000, End: 1500, Data: []*v3.Series{}},
				{Start: 4500, End: 5000, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1500, End: 4500},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {

			// Store the cached data in the mock cache
			orgID := valuer.GenerateUUID()
			if len(tc.cachedData) > 0 {
				cacheableData := querycache.CacheableSeriesData{Series: tc.cachedData}
				err = c.Set(context.Background(), orgID, tc.cacheKey, &cacheableData, 0)
				assert.NoError(t, err)
			}

			// Call FindMissingTimeRanges
			missingRanges := q.FindMissingTimeRanges(orgID, tc.requestedStart, tc.requestedEnd, tc.step, tc.cacheKey)

			// Verify the missing ranges
			assert.Equal(t, tc.expectedMiss, missingRanges)
		})
	}
}

func TestFindMissingTimeRangesV2(t *testing.T) {
	// Initialize the mock cache
	opts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)

	// Create a queryCache instance with the mock cache and a fluxInterval
	q := querycache.NewQueryCache(
		querycache.WithCache(c),
		querycache.WithFluxInterval(0), // Set to zero for testing purposes
	)

	// Define the test cases
	testCases := []struct {
		name           string
		requestedStart int64 // in milliseconds
		requestedEnd   int64 // in milliseconds
		step           int64 // in seconds
		cacheKey       string
		cachedData     []querycache.CachedSeriesData
		expectedMiss   []querycache.MissInterval
	}{
		{
			name:           "Cached time range is a subset of the requested time range",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738836000000, // 06 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey1",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738576800000,  // 03 Feb 2025 10:00:00
					End:   1738749600000,  // 05 Feb 2025 10:00:00
					Data:  []*v3.Series{}, // Data can be empty for this test
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738404000000, End: 1738576800000}, // 01 Feb 2025 10:00:00 - 03 Feb 2025 10:00:00
				{Start: 1738749600000, End: 1738836000000}, // 05 Feb 2025 10:00:00 - 06 Feb 2025 10:00:00
			},
		},
		{
			name:           "Cached time range is a superset of the requested time range",
			requestedStart: 1738576800000, // 03 Feb 2025 10:00:00
			requestedEnd:   1738749600000, // 05 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey2",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738404000000, // 01 Feb 2025 10:00:00
					End:   1738836000000, // 06 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: nil,
		},
		{
			name:           "Cached time range is a left overlap of the requested time range",
			requestedStart: 1738576800000, // 03 Feb 2025 10:00:00
			requestedEnd:   1738836000000, // 06 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey3",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738404000000, // 01 Feb 2025 10:00:00
					End:   1738663200000, // 04 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738663200000, End: 1738836000000}, // 04 Feb 2025 10:00:00 - 06 Feb 2025 10:00:00
			},
		},
		{
			name:           "Cached time range is a right overlap of the requested time range",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738576800000, // 03 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey4",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738490400000, // 02 Feb 2025 10:00:00
					End:   1738663200000, // 04 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738404000000, End: 1738490400000}, // 01 Feb 2025 10:00:00 - 02 Feb 2025 10:00:00
			},
		},
		{
			name:           "Cached time range is disjoint from the requested time range",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738576800000, // 03 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey5",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738836000000, // 06 Feb 2025 10:00:00
					End:   1739008800000, // 08 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738404000000, End: 1738576800000}, // 01 Feb 2025 10:00:00 - 03 Feb 2025 10:00:00
			},
		},
		// Additional test cases for non-overlapping cached data
		{
			name:           "Multiple non-overlapping cached intervals within requested range",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738836000000, // 06 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey6",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738490400000, // 02 Feb 2025 10:00:00
					End:   1738576800000, // 03 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
				{
					Start: 1738663200000, // 04 Feb 2025 10:00:00
					End:   1738749600000, // 05 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
				{
					Start: 1738836000000, // 06 Feb 2025 10:00:00
					End:   1738922400000, // 07 Feb 2025 10:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738404000000, End: 1738490400000}, // 01 Feb 2025 10:00:00 - 02 Feb 2025 10:00:00
				{Start: 1738576800000, End: 1738663200000}, // 03 Feb 2025 10:00:00 - 04 Feb 2025 10:00:00
				{Start: 1738749600000, End: 1738836000000}, // 05 Feb 2025 10:00:00 - 06 Feb 2025 10:00:00
			},
		},
		{
			name:           "Cached intervals covering some parts with gaps",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738490400000, // 02 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey7",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738404000000, End: 1738418400000, Data: []*v3.Series{}}, // 01 Feb 2025 10:00:00 - 14:00:00
				{Start: 1738425600000, End: 1738432800000, Data: []*v3.Series{}}, // 01 Feb 2025 16:00:00 - 18:00:00
				{Start: 1738440000000, End: 1738447200000, Data: []*v3.Series{}}, // 01 Feb 2025 20:00:00 - 22:00:00
				{Start: 1738454400000, End: 1738461600000, Data: []*v3.Series{}}, // 02 Feb 2025 00:00:00 - 02:00:00
			},
			expectedMiss: []querycache.MissInterval{
				// {Start: 1738404000000, End: 1738404060000}, // 01 Feb 2025 10:00:00 - 10:01:00
				{Start: 1738418400000, End: 1738425600000}, // 01 Feb 2025 14:00:00 - 16:00:00
				{Start: 1738432800000, End: 1738440000000}, // 01 Feb 2025 18:00:00 - 20:00:00
				{Start: 1738447200000, End: 1738454400000}, // 01 Feb 2025 22:00:00 - 02 Feb 2025 00:00:00
				{Start: 1738461600000, End: 1738490400000}, // 02 Feb 2025 02:00:00 - 10:00:00
			},
		},
		{
			name:           "Non-overlapping cached intervals outside requested range",
			requestedStart: 1738490400000, // 02 Feb 2025 10:00:00
			requestedEnd:   1738576800000, // 03 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey8",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738404000000, End: 1738447200000, Data: []*v3.Series{}}, // 01 Feb 2025 10:00:00 - 22:00:00
				{Start: 1738620000000, End: 1738663200000, Data: []*v3.Series{}}, // 03 Feb 2025 22:00:00 - 04 Feb 2025 10:00:00
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738490400000, End: 1738576800000}, // 02 Feb 2025 10:00:00 - 03 Feb 2025 10:00:00
			},
		},
		{
			name:           "No cached data at all",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738490400000, // 02 Feb 2025 10:00:00
			step:           60,
			cacheKey:       "testKey10",
			cachedData:     nil,
			expectedMiss: []querycache.MissInterval{
				{Start: 1738404000000, End: 1738490400000}, // 01 Feb 2025 10:00:00 - 02 Feb 2025 10:00:00
			},
		},
		{
			name:           "Cached intervals with overlapping and non-overlapping mix",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738407600000, // 01 Feb 2025 11:00:00
			step:           60,
			cacheKey:       "testKey11",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738404000000, End: 1738405200000, Data: []*v3.Series{}}, // 01 Feb 2025 10:00:00 - 10:20:00
				{Start: 1738404600000, End: 1738405200000, Data: []*v3.Series{}}, // 01 Feb 2025 10:10:00 - 10:20:00
				{Start: 1738406100000, End: 1738406700000, Data: []*v3.Series{}}, // 01 Feb 2025 10:35:00 - 10:45:00
				{Start: 1738407000000, End: 1738407300000, Data: []*v3.Series{}}, // 01 Feb 2025 10:50:00 - 10:55:00
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738405200000, End: 1738406100000}, // 01 Feb 2025 10:20:00 - 10:35:00
				{Start: 1738406700000, End: 1738407000000}, // 01 Feb 2025 10:45:00 - 10:50:00
				{Start: 1738407300000, End: 1738407600000}, // 01 Feb 2025 10:55:00 - 11:00:00
			},
		},
		{
			name:           "Cached intervals covering the edges but missing middle",
			requestedStart: 1738404000000, // 01 Feb 2025 10:00:00
			requestedEnd:   1738407600000, // 01 Feb 2025 11:00:00
			step:           60,
			cacheKey:       "testKey12",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738404000000, End: 1738405200000, Data: []*v3.Series{}}, // 01 Feb 2025 10:00:00 - 10:20:00
				{Start: 1738406400000, End: 1738407600000, Data: []*v3.Series{}}, // 01 Feb 2025 10:40:00 - 11:00:00
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738405200000, End: 1738406400000}, // 01 Feb 2025 10:20:00 - 10:40:00
			},
		},
		{
			name:           "requested data is not one step/window",
			requestedStart: 1738576800000,
			requestedEnd:   1738576800001,
			step:           60,
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738576800000, End: 1738576860000, Data: []*v3.Series{}},
			},
			expectedMiss: []querycache.MissInterval{{Start: 1738576800000, End: 1738576800001}},
		},
		{
			name:           "requested data is exactly one step or aggregation window",
			requestedStart: 1738576800000,
			requestedEnd:   1738576860000,
			step:           60,
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{Start: 1738576800000, End: 1738576860000, Data: []*v3.Series{}},
			},
			expectedMiss: nil,
		},
		{
			name:           "start is between a cache aggregate interval and end outside of cache aggregate interval",
			requestedStart: 1738576800000, // 03 Feb 2025 10:00:00
			requestedEnd:   1738749600000, // 05 Feb 2025 10:00:00
			step:           86400,         // 24 hours
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738540800000, // 03 Feb 2025 00:00:00
					End:   1738713600000, // 05 Feb 2025 00:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738576800000, End: 1738627200000}, // 03 Feb 2025 10:00:00 - 04 Feb 2025 00:00:00
				{Start: 1738713600000, End: 1738749600000}, // 05 Feb 2025 00:00:00 - 05 Feb 2025 10:00:00
			},
		},
		{
			name:           "start is the start of aggregate interval and end is between two aggregate intervals",
			requestedStart: 1738540800000, // 03 Feb 2025 00:00:00
			requestedEnd:   1738749600000, // 05 Feb 2025 10:00:00
			step:           86400,         // 24 hours
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738540800000, // 03 Feb 2025 00:00:00
					End:   1738713600000, // 05 Feb 2025 00:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738713600000, End: 1738749600000}, // 05 Feb 2025 00:00:00 - 05 Feb 2025 10:00:00
			},
		},
		{
			name:           "1. start lies near the start of aggregation interval and end lies near the end of another aggregation interval",
			requestedStart: 1738541400000, // 03 Feb 2025 00:10:00
			requestedEnd:   1738713000000, // 04 Feb 2025 11:50:00
			step:           86400,         // 24 hours
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738540800000, // 03 Feb 2025 00:00:00
					End:   1738713600000, // 05 Feb 2025 00:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738541400000, End: 1738713000000}, // 03 Feb 2025 00:10:00 - 04 Feb 2025 11:50:00
			},
		},
		{
			name:           "2. start lies near the start of aggregation interval and end lies near the end of another aggregation interval",
			requestedStart: 1738411859000, // 01 Feb 2025 00:10:00
			requestedEnd:   1738713000000, // 04 Feb 2025 11:50:00
			step:           86400,         // 24 hours
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738540800000, // 03 Feb 2025 00:00:00
					End:   1738713600000, // 05 Feb 2025 00:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738411859000, End: 1738540800000}, // 01 Feb 2025 00:10:00 - 03 Feb 2025 00:00:00
				{Start: 1738627200000, End: 1738713000000}, // 04 Feb 2025 00:00:00 - 04 Feb 2025 11:50:00
			},
		},
		{
			name:           "start is before cache and end lies at the end of cache aggregation interval",
			requestedStart: 1738498255000, // 02 Feb 2025 12:10:00
			requestedEnd:   1738713600000, // 05 Feb 2025 00:00:00
			step:           86400,         // 24 hours
			cacheKey:       "testKey13",
			cachedData: []querycache.CachedSeriesData{
				{
					Start: 1738540800000, // 03 Feb 2025 00:00:00
					End:   1738713600000, // 05 Feb 2025 00:00:00
					Data:  []*v3.Series{},
				},
			},
			expectedMiss: []querycache.MissInterval{
				{Start: 1738498255000, End: 1738540800000}, // 03 Feb 2025 00:10:00 - 03 Feb 2025 00:00:00
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {

			orgID := valuer.GenerateUUID()
			// Store the cached data in the mock cache
			if len(tc.cachedData) > 0 {
				cacheableData := querycache.CacheableSeriesData{Series: tc.cachedData}
				err = c.Set(context.Background(), orgID, tc.cacheKey, &cacheableData, 0)
				assert.NoError(t, err)
			}

			// Call FindMissingTimeRanges
			missingRanges := q.FindMissingTimeRangesV2(orgID, tc.requestedStart, tc.requestedEnd, tc.step, tc.cacheKey)

			// Verify the missing ranges
			assert.Equal(t, tc.expectedMiss, missingRanges)
		})
	}
}

func TestMergeWithCachedSeriesData(t *testing.T) {
	// Initialize the mock cache
	opts := cache.Memory{
		NumCounters: 10 * 1000,
		MaxCost:     1 << 26,
	}
	c, err := cachetest.New(cache.Config{Provider: "memory", Memory: opts})
	require.NoError(t, err)

	// Create a queryCache instance with the mock cache and a fluxInterval
	q := querycache.NewQueryCache(
		querycache.WithCache(c),
		querycache.WithFluxInterval(0), // Set to zero for testing purposes
	)

	// Define test data
	cacheKey := "mergeTestKey"

	// Existing cached data
	existingData := []querycache.CachedSeriesData{
		{
			Start: 1000,
			End:   2000,
			Data: []*v3.Series{
				{
					Labels: map[string]string{"metric": "cpu", "instance": "localhost"},
					Points: []v3.Point{
						{Timestamp: 1500, Value: 0.5},
					},
				},
			},
		},
	}

	// New data to merge
	newData := []querycache.CachedSeriesData{
		{
			Start: 1500,
			End:   2500,
			Data: []*v3.Series{
				{
					Labels: map[string]string{"metric": "cpu", "instance": "localhost"},
					Points: []v3.Point{
						{Timestamp: 1750, Value: 0.6},
					},
				},
				{
					Labels: map[string]string{"metric": "memory", "instance": "localhost"},
					Points: []v3.Point{
						{Timestamp: 1800, Value: 0.7},
					},
				},
			},
		},
	}

	// Expected merged data
	expectedMergedData := []querycache.CachedSeriesData{
		{
			Start: 1000,
			End:   2500,
			Data: []*v3.Series{
				{
					Labels: map[string]string{"metric": "cpu", "instance": "localhost"},
					Points: []v3.Point{
						{Timestamp: 1500, Value: 0.5},
						{Timestamp: 1750, Value: 0.6},
					},
				},
				{
					Labels: map[string]string{"metric": "memory", "instance": "localhost"},
					Points: []v3.Point{
						{Timestamp: 1800, Value: 0.7},
					},
				},
			},
		},
	}

	// Store existing data in cache

	orgID := valuer.GenerateUUID()
	cacheableData := querycache.CacheableSeriesData{Series: existingData}
	err = c.Set(context.Background(), orgID, cacheKey, &cacheableData, 0)
	assert.NoError(t, err)

	// Call MergeWithCachedSeriesData
	mergedData := q.MergeWithCachedSeriesData(orgID, cacheKey, newData)

	// Verify the merged data
	assert.Equal(t, len(expectedMergedData), len(mergedData))
	for i, expected := range expectedMergedData {
		actual := mergedData[i]
		assert.Equal(t, expected.Start, actual.Start)
		assert.Equal(t, expected.End, actual.End)
		assert.Equal(t, len(expected.Data), len(actual.Data))
		for j, expectedSeries := range expected.Data {
			actualSeries := actual.Data[j]
			assert.Equal(t, expectedSeries.Labels, actualSeries.Labels)
			assert.Equal(t, len(expectedSeries.Points), len(actualSeries.Points))
			for k, expectedPoint := range expectedSeries.Points {
				actualPoint := actualSeries.Points[k]
				assert.Equal(t, expectedPoint.Timestamp, actualPoint.Timestamp)
				assert.Equal(t, expectedPoint.Value, actualPoint.Value)
			}
		}
	}
}
