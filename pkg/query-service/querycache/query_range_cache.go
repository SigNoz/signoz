package querycache

import (
	"encoding/json"
	"math"
	"sort"
	"time"

	"go.signoz.io/signoz/pkg/query-service/cache"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
)

type queryCache struct {
	cache        cache.Cache
	fluxInterval time.Duration
}

type MissInterval struct {
	Start, End int64 // in milliseconds
}

type CachedSeriesData struct {
	Start int64        `json:"start"`
	End   int64        `json:"end"`
	Data  []*v3.Series `json:"data"`
}

type QueryCacheOption func(q *queryCache)

func NewQueryCache(opts ...QueryCacheOption) *queryCache {
	q := &queryCache{}
	for _, opt := range opts {
		opt(q)
	}
	return q
}

func WithCache(cache cache.Cache) QueryCacheOption {
	return func(q *queryCache) {
		q.cache = cache
	}
}

func WithFluxInterval(fluxInterval time.Duration) QueryCacheOption {
	return func(q *queryCache) {
		q.fluxInterval = fluxInterval
	}
}

func (q *queryCache) FindMissingTimeRanges(start, end, step int64, cacheKey string) []MissInterval {
	if q.cache == nil || cacheKey == "" {
		return []MissInterval{{Start: start, End: end}}
	}

	cachedSeriesDataList := q.getCachedSeriesData(cacheKey)

	// Sort the cached data by start time
	sort.Slice(cachedSeriesDataList, func(i, j int) bool {
		return cachedSeriesDataList[i].Start < cachedSeriesDataList[j].Start
	})

	zap.L().Info("Number of non-overlapping cached series data", zap.Int("count", len(cachedSeriesDataList)))

	// Exclude the flux interval from the cached end time

	// Why do we use `time.Now()` here?
	// When querying for a range [start, now())
	// we don't want to use the cached data inside the flux interval period
	// because the data in the flux interval period might not be fully ingested
	// and should not be used for caching.
	// This is not an issue if the end time is before now() - fluxInterval
	endMillis := time.Now().UnixMilli()
	adjustStep := int64(math.Min(float64(step), 60))
	roundedMillis := endMillis - (endMillis % (adjustStep * 1000))

	if len(cachedSeriesDataList) > 0 {
		lastCachedData := cachedSeriesDataList[len(cachedSeriesDataList)-1]
		lastCachedData.End = int64(
			math.Min(
				float64(lastCachedData.End),
				float64(roundedMillis-q.fluxInterval.Milliseconds()),
			),
		)
	}

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

func (q *queryCache) getCachedSeriesData(cacheKey string) []*CachedSeriesData {
	cachedData, _, _ := q.cache.Retrieve(cacheKey, true)
	var cachedSeriesDataList []*CachedSeriesData
	if err := json.Unmarshal(cachedData, &cachedSeriesDataList); err != nil {
		return nil
	}
	return cachedSeriesDataList
}

func (q *queryCache) mergeSeries(cachedSeries, missedSeries []*v3.Series) []*v3.Series {
	// Merge the missed series with the cached series by timestamp
	mergedSeries := make([]*v3.Series, 0)
	seriesesByLabels := make(map[uint64]*v3.Series)
	for idx := range cachedSeries {
		series := cachedSeries[idx]
		seriesesByLabels[labels.FromMap(series.Labels).Hash()] = series
	}

	for idx := range missedSeries {
		series := missedSeries[idx]
		h := labels.FromMap(series.Labels).Hash()
		if _, ok := seriesesByLabels[h]; !ok {
			seriesesByLabels[h] = series
			continue
		}
		seriesesByLabels[h].Points = append(seriesesByLabels[h].Points, series.Points...)
	}

	hashes := make([]uint64, 0, len(seriesesByLabels))
	for h := range seriesesByLabels {
		hashes = append(hashes, h)
	}
	sort.Slice(hashes, func(i, j int) bool {
		return hashes[i] < hashes[j]
	})

	// Sort the points in each series by timestamp
	for _, h := range hashes {
		series := seriesesByLabels[h]
		series.SortPoints()
		series.RemoveDuplicatePoints()
		mergedSeries = append(mergedSeries, series)
	}
	return mergedSeries
}

func (q *queryCache) storeMergedData(cacheKey string, mergedData []CachedSeriesData) {
	mergedDataJSON, err := json.Marshal(mergedData)
	if err != nil {
		zap.L().Error("error marshalling merged data", zap.Error(err))
		return
	}
	err = q.cache.Store(cacheKey, mergedDataJSON, 0)
	if err != nil {
		zap.L().Error("error storing merged data", zap.Error(err))
	}
}

func (q *queryCache) MergeWithCachedSeriesData(cacheKey string, newData []CachedSeriesData) []CachedSeriesData {

	if q.cache == nil {
		return newData
	}

	cachedData, _, _ := q.cache.Retrieve(cacheKey, true)
	var existingData []CachedSeriesData
	if err := json.Unmarshal(cachedData, &existingData); err != nil {
		// In case of error, we return the entire range as a miss
		q.storeMergedData(cacheKey, newData)
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
			current.Data = q.mergeSeries(current.Data, data.Data)
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

	q.storeMergedData(cacheKey, mergedData)

	return mergedData
}
