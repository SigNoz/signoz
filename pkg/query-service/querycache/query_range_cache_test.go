package querycache_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.signoz.io/signoz/pkg/query-service/cache/inmemory"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/querycache"
)

func TestFindMissingTimeRanges(t *testing.T) {
	// Initialize the mock cache
	mockCache := inmemory.New(&inmemory.Options{TTL: 5 * time.Minute, CleanupInterval: 10 * time.Minute})

	// Create a queryCache instance with the mock cache and a fluxInterval
	q := querycache.NewQueryCache(
		querycache.WithCache(mockCache),
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
			if len(tc.cachedData) > 0 {
				cachedDataJSON, err := json.Marshal(tc.cachedData)
				assert.NoError(t, err)
				err = mockCache.Store(tc.cacheKey, cachedDataJSON, 0)
				assert.NoError(t, err)
			}

			// Call FindMissingTimeRanges
			missingRanges := q.FindMissingTimeRanges(tc.requestedStart, tc.requestedEnd, tc.step, tc.cacheKey)

			// Verify the missing ranges
			assert.Equal(t, tc.expectedMiss, missingRanges)
		})
	}
}

func TestMergeWithCachedSeriesData(t *testing.T) {
	// Initialize the mock cache
	mockCache := inmemory.New(&inmemory.Options{TTL: 5 * time.Minute, CleanupInterval: 10 * time.Minute})

	// Create a queryCache instance with the mock cache and a fluxInterval
	q := querycache.NewQueryCache(
		querycache.WithCache(mockCache),
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
	cachedDataJSON, err := json.Marshal(existingData)
	assert.NoError(t, err)
	err = mockCache.Store(cacheKey, cachedDataJSON, 0)
	assert.NoError(t, err)

	// Call MergeWithCachedSeriesData
	mergedData := q.MergeWithCachedSeriesData(cacheKey, newData)

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
