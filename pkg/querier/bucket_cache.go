package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// bucketCache implements the BucketCache interface
type bucketCache struct {
	cache        cache.Cache
	logger       *slog.Logger
	cacheTTL     time.Duration
	fluxInterval time.Duration
}

var _ BucketCache = (*bucketCache)(nil)

// NewBucketCache creates a new BucketCache implementation
func NewBucketCache(settings factory.ProviderSettings, cache cache.Cache, cacheTTL time.Duration, fluxInterval time.Duration) BucketCache {
	cacheSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querier/bucket_cache")
	return &bucketCache{
		cache:        cache,
		logger:       cacheSettings.Logger(),
		cacheTTL:     cacheTTL,
		fluxInterval: fluxInterval,
	}
}

// cachedBucket represents a cached time bucket
type cachedBucket struct {
	StartMs uint64              `json:"startMs"`
	EndMs   uint64              `json:"endMs"`
	Type    qbtypes.RequestType `json:"type"`
	Value   json.RawMessage     `json:"value"`
	Stats   qbtypes.ExecStats   `json:"stats"`
}

// cachedData represents the full cached data for a query
type cachedData struct {
	Buckets  []*cachedBucket `json:"buckets"`
	Warnings []string        `json:"warnings"`
}

func (c *cachedData) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, c)
}

func (c *cachedData) MarshalBinary() ([]byte, error) {
	return json.Marshal(c)
}

// GetMissRanges returns cached data and missing time ranges
func (bc *bucketCache) GetMissRanges(
	ctx context.Context,
	orgID valuer.UUID,
	q qbtypes.Query,
	step qbtypes.Step,
) (cached *qbtypes.Result, missing []*qbtypes.TimeRange) {

	// Get query window
	startMs, endMs := q.Window()

	bc.logger.DebugContext(ctx, "getting miss ranges", "fingerprint", q.Fingerprint(), "start", startMs, "end", endMs)

	// Generate cache key
	cacheKey := bc.generateCacheKey(q)

	bc.logger.DebugContext(ctx, "cache key", "cache_key", cacheKey)

	// Try to get cached data
	var data cachedData
	err := bc.cache.Get(ctx, orgID, cacheKey, &data)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			bc.logger.ErrorContext(ctx, "error getting cached data", "error", err)
		}
		// No cached data, need to fetch entire range
		missing = []*qbtypes.TimeRange{{From: startMs, To: endMs}}
		return nil, missing
	}

	// Extract step interval if this is a builder query
	stepMs := uint64(step.Duration.Milliseconds())

	// Find missing ranges with step alignment
	missing = bc.findMissingRangesWithStep(data.Buckets, startMs, endMs, stepMs)
	bc.logger.DebugContext(ctx, "missing ranges", "missing", missing, "step", stepMs)

	// If no cached data overlaps with requested range, return empty result
	if len(data.Buckets) == 0 {
		return nil, missing
	}

	// Extract relevant buckets and merge them
	relevantBuckets := bc.filterRelevantBuckets(data.Buckets, startMs, endMs)
	if len(relevantBuckets) == 0 {
		return nil, missing
	}

	// Merge buckets into a single result
	mergedResult := bc.mergeBuckets(ctx, relevantBuckets, data.Warnings)

	// Filter the merged result to only include values within the requested time range
	mergedResult = bc.filterResultToTimeRange(mergedResult, startMs, endMs)

	return mergedResult, missing
}

// Put stores fresh query results in the cache
func (bc *bucketCache) Put(ctx context.Context, orgID valuer.UUID, q qbtypes.Query, step qbtypes.Step, fresh *qbtypes.Result) {
	// Get query window
	startMs, endMs := q.Window()

	// Calculate the flux boundary - data after this point should not be cached
	currentMs := uint64(time.Now().UnixMilli())
	fluxBoundary := currentMs - uint64(bc.fluxInterval.Milliseconds())

	// If the entire range is within flux interval, skip caching
	if startMs >= fluxBoundary {
		bc.logger.DebugContext(ctx, "entire range within flux interval, skipping cache",
			"start", startMs,
			"end", endMs,
			"flux_boundary", fluxBoundary)
		return
	}

	// Adjust endMs to not include data within flux interval
	cachableEndMs := endMs
	if endMs > fluxBoundary {
		cachableEndMs = fluxBoundary
		bc.logger.DebugContext(ctx, "adjusting end time to exclude flux interval",
			"original_end", endMs,
			"cachable_end", cachableEndMs)
	}

	// Generate cache key
	cacheKey := bc.generateCacheKey(q)

	// Get existing cached data
	var existingData cachedData
	if err := bc.cache.Get(ctx, orgID, cacheKey, &existingData); err != nil {
		existingData = cachedData{}
	}

	// Trim the result to exclude data within flux interval
	trimmedResult := bc.trimResultToFluxBoundary(fresh, cachableEndMs)
	if trimmedResult == nil {
		// Result type is not cacheable (raw or scalar)
		return
	}

	// Adjust start and end times to only cache complete intervals
	cachableStartMs := startMs
	stepMs := uint64(step.Duration.Milliseconds())

	// If we have a step interval, adjust boundaries to only cache complete intervals
	if stepMs > 0 {
		// If start is not aligned, round up to next step boundary (first complete interval)
		if startMs%stepMs != 0 {
			cachableStartMs = ((startMs / stepMs) + 1) * stepMs
		}

		// If end is not aligned, round down to previous step boundary (last complete interval)
		if cachableEndMs%stepMs != 0 {
			cachableEndMs = (cachableEndMs / stepMs) * stepMs
		}

		// If after adjustment we have no complete intervals, don't cache
		if cachableStartMs >= cachableEndMs {
			bc.logger.DebugContext(ctx, "no complete intervals to cache",
				"original_start", startMs,
				"original_end", endMs,
				"adjusted_start", cachableStartMs,
				"adjusted_end", cachableEndMs,
				"step", stepMs)
			return
		}
	}

	// Convert trimmed result to buckets with adjusted boundaries
	freshBuckets := bc.resultToBuckets(ctx, trimmedResult, cachableStartMs, cachableEndMs)

	// If no fresh buckets and no existing data, don't cache
	if len(freshBuckets) == 0 && len(existingData.Buckets) == 0 {
		return
	}

	// Merge with existing buckets
	mergedBuckets := bc.mergeAndDeduplicateBuckets(existingData.Buckets, freshBuckets)

	// Update warnings
	allWarnings := append(existingData.Warnings, trimmedResult.Warnings...)
	uniqueWarnings := bc.deduplicateWarnings(allWarnings)

	// Create updated cached data
	updatedData := cachedData{
		Buckets:  mergedBuckets,
		Warnings: uniqueWarnings,
	}

	// Marshal and store in cache
	if err := bc.cache.Set(ctx, orgID, cacheKey, &updatedData, bc.cacheTTL); err != nil {
		bc.logger.ErrorContext(ctx, "error setting cached data", "error", err)
	}
}

// generateCacheKey creates a unique cache key based on query fingerprint
func (bc *bucketCache) generateCacheKey(q qbtypes.Query) string {
	fingerprint := q.Fingerprint()

	return fmt.Sprintf("v5:query:%s", fingerprint)
}

// findMissingRangesWithStep identifies time ranges not covered by cached buckets with step alignment
func (bc *bucketCache) findMissingRangesWithStep(buckets []*cachedBucket, startMs, endMs uint64, stepMs uint64) []*qbtypes.TimeRange {
	// When step is 0 or window is too small to be cached, use simple algorithm
	if stepMs == 0 || (startMs+stepMs) > endMs {
		return bc.findMissingRangesBasic(buckets, startMs, endMs)
	}

	// When no buckets exist, handle partial windows specially
	if len(buckets) == 0 {
		missing := make([]*qbtypes.TimeRange, 0, 3)

		currentMs := startMs

		// Check if start is not aligned - add partial window
		if startMs%stepMs != 0 {
			nextAggStart := startMs - (startMs % stepMs) + stepMs
			missing = append(missing, &qbtypes.TimeRange{
				From: startMs,
				To:   min(nextAggStart, endMs),
			})
			currentMs = nextAggStart
		}

		// Add the main range if needed
		if currentMs < endMs {
			missing = append(missing, &qbtypes.TimeRange{
				From: currentMs,
				To:   endMs,
			})
		}

		return missing
	}

	// Check if already sorted before sorting
	needsSort := false
	for i := 1; i < len(buckets); i++ {
		if buckets[i].StartMs < buckets[i-1].StartMs {
			needsSort = true
			break
		}
	}

	if needsSort {
		slices.SortFunc(buckets, func(a, b *cachedBucket) int {
			if a.StartMs < b.StartMs {
				return -1
			}
			if a.StartMs > b.StartMs {
				return 1
			}
			return 0
		})
	}

	// Pre-allocate with reasonable capacity
	missing := make([]*qbtypes.TimeRange, 0, len(buckets)+2)

	currentMs := startMs

	// Check if start is not aligned - add partial window
	if startMs%stepMs != 0 {
		nextAggStart := startMs - (startMs % stepMs) + stepMs
		missing = append(missing, &qbtypes.TimeRange{
			From: startMs,
			To:   min(nextAggStart, endMs),
		})
		currentMs = nextAggStart
	}

	for _, bucket := range buckets {
		// Skip buckets that end before current position
		if bucket.EndMs <= currentMs {
			continue
		}
		// Stop processing if we've reached the end time
		if bucket.StartMs >= endMs {
			break
		}

		// Align bucket boundaries to step intervals
		alignedBucketStart := bucket.StartMs
		if bucket.StartMs%stepMs != 0 {
			// Round up to next step boundary
			alignedBucketStart = bucket.StartMs - (bucket.StartMs % stepMs) + stepMs
		}

		// Add gap before this bucket if needed
		if currentMs < alignedBucketStart && currentMs < endMs {
			missing = append(missing, &qbtypes.TimeRange{
				From: currentMs,
				To:   min(alignedBucketStart, endMs),
			})
		}

		// Update current position to the end of this bucket
		// But ensure it's aligned to step boundary
		bucketEnd := min(bucket.EndMs, endMs)
		if bucketEnd%stepMs != 0 && bucketEnd < endMs {
			// Round down to step boundary
			bucketEnd = bucketEnd - (bucketEnd % stepMs)
		}
		currentMs = max(currentMs, bucketEnd)
	}

	// Add final gap if needed
	if currentMs < endMs {
		missing = append(missing, &qbtypes.TimeRange{
			From: currentMs,
			To:   endMs,
		})
	}

	// Don't merge ranges - keep partial windows separate for proper handling
	return missing
}

// findMissingRangesBasic is the simple algorithm without step alignment
func (bc *bucketCache) findMissingRangesBasic(buckets []*cachedBucket, startMs, endMs uint64) []*qbtypes.TimeRange {
	// Check if already sorted before sorting
	needsSort := false
	for i := 1; i < len(buckets); i++ {
		if buckets[i].StartMs < buckets[i-1].StartMs {
			needsSort = true
			break
		}
	}

	if needsSort {
		slices.SortFunc(buckets, func(a, b *cachedBucket) int {
			if a.StartMs < b.StartMs {
				return -1
			}
			if a.StartMs > b.StartMs {
				return 1
			}
			return 0
		})
	}

	// Pre-allocate with reasonable capacity
	missing := make([]*qbtypes.TimeRange, 0, len(buckets)+1)
	currentMs := startMs

	for _, bucket := range buckets {
		// Skip buckets that end before start time
		if bucket.EndMs <= startMs {
			continue
		}
		// Stop processing if we've reached the end time
		if bucket.StartMs >= endMs {
			break
		}

		// Add gap before this bucket if needed
		if currentMs < bucket.StartMs {
			missing = append(missing, &qbtypes.TimeRange{
				From: currentMs,
				To:   min(bucket.StartMs, endMs),
			})
		}

		// Update current position, but don't go past the end time
		currentMs = max(currentMs, min(bucket.EndMs, endMs))
	}

	// Add final gap if needed
	if currentMs < endMs {
		// Check if we need to limit due to flux interval
		currentTime := uint64(time.Now().UnixMilli())
		fluxBoundary := currentTime - uint64(bc.fluxInterval.Milliseconds())

		// If the missing range extends beyond flux boundary, limit it
		if currentMs < fluxBoundary {
			// Add range up to flux boundary
			missing = append(missing, &qbtypes.TimeRange{
				From: currentMs,
				To:   min(endMs, fluxBoundary),
			})
			// If endMs is beyond flux boundary, add that as another missing range
			if endMs > fluxBoundary {
				missing = append(missing, &qbtypes.TimeRange{
					From: fluxBoundary,
					To:   endMs,
				})
			}
		} else {
			// Entire missing range is within flux interval
			missing = append(missing, &qbtypes.TimeRange{
				From: currentMs,
				To:   endMs,
			})
		}
	}

	// Don't merge ranges - keep partial windows separate for proper handling
	return missing
}

// filterRelevantBuckets returns buckets that overlap with the requested time range
func (bc *bucketCache) filterRelevantBuckets(buckets []*cachedBucket, startMs, endMs uint64) []*cachedBucket {
	// Pre-allocate with estimated capacity
	relevant := make([]*cachedBucket, 0, len(buckets))

	for _, bucket := range buckets {
		// Check if bucket overlaps with requested range
		if bucket.EndMs > startMs && bucket.StartMs < endMs {
			relevant = append(relevant, bucket)
		}
	}

	// Sort by start time
	slices.SortFunc(relevant, func(a, b *cachedBucket) int {
		if a.StartMs < b.StartMs {
			return -1
		}
		if a.StartMs > b.StartMs {
			return 1
		}
		return 0
	})

	return relevant
}

// mergeBuckets combines multiple cached buckets into a single result
func (bc *bucketCache) mergeBuckets(ctx context.Context, buckets []*cachedBucket, warnings []string) *qbtypes.Result {
	if len(buckets) == 0 {
		return &qbtypes.Result{}
	}

	// All buckets should have the same type
	resultType := buckets[0].Type

	// Aggregate stats
	var totalStats qbtypes.ExecStats
	for _, bucket := range buckets {
		totalStats.RowsScanned += bucket.Stats.RowsScanned
		totalStats.BytesScanned += bucket.Stats.BytesScanned
		totalStats.DurationMS += bucket.Stats.DurationMS
	}

	// Merge values based on type
	var mergedValue any
	switch resultType {
	case qbtypes.RequestTypeTimeSeries:
		mergedValue = bc.mergeTimeSeriesValues(ctx, buckets)
		// Raw and Scalar types are not cached, so no merge needed
	}

	return &qbtypes.Result{
		Type:     resultType,
		Value:    mergedValue,
		Stats:    totalStats,
		Warnings: warnings,
	}
}

// mergeTimeSeriesValues merges time series data from multiple buckets
func (bc *bucketCache) mergeTimeSeriesValues(ctx context.Context, buckets []*cachedBucket) *qbtypes.TimeSeriesData {
	// Estimate capacity based on bucket count
	estimatedSeries := len(buckets) * 10

	// Flat map with composite key for better performance
	type seriesKey struct {
		aggIndex int
		key      string
	}
	seriesMap := make(map[seriesKey]*qbtypes.TimeSeries, estimatedSeries)

	for _, bucket := range buckets {
		var tsData *qbtypes.TimeSeriesData
		if err := json.Unmarshal(bucket.Value, &tsData); err != nil {
			bc.logger.ErrorContext(ctx, "failed to unmarshal time series data", "error", err)
			continue
		}

		for _, aggBucket := range tsData.Aggregations {
			for _, series := range aggBucket.Series {
				// Create series key from labels
				key := seriesKey{
					aggIndex: aggBucket.Index,
					key:      qbtypes.GetUniqueSeriesKey(series.Labels),
				}

				if existingSeries, ok := seriesMap[key]; ok {
					// Merge values, avoiding duplicate timestamps
					timestampMap := make(map[int64]bool)
					for _, v := range existingSeries.Values {
						timestampMap[v.Timestamp] = true
					}

					// Pre-allocate capacity for merged values
					newCap := len(existingSeries.Values) + len(series.Values)
					if cap(existingSeries.Values) < newCap {
						newValues := make([]*qbtypes.TimeSeriesValue, len(existingSeries.Values), newCap)
						copy(newValues, existingSeries.Values)
						existingSeries.Values = newValues
					}

					// Only add values with new timestamps
					for _, v := range series.Values {
						if !timestampMap[v.Timestamp] {
							existingSeries.Values = append(existingSeries.Values, v)
						}
					}
				} else {
					// New series
					seriesMap[key] = series
				}
			}
		}
	}

	// Group series by aggregation index
	aggMap := make(map[int][]*qbtypes.TimeSeries)
	for key, series := range seriesMap {
		aggMap[key.aggIndex] = append(aggMap[key.aggIndex], series)
	}

	// Convert map back to slice
	result := &qbtypes.TimeSeriesData{
		Aggregations: make([]*qbtypes.AggregationBucket, 0, len(aggMap)),
	}

	for index, seriesList := range aggMap {
		// Sort values by timestamp for each series
		for _, s := range seriesList {
			// Check if already sorted before sorting
			needsSort := false
			for i := 1; i < len(s.Values); i++ {
				if s.Values[i].Timestamp < s.Values[i-1].Timestamp {
					needsSort = true
					break
				}
			}

			if needsSort {
				slices.SortFunc(s.Values, func(a, b *qbtypes.TimeSeriesValue) int {
					if a.Timestamp < b.Timestamp {
						return -1
					}
					if a.Timestamp > b.Timestamp {
						return 1
					}
					return 0
				})
			}
		}

		result.Aggregations = append(result.Aggregations, &qbtypes.AggregationBucket{
			Index:  index,
			Series: seriesList,
		})
	}

	return result
}

// isEmptyResult checks if a result is truly empty (no data exists) vs filtered empty (data was filtered out)
func (bc *bucketCache) isEmptyResult(result *qbtypes.Result) (isEmpty bool, isFiltered bool) {
	if result.Value == nil {
		return true, false
	}

	switch result.Type {
	case qbtypes.RequestTypeTimeSeries:
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			// No aggregations at all means truly empty
			if len(tsData.Aggregations) == 0 {
				return true, false
			}

			// Check if we have aggregations but no series (filtered out)
			totalSeries := 0
			for _, agg := range tsData.Aggregations {
				totalSeries += len(agg.Series)
			}

			if totalSeries == 0 {
				// We have aggregations but no series - data was filtered out
				return true, true
			}

			// Check if all series have no values
			hasValues := false
			for _, agg := range tsData.Aggregations {
				for _, series := range agg.Series {
					if len(series.Values) > 0 {
						hasValues = true
						break
					}
				}
				if hasValues {
					break
				}
			}

			return !hasValues, !hasValues && totalSeries > 0
		}

	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeScalar, qbtypes.RequestTypeTrace:
		// Raw and scalar data are not cached
		return true, false
	}

	return true, false
}

// resultToBuckets converts a query result into time-based buckets
func (bc *bucketCache) resultToBuckets(ctx context.Context, result *qbtypes.Result, startMs, endMs uint64) []*cachedBucket {
	// Check if result is empty
	isEmpty, isFiltered := bc.isEmptyResult(result)

	// Don't cache if result is empty but not filtered
	// Empty filtered results should be cached to avoid re-querying
	if isEmpty && !isFiltered {
		bc.logger.DebugContext(ctx, "skipping cache for empty non-filtered result")
		return nil
	}

	// For now, create a single bucket for the entire range
	// In the future, we could split large ranges into smaller buckets
	valueBytes, err := json.Marshal(result.Value)
	if err != nil {
		bc.logger.ErrorContext(ctx, "failed to marshal result value", "error", err)
		return nil
	}

	// Always create a bucket, even for empty filtered results
	// This ensures we don't re-query for data that doesn't exist
	return []*cachedBucket{
		{
			StartMs: startMs,
			EndMs:   endMs,
			Type:    result.Type,
			Value:   valueBytes,
			Stats:   result.Stats,
		},
	}
}

// mergeAndDeduplicateBuckets combines and deduplicates bucket lists
func (bc *bucketCache) mergeAndDeduplicateBuckets(existing, fresh []*cachedBucket) []*cachedBucket {
	// Create a map to deduplicate by time range
	bucketMap := make(map[string]*cachedBucket)

	// Add existing buckets
	for _, bucket := range existing {
		key := fmt.Sprintf("%d-%d", bucket.StartMs, bucket.EndMs)
		bucketMap[key] = bucket
	}

	// Add/update with fresh buckets
	for _, bucket := range fresh {
		key := fmt.Sprintf("%d-%d", bucket.StartMs, bucket.EndMs)
		bucketMap[key] = bucket
	}

	// Convert back to slice with pre-allocated capacity
	result := make([]*cachedBucket, 0, len(bucketMap))
	for _, bucket := range bucketMap {
		result = append(result, bucket)
	}

	// Sort by start time
	slices.SortFunc(result, func(a, b *cachedBucket) int {
		if a.StartMs < b.StartMs {
			return -1
		}
		if a.StartMs > b.StartMs {
			return 1
		}
		return 0
	})

	return result
}

// deduplicateWarnings removes duplicate warnings
func (bc *bucketCache) deduplicateWarnings(warnings []string) []string {
	if len(warnings) == 0 {
		return nil
	}

	seen := make(map[string]bool, len(warnings))
	unique := make([]string, 0, len(warnings)) // Pre-allocate capacity

	for _, warning := range warnings {
		if !seen[warning] {
			seen[warning] = true
			unique = append(unique, warning)
		}
	}

	return unique
}

// trimResultToFluxBoundary trims the result to exclude data points beyond the flux boundary
func (bc *bucketCache) trimResultToFluxBoundary(result *qbtypes.Result, fluxBoundary uint64) *qbtypes.Result {
	trimmedResult := &qbtypes.Result{
		Type:     result.Type,
		Stats:    result.Stats,
		Warnings: result.Warnings,
	}

	switch result.Type {
	case qbtypes.RequestTypeTimeSeries:
		// Trim time series data
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok && tsData != nil {
			trimmedData := &qbtypes.TimeSeriesData{}

			for _, aggBucket := range tsData.Aggregations {
				trimmedBucket := &qbtypes.AggregationBucket{
					Index: aggBucket.Index,
				}

				for _, series := range aggBucket.Series {
					trimmedSeries := &qbtypes.TimeSeries{
						Labels: series.Labels,
					}

					// Filter values to exclude those beyond flux boundary and partial values
					for _, value := range series.Values {
						// Skip partial values - they cannot be cached
						if value.Partial {
							continue
						}
						if uint64(value.Timestamp) <= fluxBoundary {
							trimmedSeries.Values = append(trimmedSeries.Values, value)
						}
					}

					// Always add the series to preserve filtered empty results
					trimmedBucket.Series = append(trimmedBucket.Series, trimmedSeries)
				}

				// Always add the bucket to preserve aggregation structure
				trimmedData.Aggregations = append(trimmedData.Aggregations, trimmedBucket)
			}

			// Always set the value to preserve empty filtered results
			trimmedResult.Value = trimmedData
		}

	case qbtypes.RequestTypeRaw, qbtypes.RequestTypeScalar, qbtypes.RequestTypeTrace:
		// Don't cache raw or scalar data
		return nil
	}

	return trimmedResult
}

func min(a, b uint64) uint64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b uint64) uint64 {
	if a > b {
		return a
	}
	return b
}

// filterResultToTimeRange filters the result to only include values within the requested time range
func (bc *bucketCache) filterResultToTimeRange(result *qbtypes.Result, startMs, endMs uint64) *qbtypes.Result {
	if result == nil || result.Value == nil {
		return result
	}

	switch result.Type {
	case qbtypes.RequestTypeTimeSeries:
		if tsData, ok := result.Value.(*qbtypes.TimeSeriesData); ok {
			filteredData := &qbtypes.TimeSeriesData{
				Aggregations: make([]*qbtypes.AggregationBucket, 0, len(tsData.Aggregations)),
			}

			for _, aggBucket := range tsData.Aggregations {
				filteredBucket := &qbtypes.AggregationBucket{
					Index:  aggBucket.Index,
					Alias:  aggBucket.Alias,
					Meta:   aggBucket.Meta,
					Series: make([]*qbtypes.TimeSeries, 0, len(aggBucket.Series)),
				}

				for _, series := range aggBucket.Series {
					filteredSeries := &qbtypes.TimeSeries{
						Labels: series.Labels,
						Values: make([]*qbtypes.TimeSeriesValue, 0, len(series.Values)),
					}

					// Filter values to only include those within the requested time range
					for _, value := range series.Values {
						timestampMs := uint64(value.Timestamp)
						if timestampMs >= startMs && timestampMs < endMs {
							filteredSeries.Values = append(filteredSeries.Values, value)
						}
					}

					// Always add series to preserve structure (even if empty)
					filteredBucket.Series = append(filteredBucket.Series, filteredSeries)
				}

				// Only add bucket if it has series
				if len(filteredBucket.Series) > 0 {
					filteredData.Aggregations = append(filteredData.Aggregations, filteredBucket)
				}
			}

			// Create a new result with the filtered data
			return &qbtypes.Result{
				Type:     result.Type,
				Value:    filteredData,
				Stats:    result.Stats,
				Warnings: result.Warnings,
			}
		}
	}

	// For non-time series data, return as is
	return result
}
