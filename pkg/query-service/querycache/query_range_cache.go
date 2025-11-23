package querycache

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

var _ cachetypes.Cacheable = (*CacheableSeriesData)(nil)

type CacheableSeriesData struct {
	Series []CachedSeriesData
}

func (c *CacheableSeriesData) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}
func (c *CacheableSeriesData) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
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

// FindMissingTimeRangesV2 is a new correct implementation of FindMissingTimeRanges
// It takes care of any timestamps that were not queried due to rounding in the first version.
func (q *queryCache) FindMissingTimeRangesV2(orgID valuer.UUID, start, end int64, step int64, cacheKey string) []MissInterval {
	if q.cache == nil || cacheKey == "" {
		return []MissInterval{{Start: start, End: end}}
	}

	stepMs := step * 1000

	// when the window is too small to be cached, we return the entire range as a miss
	if (start + stepMs) > end {
		return []MissInterval{{Start: start, End: end}}
	}

	cachedSeriesDataList := q.getCachedSeriesData(orgID, cacheKey)

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
	if len(cachedSeriesDataList) > 0 {
		lastCachedData := cachedSeriesDataList[len(cachedSeriesDataList)-1]
		lastCachedData.End = int64(
			math.Min(
				float64(lastCachedData.End),
				float64(time.Now().UnixMilli()-q.fluxInterval.Milliseconds()),
			),
		)
	}

	var missingRanges []MissInterval
	currentTime := start

	// check if start is a complete aggregation window if not then add it as a miss
	if start%stepMs != 0 {
		nextAggStart := start - (start % stepMs) + stepMs
		missingRanges = append(missingRanges, MissInterval{Start: start, End: nextAggStart})
		currentTime = nextAggStart
	}

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

	// while iterating through the cachedSeriesDataList, we might have reached the end
	// but there might be a case where the last data range is not a complete aggregation window
	// so we add it manually by first checking if currentTime < end which means it has not reached the end
	// and then checking if end%(step*1000) != 0 which means it is not a complete aggregation window but currentTime becomes end.
	// that can happen when currentTime = nextAggStart and no other range match is found in the loop.
	// The test case "start lies near the start of aggregation interval and end lies near the end of another aggregation interval"
	// shows this case.
	if currentTime < end {
		missingRanges = append(missingRanges, MissInterval{Start: currentTime, End: end})
	} else if end%stepMs != 0 {
		// check if end is a complete aggregation window if not then add it as a miss
		prevAggEnd := end - (end % stepMs)
		missingRanges = append(missingRanges, MissInterval{Start: prevAggEnd, End: end})
	}

	// Merge overlapping or adjacent missing ranges
	if len(missingRanges) <= 1 {
		return missingRanges
	}
	merged := []MissInterval{missingRanges[0]}
	for _, curr := range missingRanges[1:] {
		last := &merged[len(merged)-1]
		if last.End >= curr.Start {
			last.End = max(last.End, curr.End)
		} else {
			merged = append(merged, curr)
		}
	}

	return merged
}

func (q *queryCache) FindMissingTimeRanges(orgID valuer.UUID, start, end, step int64, cacheKey string) []MissInterval {
	if q.cache == nil || cacheKey == "" {
		return []MissInterval{{Start: start, End: end}}
	}

	cachedSeriesDataList := q.getCachedSeriesData(orgID, cacheKey)

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

func (q *queryCache) getCachedSeriesData(orgID valuer.UUID, cacheKey string) []*CachedSeriesData {
	cacheableSeriesData := new(CacheableSeriesData)
	err := q.cache.Get(context.TODO(), orgID, cacheKey, cacheableSeriesData)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil
	}
	cachedSeriesData := make([]*CachedSeriesData, 0)
	for _, cachedSeries := range cacheableSeriesData.Series {
		cachedSeriesData = append(cachedSeriesData, &cachedSeries)
	}
	return cachedSeriesData
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

func (q *queryCache) storeMergedData(orgID valuer.UUID, cacheKey string, mergedData []CachedSeriesData) {
	if q.cache == nil {
		return
	}
	cacheableSeriesData := CacheableSeriesData{Series: mergedData}
	err := q.cache.Set(context.TODO(), orgID, cacheKey, &cacheableSeriesData, 0)
	if err != nil {
		zap.L().Error("error storing merged data", zap.Error(err))
	}
}

func (q *queryCache) MergeWithCachedSeriesDataV2(orgID valuer.UUID, cacheKey string, newData []CachedSeriesData) []CachedSeriesData {
	if q.cache == nil {
		return newData
	}

	cacheableSeriesData := new(CacheableSeriesData)
	err := q.cache.Get(context.TODO(), orgID, cacheKey, cacheableSeriesData)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil
	}
	allData := append(cacheableSeriesData.Series, newData...)

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

	return mergedData
}

func (q *queryCache) MergeWithCachedSeriesData(orgID valuer.UUID, cacheKey string, newData []CachedSeriesData) []CachedSeriesData {

	mergedData := q.MergeWithCachedSeriesDataV2(orgID, cacheKey, newData)
	q.storeMergedData(orgID, cacheKey, mergedData)
	return mergedData
}

func (q *queryCache) StoreSeriesInCache(orgID valuer.UUID, cacheKey string, series []CachedSeriesData) {
	q.storeMergedData(orgID, cacheKey, series)
}
