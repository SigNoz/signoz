package querier

import (
	"context"
	"hash/fnv"
	"log/slog"
	"slices"
	"sync"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// cacheSchemaVersion is part of every key. Bump it when the stored shape or
// its meaning changes so entries written by an older build are never read.
const cacheSchemaVersion = "2"

// maxEdgeBuckets bounds the partial-end buckets kept per key; every distinct
// unaligned window end would otherwise add one.
const maxEdgeBuckets = 8

// CacheRequest identifies what a query wants from the cache.
type CacheRequest struct {
	// Key is the cache key of the query, computed once per request so the
	// read and the write use the same entry.
	Key string
	// Window is [From, To) in epoch ms. A point at ts covers [ts, ts+step),
	// so a point belongs to the window when ts >= From and ts+step <= To.
	Window qbtypes.TimeRange
	Step   qbtypes.Step
	Kind   qbtypes.RequestType
	// TrimHeatmapAxis drops axis buckets that no served column reached; only
	// builder heatmaps compute their axis from the served columns.
	TrimHeatmapAxis bool
}

// BucketCache stores time series results per step-grid range and serves the
// cached part of a window together with the ranges still to be fetched.
type BucketCache interface {
	GetMissRanges(ctx context.Context, orgID valuer.UUID, req CacheRequest) (cached *qbtypes.Result, missing []qbtypes.TimeRange)
	// Put stores the result of fetching window, which must be inside req.Window.
	Put(ctx context.Context, orgID valuer.UUID, req CacheRequest, window qbtypes.TimeRange, fresh *qbtypes.Result)
}

type bucketCache struct {
	cache        cache.Cache
	logger       *slog.Logger
	cacheTTL     time.Duration
	fluxInterval time.Duration
	// keyLocks serialises read-modify-write cycles of one key inside this
	// process; two refreshes of the same panel must not drop each other's
	// buckets.
	keyLocks       [64]sync.Mutex
	requests       metric.Int64Counter
	droppedBuckets metric.Int64Counter
}

var _ BucketCache = (*bucketCache)(nil)

func NewBucketCache(settings factory.ProviderSettings, cache cache.Cache, cacheTTL time.Duration, fluxInterval time.Duration) BucketCache {
	cacheSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/querier/bucket_cache")
	bc := &bucketCache{
		cache:        cache,
		logger:       cacheSettings.Logger(),
		cacheTTL:     cacheTTL,
		fluxInterval: fluxInterval,
	}
	var err error
	bc.requests, err = cacheSettings.Meter().Int64Counter("signoz.querier.bucket_cache.request.count", metric.WithDescription("Cache lookups by result: hit, partial or miss."), metric.WithUnit("{request}"))
	if err != nil {
		bc.logger.Warn("bucket cache request counter unavailable", errors.Attr(err))
	}
	bc.droppedBuckets, err = cacheSettings.Meter().Int64Counter("signoz.querier.bucket_cache.dropped_bucket.count", metric.WithDescription("Cached buckets dropped on read by reason: expired or undecodable."), metric.WithUnit("{bucket}"))
	if err != nil {
		bc.logger.Warn("bucket cache dropped bucket counter unavailable", errors.Attr(err))
	}
	return bc
}

func (bc *bucketCache) count(ctx context.Context, counter metric.Int64Counter, key, value string) {
	if counter != nil {
		counter.Add(ctx, 1, metric.WithAttributes(attribute.String(key, value)))
	}
}

// CacheKey derives the cache key of a query fingerprint.
func CacheKey(fingerprint string) string {
	return "v5:query:" + cacheSchemaVersion + ":" + cachetypes.NewSha1CacheKey(fingerprint)
}

// windowGrid splits a window into the whole steps it contains (body) and the
// partial step at each end. A window shorter than one step, or one that sits
// inside a single step, is one partial range (whole).
type windowGrid struct {
	head, body, tail, whole *qbtypes.TimeRange
}

func gridOf(window qbtypes.TimeRange, stepMs uint64) windowGrid {
	from, to := window.From, window.To
	gridStart := alignUp(from, stepMs)
	gridEnd := alignDown(to, stepMs)
	if gridStart > gridEnd || (gridStart == gridEnd && from%stepMs != 0 && to%stepMs != 0) {
		return windowGrid{whole: &qbtypes.TimeRange{From: from, To: to}}
	}
	var g windowGrid
	if from < gridStart {
		g.head = &qbtypes.TimeRange{From: from, To: gridStart}
	}
	if gridStart < gridEnd {
		g.body = &qbtypes.TimeRange{From: gridStart, To: gridEnd}
	}
	if gridEnd < to {
		g.tail = &qbtypes.TimeRange{From: gridEnd, To: to}
	}
	return g
}

func alignDown(ts, stepMs uint64) uint64 { return ts - ts%stepMs }

func alignUp(ts, stepMs uint64) uint64 {
	if ts%stepMs == 0 {
		return ts
	}
	return ts - ts%stepMs + stepMs
}

// decodedBucket is a stored bucket with its value decoded. Buckets whose
// value does not decode, or whose points are older than the TTL, are dropped
// by the reader, which reports their range as missing so the next write
// replaces them.
type decodedBucket struct {
	*qbtypes.CachedBucket
	data *qbtypes.TimeSeriesData
}

// decode returns the decoded buckets that overlap window, sorted by start.
func (bc *bucketCache) decode(ctx context.Context, buckets []*qbtypes.CachedBucket, window qbtypes.TimeRange) []decodedBucket {
	expiry := time.Now().Add(-bc.cacheTTL).UnixMilli()
	decoded := make([]decodedBucket, 0, len(buckets))
	for _, bucket := range buckets {
		if bucket == nil || bucket.EndMs <= bucket.StartMs {
			continue
		}
		if bucket.StartMs >= window.To || bucket.EndMs <= window.From {
			continue
		}
		if bucket.WrittenAtMs < expiry {
			bc.count(ctx, bc.droppedBuckets, "reason", "expired")
			continue
		}
		data, err := decodeBucketValue(bucket.Value)
		if err != nil {
			bc.count(ctx, bc.droppedBuckets, "reason", "undecodable")
			bc.logger.WarnContext(ctx, "dropping cached bucket that does not decode", errors.Attr(err), slog.Uint64("start", bucket.StartMs), slog.Uint64("end", bucket.EndMs))
			continue
		}
		decoded = append(decoded, decodedBucket{CachedBucket: bucket, data: data})
	}
	slices.SortStableFunc(decoded, func(a, b decodedBucket) int {
		if a.StartMs != b.StartMs {
			if a.StartMs < b.StartMs {
				return -1
			}
			return 1
		}
		return 0
	})
	return decoded
}

func (bc *bucketCache) GetMissRanges(ctx context.Context, orgID valuer.UUID, req CacheRequest) (*qbtypes.Result, []qbtypes.TimeRange) {
	window, stepMs := req.Window, uint64(req.Step.Milliseconds())
	if window.From >= window.To {
		return nil, nil
	}
	if stepMs == 0 {
		return nil, []qbtypes.TimeRange{window}
	}

	var data qbtypes.CachedData
	if err := bc.cache.Get(ctx, orgID, req.Key, &data); err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			bc.logger.DebugContext(ctx, "cache read failed, treating as miss", errors.Attr(err))
		}
		bc.count(ctx, bc.requests, "result", "miss")
		return nil, []qbtypes.TimeRange{window}
	}
	buckets := bc.decode(ctx, data.Buckets, window)
	grid := gridOf(window, stepMs)

	var served []decodedBucket
	var missing []qbtypes.TimeRange
	if grid.whole != nil {
		if edge, ok := findEdge(buckets, qbtypes.CachedBucketWhole, *grid.whole); ok {
			served = append(served, edge)
		} else {
			missing = append(missing, *grid.whole)
		}
		return bc.serve(ctx, req, window, served, missing)
	}
	if grid.head != nil {
		if edge, ok := findEdge(buckets, qbtypes.CachedBucketHead, *grid.head); ok {
			served = append(served, edge)
		} else {
			missing = append(missing, *grid.head)
		}
	}
	if grid.body != nil {
		covering, gaps := coverBody(buckets, *grid.body)
		served = append(served, covering...)
		missing = append(missing, gaps...)
	}
	if grid.tail != nil {
		if edge, ok := findEdge(buckets, qbtypes.CachedBucketTail, *grid.tail); ok {
			served = append(served, edge)
		} else {
			missing = append(missing, *grid.tail)
		}
	}
	return bc.serve(ctx, req, window, served, mergeAdjacent(missing))
}

func findEdge(buckets []decodedBucket, edge qbtypes.CachedBucketEdge, r qbtypes.TimeRange) (decodedBucket, bool) {
	for _, bucket := range buckets {
		if bucket.Edge == edge && bucket.StartMs == r.From && bucket.EndMs == r.To {
			return bucket, true
		}
	}
	return decodedBucket{}, false
}

// coverBody returns the body buckets that overlap body and the parts of body
// no bucket covers. Body buckets are disjoint and sorted.
func coverBody(buckets []decodedBucket, body qbtypes.TimeRange) ([]decodedBucket, []qbtypes.TimeRange) {
	var covering []decodedBucket
	var gaps []qbtypes.TimeRange
	cursor := body.From
	for _, bucket := range buckets {
		if bucket.Edge != qbtypes.CachedBucketBody || bucket.EndMs <= body.From {
			continue
		}
		if bucket.StartMs >= body.To {
			break
		}
		if cursor < bucket.StartMs {
			gaps = append(gaps, qbtypes.TimeRange{From: cursor, To: bucket.StartMs})
		}
		covering = append(covering, bucket)
		cursor = max(cursor, min(bucket.EndMs, body.To))
	}
	if cursor < body.To {
		gaps = append(gaps, qbtypes.TimeRange{From: cursor, To: body.To})
	}
	return covering, gaps
}

// mergeAdjacent joins ranges that touch, so a partial first step and the
// whole steps after it run as one statement.
func mergeAdjacent(ranges []qbtypes.TimeRange) []qbtypes.TimeRange {
	if len(ranges) == 0 {
		return nil
	}
	slices.SortFunc(ranges, func(a, b qbtypes.TimeRange) int {
		if a.From < b.From {
			return -1
		}
		if a.From > b.From {
			return 1
		}
		return 0
	})
	merged := []qbtypes.TimeRange{ranges[0]}
	for _, r := range ranges[1:] {
		last := &merged[len(merged)-1]
		if r.From <= last.To {
			last.To = max(last.To, r.To)
			continue
		}
		merged = append(merged, r)
	}
	return merged
}

// serve assembles the response of the served buckets, keeping the points
// inside window and the metadata of the buckets that contributed.
func (bc *bucketCache) serve(ctx context.Context, req CacheRequest, window qbtypes.TimeRange, served []decodedBucket, missing []qbtypes.TimeRange) (*qbtypes.Result, []qbtypes.TimeRange) {
	if len(served) == 0 {
		bc.count(ctx, bc.requests, "result", "miss")
		return nil, missing
	}
	if len(missing) == 0 {
		bc.count(ctx, bc.requests, "result", "hit")
	} else {
		bc.count(ctx, bc.requests, "result", "partial")
	}
	stepMs := uint64(req.Step.Milliseconds())
	parts := make([]*qbtypes.TimeSeriesData, 0, len(served))
	result := &qbtypes.Result{Type: req.Kind}
	for _, bucket := range served {
		keep := qbtypes.TimeRange{From: max(bucket.StartMs, window.From), To: min(bucket.EndMs, window.To)}
		parts = append(parts, selectPoints(bucket.data, func(v *qbtypes.TimeSeriesValue) bool {
			ts := uint64(v.Timestamp)
			if bucket.Edge != qbtypes.CachedBucketBody {
				return true
			}
			return ts >= keep.From && ts+stepMs <= keep.To
		}))
		// A body bucket may span far more than the window; its stats are
		// attributed to the window in proportion to the part served.
		share := float64(keep.To-keep.From) / float64(bucket.EndMs-bucket.StartMs)
		result.Stats.RowsScanned += uint64(float64(bucket.Stats.RowsScanned) * share)
		result.Stats.BytesScanned += uint64(float64(bucket.Stats.BytesScanned) * share)
		result.Stats.DurationMS += uint64(float64(bucket.Stats.DurationMS) * share)
		result.Warnings = append(result.Warnings, bucket.Warnings...)
		if result.WarningsDocURL == "" {
			result.WarningsDocURL = bucket.WarningsDocURL
		}
	}
	result.Warnings = dedupeWarnings(result.Warnings)
	data := mergeTimeSeriesData(parts)
	if req.TrimHeatmapAxis {
		for _, agg := range data.Aggregations {
			agg.TrimAxisToCountedBuckets()
		}
	}
	result.Value = data
	bc.logger.DebugContext(ctx, "served from cache", slog.String("key", req.Key), slog.Int("buckets", len(served)), slog.Any("missing", missing))
	return result, missing
}

// selectPoints copies data keeping only the points keep accepts and only the
// series and aggregations that still have points, which is what an uncached
// query over the same window returns.
func selectPoints(data *qbtypes.TimeSeriesData, keep func(*qbtypes.TimeSeriesValue) bool) *qbtypes.TimeSeriesData {
	out := &qbtypes.TimeSeriesData{QueryName: data.QueryName}
	for _, agg := range data.Aggregations {
		outAgg := &qbtypes.AggregationBucket{Index: agg.Index, Alias: agg.Alias, Meta: agg.Meta}
		for _, s := range agg.Series {
			values := make([]*qbtypes.TimeSeriesValue, 0, len(s.Values))
			for _, v := range s.Values {
				if keep(v) {
					values = append(values, v)
				}
			}
			if len(values) == 0 {
				continue
			}
			outAgg.Series = append(outAgg.Series, &qbtypes.TimeSeries{Labels: s.Labels, Values: values})
		}
		if len(outAgg.Series) > 0 {
			out.Aggregations = append(out.Aggregations, outAgg)
		}
	}
	return out
}

// Put stores the points of fresh that lie in window, split into a body bucket
// of whole steps and edge buckets for the partial ends, and drops what is
// still inside the flux interval. Body buckets that touch or overlap the new
// one are coalesced into it, with the new points replacing the old ones.
func (bc *bucketCache) Put(ctx context.Context, orgID valuer.UUID, req CacheRequest, window qbtypes.TimeRange, fresh *qbtypes.Result) {
	stepMs := uint64(req.Step.Milliseconds())
	if fresh == nil || stepMs == 0 || window.From >= window.To {
		return
	}
	switch fresh.Type {
	case qbtypes.RequestTypeTimeSeries, qbtypes.RequestTypeHeatmap:
	default:
		return
	}
	data, _ := fresh.Value.(*qbtypes.TimeSeriesData)
	if data == nil {
		data = &qbtypes.TimeSeriesData{}
	}
	now := time.Now()
	boundary := uint64(now.Add(-bc.fluxInterval).UnixMilli())
	grid := gridOf(window, stepMs)

	var incoming []decodedBucket
	newBucket := func(edge qbtypes.CachedBucketEdge, r qbtypes.TimeRange, keep func(ts uint64) bool) {
		points := selectPoints(data, func(v *qbtypes.TimeSeriesValue) bool { return keep(uint64(v.Timestamp)) })
		value, err := encodeBucketValue(points)
		if err != nil {
			bc.logger.WarnContext(ctx, "not caching result that does not serialise", errors.Attr(err))
			return
		}
		incoming = append(incoming, decodedBucket{
			CachedBucket: &qbtypes.CachedBucket{
				StartMs: r.From, EndMs: r.To, Edge: edge, WrittenAtMs: now.UnixMilli(), Type: fresh.Type, Value: value,
				Stats: fresh.Stats, Warnings: fresh.Warnings, WarningsDocURL: fresh.WarningsDocURL,
			},
			data: points,
		})
	}
	// A partial end covers rows up to its window end, so it is final once
	// that end is older than the boundary.
	if grid.whole != nil {
		if grid.whole.To <= boundary {
			start, end := alignDown(grid.whole.From, stepMs), grid.whole.To
			newBucket(qbtypes.CachedBucketWhole, *grid.whole, func(ts uint64) bool { return ts >= start && ts < end })
		}
	} else {
		if grid.head != nil && grid.head.To <= boundary {
			start := alignDown(grid.head.From, stepMs)
			newBucket(qbtypes.CachedBucketHead, *grid.head, func(ts uint64) bool { return ts == start })
		}
		if grid.body != nil {
			body := *grid.body
			if boundary < body.To {
				body.To = alignDown(boundary, stepMs)
			}
			if body.From < body.To {
				newBucket(qbtypes.CachedBucketBody, body, func(ts uint64) bool { return ts >= body.From && ts+stepMs <= body.To })
			}
		}
		if grid.tail != nil && grid.tail.To <= boundary {
			newBucket(qbtypes.CachedBucketTail, *grid.tail, func(ts uint64) bool { return ts == grid.tail.From })
		}
	}
	if len(incoming) == 0 {
		return
	}

	lock := &bc.keyLocks[keyShard(req.Key)]
	lock.Lock()
	defer lock.Unlock()

	var existing qbtypes.CachedData
	if err := bc.cache.Get(ctx, orgID, req.Key, &existing); err != nil && !errors.Ast(err, errors.TypeNotFound) {
		bc.logger.DebugContext(ctx, "cache read failed before write, starting a new entry", errors.Attr(err))
	}
	// Every bucket of the entry is kept, so the read spans all time.
	entry := bc.merge(ctx, bc.decode(ctx, existing.Buckets, qbtypes.TimeRange{To: ^uint64(0)}), incoming)
	if err := bc.cache.Set(ctx, orgID, req.Key, &entry, bc.cacheTTL); err != nil {
		bc.logger.WarnContext(ctx, "cache write failed", errors.Attr(err))
	}
}

func keyShard(key string) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(key))
	return int(h.Sum32() % 64)
}

// merge folds incoming buckets into the decoded entry: a body bucket absorbs
// every body bucket it touches, an edge bucket replaces the edge bucket with
// the same range. The result is sorted body buckets followed by edge buckets,
// the newest edge buckets last.
func (bc *bucketCache) merge(ctx context.Context, existing []decodedBucket, incoming []decodedBucket) qbtypes.CachedData {
	var bodies []decodedBucket
	var edges []*qbtypes.CachedBucket
	for _, bucket := range existing {
		if bucket.Edge == qbtypes.CachedBucketBody {
			bodies = append(bodies, bucket)
		} else {
			edges = append(edges, bucket.CachedBucket)
		}
	}
	for _, bucket := range incoming {
		if bucket.Edge != qbtypes.CachedBucketBody {
			edges = slices.DeleteFunc(edges, func(e *qbtypes.CachedBucket) bool {
				return e.Edge == bucket.Edge && e.StartMs == bucket.StartMs && e.EndMs == bucket.EndMs
			})
			edges = append(edges, bucket.CachedBucket)
			continue
		}
		bodies = bc.coalesce(ctx, bodies, bucket)
	}
	if len(edges) > maxEdgeBuckets {
		edges = edges[len(edges)-maxEdgeBuckets:]
	}
	slices.SortStableFunc(bodies, func(a, b decodedBucket) int {
		if a.StartMs < b.StartMs {
			return -1
		}
		if a.StartMs > b.StartMs {
			return 1
		}
		return 0
	})
	entry := qbtypes.CachedData{Buckets: make([]*qbtypes.CachedBucket, 0, len(bodies)+len(edges))}
	for _, bucket := range bodies {
		entry.Buckets = append(entry.Buckets, bucket.CachedBucket)
	}
	entry.Buckets = append(entry.Buckets, edges...)
	return entry
}

// coalesce replaces the body buckets that touch or overlap fresh with one
// bucket spanning them all. Points of fresh win inside its range; points of
// the older buckets outside it are kept. The oldest write time is kept, so
// the whole bucket expires when its oldest points do.
func (bc *bucketCache) coalesce(ctx context.Context, bodies []decodedBucket, fresh decodedBucket) []decodedBucket {
	var parts []*qbtypes.TimeSeriesData
	merged := *fresh.CachedBucket
	kept := bodies[:0:0]
	for _, bucket := range bodies {
		if bucket.EndMs < fresh.StartMs || bucket.StartMs > fresh.EndMs {
			kept = append(kept, bucket)
			continue
		}
		parts = append(parts, selectPoints(bucket.data, func(v *qbtypes.TimeSeriesValue) bool {
			ts := uint64(v.Timestamp)
			return ts < fresh.StartMs || ts >= fresh.EndMs
		}))
		merged.StartMs = min(merged.StartMs, bucket.StartMs)
		merged.EndMs = max(merged.EndMs, bucket.EndMs)
		merged.WrittenAtMs = min(merged.WrittenAtMs, bucket.WrittenAtMs)
		merged.Stats.RowsScanned += bucket.Stats.RowsScanned
		merged.Stats.BytesScanned += bucket.Stats.BytesScanned
		merged.Stats.DurationMS += bucket.Stats.DurationMS
		merged.Warnings = append(merged.Warnings, bucket.Warnings...)
		if merged.WarningsDocURL == "" {
			merged.WarningsDocURL = bucket.WarningsDocURL
		}
	}
	if len(parts) == 0 {
		return append(kept, fresh)
	}
	data := mergeTimeSeriesData(append(parts, fresh.data))
	value, err := encodeBucketValue(data)
	if err != nil {
		bc.logger.WarnContext(ctx, "coalesced bucket does not serialise, keeping the fresh bucket alone", errors.Attr(err))
		return append(kept, fresh)
	}
	merged.Value = value
	merged.Warnings = dedupeWarnings(merged.Warnings)
	return append(kept, decodedBucket{CachedBucket: &merged, data: data})
}

// mergeTimeSeriesData joins parts by aggregation index and series labels.
// For one timestamp a later part replaces an earlier one, except that a
// partial point never replaces a whole one. Aggregations come back sorted by
// index and values by timestamp; the metadata of the first part that carries
// an aggregation is kept. Heatmap parts are re-indexed onto the union of
// their axes, since each part holds only the bands its own data reached.
func mergeTimeSeriesData(parts []*qbtypes.TimeSeriesData) *qbtypes.TimeSeriesData {
	type seriesKey struct {
		index int
		key   string
	}
	aggregations := map[int]*qbtypes.AggregationBucket{}
	series := map[seriesKey]*qbtypes.TimeSeries{}
	points := map[seriesKey]map[int64]*qbtypes.TimeSeriesValue{}
	axes := qbtypes.MergeBucketUpperBounds(parts...)
	out := &qbtypes.TimeSeriesData{}
	for _, part := range parts {
		if part == nil {
			continue
		}
		if out.QueryName == "" {
			out.QueryName = part.QueryName
		}
		for _, agg := range part.Aggregations {
			if agg == nil {
				continue
			}
			agg = reindexedOnto(agg, axes[agg.Index])
			if _, ok := aggregations[agg.Index]; !ok {
				aggregations[agg.Index] = &qbtypes.AggregationBucket{Index: agg.Index, Alias: agg.Alias, Meta: agg.Meta}
			}
			for _, s := range agg.Series {
				if s == nil {
					continue
				}
				k := seriesKey{index: agg.Index, key: qbtypes.GetUniqueSeriesKey(s.Labels)}
				if _, ok := series[k]; !ok {
					series[k] = &qbtypes.TimeSeries{Labels: s.Labels}
					points[k] = map[int64]*qbtypes.TimeSeriesValue{}
				}
				for _, v := range s.Values {
					if v == nil {
						continue
					}
					if current, ok := points[k][v.Timestamp]; ok && v.Partial && !current.Partial {
						continue
					}
					points[k][v.Timestamp] = v
				}
			}
		}
	}
	indexes := make([]int, 0, len(aggregations))
	for index := range aggregations {
		indexes = append(indexes, index)
	}
	slices.Sort(indexes)
	keys := make([]seriesKey, 0, len(series))
	for k := range series {
		keys = append(keys, k)
	}
	slices.SortFunc(keys, func(a, b seriesKey) int {
		if a.index != b.index {
			return a.index - b.index
		}
		if a.key < b.key {
			return -1
		}
		if a.key > b.key {
			return 1
		}
		return 0
	})
	for _, k := range keys {
		s := series[k]
		s.Values = make([]*qbtypes.TimeSeriesValue, 0, len(points[k]))
		for _, v := range points[k] {
			s.Values = append(s.Values, v)
		}
		slices.SortFunc(s.Values, func(a, b *qbtypes.TimeSeriesValue) int {
			if a.Timestamp < b.Timestamp {
				return -1
			}
			if a.Timestamp > b.Timestamp {
				return 1
			}
			return 0
		})
		aggregations[k.index].Series = append(aggregations[k.index].Series, s)
	}
	for _, index := range indexes {
		out.Aggregations = append(out.Aggregations, aggregations[index])
	}
	return out
}

// reindexedOnto returns agg with its heatmap counts moved onto the axis
// onto, copying the points so the caller's data is left as it is.
func reindexedOnto(agg *qbtypes.AggregationBucket, onto []float64) *qbtypes.AggregationBucket {
	if len(onto) == 0 || slices.Equal(agg.Meta.Buckets, onto) {
		return agg
	}
	copied := &qbtypes.AggregationBucket{Index: agg.Index, Alias: agg.Alias, Meta: agg.Meta, Series: make([]*qbtypes.TimeSeries, 0, len(agg.Series))}
	for _, s := range agg.Series {
		if s == nil {
			continue
		}
		values := make([]*qbtypes.TimeSeriesValue, 0, len(s.Values))
		for _, v := range s.Values {
			if v == nil {
				continue
			}
			point := *v
			values = append(values, &point)
		}
		copied.Series = append(copied.Series, &qbtypes.TimeSeries{Labels: s.Labels, Values: values})
	}
	copied.ReindexValuesToNewUpperBounds(onto)
	return copied
}
