package metricsexplorer

import (
	"encoding/json"
	"sort"

	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.uber.org/zap"
)

type MetricsExplorerCache struct {
	cache cache.Cache
}

type CachedSeriesData struct {
	Start int64       `json:"start"`
	End   int64       `json:"end"`
	Data  interface{} `json:"data"`
}

type MetricsExplorerCacheOption func(c *MetricsExplorerCache)

type MissInterval struct {
	Start, End int64 // in milliseconds
}

func NewExplorerCache(opts ...MetricsExplorerCacheOption) *MetricsExplorerCache {
	c := &MetricsExplorerCache{}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

func WithCache(cache cache.Cache) MetricsExplorerCacheOption {
	return func(c *MetricsExplorerCache) {
		c.cache = cache
	}
}

func (c *MetricsExplorerCache) FindMissingTimeRanges(start, end int64, cacheKey string) []MissInterval {
	if c.cache == nil || cacheKey == "" {
		return []MissInterval{{Start: start, End: end}}
	}

	cachedSeriesDataList := c.getCachedSeriesData(cacheKey)

	// Sort the cached data by start time
	sort.Slice(cachedSeriesDataList, func(i, j int) bool {
		return cachedSeriesDataList[i].Start < cachedSeriesDataList[j].Start
	})

	zap.L().Info("Number of non-overlapping cached series data", zap.Int("count", len(cachedSeriesDataList)))

	var missingRanges []MissInterval
	currentTime := start

	for _, data := range cachedSeriesDataList {
		// Ignore cached data that ends before the start time
		if data.End <= start {
			continue
		}
		// Stop processing if we've reached the end time
		if data.Start >= end {
			break
		}

		// Add missing range if there's a gap
		if currentTime < data.Start {
			missingRanges = append(missingRanges, MissInterval{Start: currentTime, End: min(data.Start, end)})
		}

		// Update currentTime, but don't go past the end time
		currentTime = max(currentTime, min(data.End, end))
	}

	// Add final missing range if necessary
	if currentTime < end {
		missingRanges = append(missingRanges, MissInterval{Start: currentTime, End: end})
	}

	return missingRanges
}

func (c *MetricsExplorerCache) getCachedSeriesData(cacheKey string) []*CachedSeriesData {
	cachedData, _, _ := c.cache.Retrieve(cacheKey, true)
	var cachedSeriesDataList []*CachedSeriesData
	if err := json.Unmarshal(cachedData, &cachedSeriesDataList); err != nil {
		return nil
	}
	return cachedSeriesDataList
}

func (c *MetricsExplorerCache) storeMergedData(cacheKey string, mergedData []CachedSeriesData) {
	mergedDataJSON, err := json.Marshal(mergedData)
	if err != nil {
		zap.L().Error("error marshalling merged data", zap.Error(err))
		return
	}
	err = c.cache.Store(cacheKey, mergedDataJSON, 0)
	if err != nil {
		zap.L().Error("error storing merged data", zap.Error(err))
	}
}

func (c *MetricsExplorerCache) MergeWithCachedSeriesData(cacheKey string, newData []CachedSeriesData) []CachedSeriesData {

	if c.cache == nil {
		return newData
	}

	cachedData, _, _ := c.cache.Retrieve(cacheKey, true)
	var existingData []CachedSeriesData
	if err := json.Unmarshal(cachedData, &existingData); err != nil {
		// In case of error, we return the entire range as a miss
		c.storeMergedData(cacheKey, newData)
		return newData
	}

	allData := append(existingData, newData...)

	sort.Slice(allData, func(i, j int) bool {
		return allData[i].Start < allData[j].Start
	})

	var mergedData []CachedSeriesData
	var current *CachedSeriesData

	for _, data := range allData {
		if current == nil {
			current = &CachedSeriesData{
				Start: data.Start,
				End:   data.End,
				Data:  data.Data,
			}
			continue
		}
		if data.Start <= current.End {
			// Overlapping intervals, merge them
			current.End = max(current.End, data.End)
			current.Start = min(current.Start, data.Start)
			// Merge the Data fields
			current.Data = c.mergeSeries(current.Data, data.Data)
		} else {
			// No overlap, add current to mergedData
			mergedData = append(mergedData, *current)
			// Start new current
			current = &CachedSeriesData{
				Start: data.Start,
				End:   data.End,
				Data:  data.Data,
			}
		}
	}

	// After the loop, add the last current
	if current != nil {
		mergedData = append(mergedData, *current)
	}

	c.storeMergedData(cacheKey, mergedData)

	return mergedData
}

func (c *MetricsExplorerCache) mergeSeries(existingData interface{}, newData interface{}) interface{} {
	// Assuming existingData and newData are slices of some type, e.g., []float64
	existingSlice, ok1 := existingData.([]float64)
	newSlice, ok2 := newData.([]float64)

	if !ok1 || !ok2 {
		// Handle the case where the data types are not as expected
		zap.L().Error("Data types are not as expected for merging")
		return existingData // Return existing data if types are incorrect
	}

	// Merge logic: append new data to existing data
	merged := append(existingSlice, newSlice...)

	// Optionally, you can sort or deduplicate the merged data here if needed
	sort.Float64s(merged) // Sort the merged data

	return merged
}
