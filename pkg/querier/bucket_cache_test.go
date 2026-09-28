package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"sync"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/types/cachetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	cacheTTL            = 1 * time.Hour
	defaultFluxInterval = 5 * time.Minute
)

func createTestCache(t *testing.T) cache.Cache {
	config := cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	}
	memCache, err := cachetest.New(config)
	require.NoError(t, err)
	return memCache
}

// mockQuery is the query a cache test speaks about: a fingerprint and a window.
type mockQuery struct {
	fingerprint string
	startMs     uint64
	endMs       uint64
	result      *qbtypes.Result
}

func (m *mockQuery) Fingerprint() string      { return m.fingerprint }
func (m *mockQuery) Window() (uint64, uint64) { return m.startMs, m.endMs }

func (m *mockQuery) Execute(context.Context) (*qbtypes.Result, error) {
	if m.result != nil {
		return m.result, nil
	}
	return &qbtypes.Result{
		Type:  qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{},
		Stats: qbtypes.ExecStats{RowsScanned: 100, BytesScanned: 1000, DurationMS: 10},
	}, nil
}

func (m *mockQuery) window() qbtypes.TimeRange {
	return qbtypes.TimeRange{From: m.startMs, To: m.endMs}
}

func cacheRequest(q *mockQuery, step qbtypes.Step) CacheRequest {
	return CacheRequest{Key: CacheKey(q.fingerprint), Window: q.window(), Step: step, Kind: qbtypes.RequestTypeTimeSeries}
}

// put stores result as the answer for the query's whole window.
func put(bc BucketCache, q *mockQuery, step qbtypes.Step, result *qbtypes.Result) {
	bc.Put(context.Background(), valuer.UUID{}, cacheRequest(q, step), q.window(), result)
}

func get(bc BucketCache, q *mockQuery, step qbtypes.Step) (*qbtypes.Result, []qbtypes.TimeRange) {
	return bc.GetMissRanges(context.Background(), valuer.UUID{}, cacheRequest(q, step))
}

func createTestBucketCache(t *testing.T) *bucketCache {
	return NewBucketCache(instrumentationtest.New().ToProviderSettings(), createTestCache(t), cacheTTL, defaultFluxInterval).(*bucketCache)
}

func stepOf(d time.Duration) qbtypes.Step { return qbtypes.Step{Duration: d} }

func createTestTimeSeries(queryName string, startMs, endMs uint64, step uint64) *qbtypes.TimeSeriesData {
	series := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{
			{Key: telemetrytypes.TelemetryFieldKey{Name: "method", FieldDataType: telemetrytypes.FieldDataTypeString}, Value: "GET"},
			{Key: telemetrytypes.TelemetryFieldKey{Name: "status", FieldDataType: telemetrytypes.FieldDataTypeString}, Value: "200"},
		},
	}
	for ts := startMs; ts < endMs; ts += step {
		series.Values = append(series.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(ts), Value: float64(ts % 100)})
	}
	return &qbtypes.TimeSeriesData{
		QueryName:    queryName,
		Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Alias: "__result_0", Series: []*qbtypes.TimeSeries{series}}},
	}
}

func timestampsOf(t *testing.T, result *qbtypes.Result) []int64 {
	t.Helper()
	require.NotNil(t, result)
	tsData, ok := result.Value.(*qbtypes.TimeSeriesData)
	require.True(t, ok)
	var out []int64
	for _, agg := range tsData.Aggregations {
		for _, s := range agg.Series {
			for _, v := range s.Values {
				out = append(out, v.Timestamp)
			}
		}
	}
	return out
}

func TestBucketCache_EmptyCacheIsTheWholeWindow(t *testing.T) {
	bc := createTestBucketCache(t)
	query := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 5000}

	cached, missing := get(bc, query, stepOf(time.Second))

	assert.Nil(t, cached)
	assert.Equal(t, []qbtypes.TimeRange{{From: 1000, To: 5000}}, missing)
}

func TestBucketCache_FullHitReturnsPointsStatsWarningsAndMetadata(t *testing.T) {
	bc := createTestBucketCache(t)
	query := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 5000}
	data := createTestTimeSeries("A", 1000, 5000, 1000)
	data.Aggregations[0].Meta.Unit = "ms"
	put(bc, query, stepOf(time.Second), &qbtypes.Result{
		Type:           qbtypes.RequestTypeTimeSeries,
		Value:          data,
		Stats:          qbtypes.ExecStats{RowsScanned: 100, BytesScanned: 1000, DurationMS: 10},
		Warnings:       []string{"test warning"},
		WarningsDocURL: "https://example.test/warnings",
	})

	cached, missing := get(bc, query, stepOf(time.Second))

	require.NotNil(t, cached)
	assert.Empty(t, missing)
	assert.Equal(t, qbtypes.RequestTypeTimeSeries, cached.Type)
	assert.Equal(t, uint64(100), cached.Stats.RowsScanned)
	assert.Equal(t, []string{"test warning"}, cached.Warnings)
	assert.Equal(t, "https://example.test/warnings", cached.WarningsDocURL)
	assert.Equal(t, []int64{1000, 2000, 3000, 4000}, timestampsOf(t, cached))
	tsData := cached.Value.(*qbtypes.TimeSeriesData)
	assert.Equal(t, "__result_0", tsData.Aggregations[0].Alias)
	assert.Equal(t, "ms", tsData.Aggregations[0].Meta.Unit)
}

func TestBucketCache_PartialHitReportsTheGap(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	first := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 3000}
	put(bc, first, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", 1000, 3000, 1000)})

	second := &mockQuery{fingerprint: "test-query", startMs: 2000, endMs: 5000}
	cached, missing := get(bc, second, step)

	assert.Equal(t, []int64{2000}, timestampsOf(t, cached))
	assert.Equal(t, []qbtypes.TimeRange{{From: 3000, To: 5000}}, missing)
}

func TestBucketCache_GapsBetweenBucketsAreMissingAndAdjacentGapsMerge(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(100 * time.Millisecond)
	for _, window := range [][2]uint64{{1000, 2000}, {3000, 4000}} {
		query := &mockQuery{fingerprint: "test-query", startMs: window[0], endMs: window[1]}
		put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", window[0], window[1], 100)})
	}

	query := &mockQuery{fingerprint: "test-query", startMs: 500, endMs: 4500}
	cached, missing := get(bc, query, step)

	require.NotNil(t, cached)
	assert.Equal(t, []qbtypes.TimeRange{{From: 500, To: 1000}, {From: 2000, To: 3000}, {From: 4000, To: 4500}}, missing)
}

func TestBucketCache_WindowInsideFluxIntervalIsNotCached(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	nowMs := uint64(time.Now().UnixMilli())
	query := &mockQuery{fingerprint: "test-query", startMs: nowMs - 60_000, endMs: nowMs}
	put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", query.startMs, query.endMs, 1000)})

	cached, missing := get(bc, query, step)

	assert.Nil(t, cached)
	assert.Equal(t, []qbtypes.TimeRange{query.window()}, missing)
}

func TestBucketCache_OnlyIntervalsOlderThanTheFluxBoundaryAreCached(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	boundary := uint64(time.Now().Add(-defaultFluxInterval).UnixMilli())
	boundary -= boundary % 1000
	query := &mockQuery{fingerprint: "test-query", startMs: boundary - 10_000, endMs: boundary + 10_000}
	put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", query.startMs, query.endMs, 1000)})

	cached, missing := get(bc, query, step)

	require.NotNil(t, cached)
	for _, ts := range timestampsOf(t, cached) {
		assert.LessOrEqual(t, uint64(ts)+1000, boundary, "a point whose interval reaches past the boundary was cached")
	}
	require.Len(t, missing, 1)
	assert.LessOrEqual(t, missing[0].From, boundary)
	assert.Equal(t, query.endMs, missing[0].To)
}

func TestBucketCache_RawAndScalarResultsAreNotCached(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	for name, result := range map[string]*qbtypes.Result{
		"raw":    {Type: qbtypes.RequestTypeRaw, Value: &qbtypes.RawData{Rows: []*qbtypes.RawRow{{Timestamp: time.Unix(1, 0), Data: map[string]any{"value": 10.5}}}}},
		"scalar": {Type: qbtypes.RequestTypeScalar, Value: &qbtypes.ScalarData{Data: [][]any{{42.5}}}},
	} {
		t.Run(name, func(t *testing.T) {
			query := &mockQuery{fingerprint: "test-" + name, startMs: 1000, endMs: 5000}
			put(bc, query, step, result)
			cached, missing := get(bc, query, step)
			assert.Nil(t, cached)
			assert.Equal(t, []qbtypes.TimeRange{{From: 1000, To: 5000}}, missing)
		})
	}
}

func TestBucketCache_EmptyResultIsCachedAsNoData(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	query := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 5000}
	put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: &qbtypes.TimeSeriesData{}})

	cached, missing := get(bc, query, step)

	require.NotNil(t, cached)
	assert.Empty(t, missing)
	assert.Empty(t, cached.Value.(*qbtypes.TimeSeriesData).Aggregations)
}

func TestBucketCache_PartialPointsServeOnlyTheSameWindowEnd(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	query := &mockQuery{fingerprint: "test-query", startMs: 1500, endMs: 4500}
	put(bc, query, step, &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{Aggregations: []*qbtypes.AggregationBucket{{Series: []*qbtypes.TimeSeries{{
			Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "host"}, Value: "server1"}},
			Values: []*qbtypes.TimeSeriesValue{
				{Timestamp: 1000, Value: 10, Partial: true},
				{Timestamp: 2000, Value: 20},
				{Timestamp: 3000, Value: 30},
				{Timestamp: 4000, Value: 40, Partial: true},
			},
		}}}}},
	})

	cached, missing := get(bc, query, step)
	assert.Empty(t, missing, "the identical window is a full hit, partial ends included")
	assert.Equal(t, []int64{1000, 2000, 3000, 4000}, timestampsOf(t, cached))
	partials := 0
	for _, v := range cached.Value.(*qbtypes.TimeSeriesData).Aggregations[0].Series[0].Values {
		if v.Partial {
			partials++
		}
	}
	assert.Equal(t, 2, partials, "partial points keep their flag")

	other := &mockQuery{fingerprint: "test-query", startMs: 1500, endMs: 4200}
	cached, missing = get(bc, other, step)
	assert.Equal(t, []int64{1000, 2000, 3000}, timestampsOf(t, cached))
	assert.Equal(t, []qbtypes.TimeRange{{From: 4000, To: 4200}}, missing, "a different partial end must be fetched")
}

func TestBucketCache_NarrowerWindowServesOnlyWholeIntervalsInsideIt(t *testing.T) {
	bc := createTestBucketCache(t)
	step := stepOf(time.Second)
	wide := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 5000}
	put(bc, wide, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", 1000, 5000, 1000)})

	narrow := &mockQuery{fingerprint: "test-query", startMs: 2000, endMs: 3500}
	cached, missing := get(bc, narrow, step)

	assert.Equal(t, []int64{2000}, timestampsOf(t, cached))
	assert.Equal(t, []qbtypes.TimeRange{{From: 3000, To: 3500}}, missing, "the interval the window ends inside is fetched as a partial")
}

func TestBucketCache_PromQLWindowKeepsTheInstantAtItsEnd(t *testing.T) {
	// A PromQL query reports its window half-open on the grid, one step past
	// the last evaluated instant, so that instant is inside the window.
	bc := createTestBucketCache(t)
	step := stepOf(time.Minute)
	query := &mockQuery{fingerprint: "promql", startMs: 600_000, endMs: 900_000 + 60_000}
	put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", 600_000, 960_000, 60_000)})

	cached, missing := get(bc, query, step)

	assert.Empty(t, missing)
	assert.Equal(t, []int64{600_000, 660_000, 720_000, 780_000, 840_000, 900_000}, timestampsOf(t, cached))
}

func TestBucketCache_StepZeroIsNeverCached(t *testing.T) {
	bc := createTestBucketCache(t)
	query := &mockQuery{fingerprint: "test-query", startMs: 1000, endMs: 5000}
	put(bc, query, qbtypes.Step{}, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: createTestTimeSeries("A", 1000, 5000, 1000)})

	cached, missing := get(bc, query, qbtypes.Step{})

	assert.Nil(t, cached)
	assert.Equal(t, []qbtypes.TimeRange{{From: 1000, To: 5000}}, missing)
}

func TestBucketCache_KeyIsHashedAndVersioned(t *testing.T) {
	key := CacheKey("builder&signal=logs&filter=service.name = 'a'")
	assert.Regexp(t, `^v5:query:`+cacheSchemaVersion+`:[0-9a-f]{40}$`, key)
	assert.NotEqual(t, key, CacheKey("builder&signal=logs&filter=service.name = 'b'"))
}

const (
	// 2023-01-01T00:00:00Z, far older than any flux interval and on every grid.
	epochMs      = uint64(1672531200000)
	minuteStepMs = uint64(60_000)
)

func minuteStep() qbtypes.Step { return qbtypes.Step{Duration: time.Minute} }

// minuteSeries is one series labelled service=<name> with one point per
// minute in [startMs, endMs).
func minuteSeries(name string, startMs, endMs uint64, value float64) *qbtypes.TimeSeries {
	s := &qbtypes.TimeSeries{
		Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: name}},
	}
	for ts := startMs; ts < endMs; ts += minuteStepMs {
		s.Values = append(s.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(ts), Value: value})
	}
	return s
}

func seriesResult(rows uint64, series ...*qbtypes.TimeSeries) *qbtypes.Result {
	return &qbtypes.Result{
		Type: qbtypes.RequestTypeTimeSeries,
		Value: &qbtypes.TimeSeriesData{
			Aggregations: []*qbtypes.AggregationBucket{{Index: 0, Alias: "__result_0", Series: series}},
		},
		Stats: qbtypes.ExecStats{RowsScanned: rows},
	}
}

func storedEntry(t *testing.T, bc *bucketCache, orgID valuer.UUID, fingerprint string) *qbtypes.CachedData {
	t.Helper()
	data := &qbtypes.CachedData{}
	require.NoError(t, bc.cache.Get(context.Background(), orgID, CacheKey(fingerprint), data))
	return data
}

func bucketTimestamps(t *testing.T, bucket *qbtypes.CachedBucket) []uint64 {
	t.Helper()
	tsData, err := decodeBucketValue(bucket.Value)
	require.NoError(t, err)
	var out []uint64
	for _, agg := range tsData.Aggregations {
		for _, s := range agg.Series {
			for _, v := range s.Values {
				out = append(out, uint64(v.Timestamp))
			}
		}
	}
	return out
}

func TestBucketCache_BucketsHoldOnlyThePointsOfTheirRange(t *testing.T) {
	bc := createTestBucketCache(t)
	orgID := valuer.UUID{}

	// Both ends 30s off the grid: a head, a body and a tail bucket.
	query := &mockQuery{fingerprint: "bounds", startMs: epochMs + 30_000, endMs: epochMs + 10*minuteStepMs + 30_000}
	series := minuteSeries("a", epochMs, epochMs+11*minuteStepMs, 1)
	series.Values[0].Partial, series.Values[10].Partial = true, true
	bc.Put(context.Background(), orgID, cacheRequest(query, minuteStep()), query.window(), seriesResult(1, series))

	data := storedEntry(t, bc, orgID, query.fingerprint)
	require.Len(t, data.Buckets, 3)
	for _, bucket := range data.Buckets {
		timestamps := bucketTimestamps(t, bucket)
		switch bucket.Edge {
		case qbtypes.CachedBucketBody:
			assert.Equal(t, qbtypes.TimeRange{From: epochMs + minuteStepMs, To: epochMs + 10*minuteStepMs}, qbtypes.TimeRange{From: bucket.StartMs, To: bucket.EndMs})
			for _, ts := range timestamps {
				assert.True(t, ts >= bucket.StartMs && ts+minuteStepMs <= bucket.EndMs, "point %d is outside the body bucket [%d, %d)", ts, bucket.StartMs, bucket.EndMs)
			}
			assert.Len(t, timestamps, 9)
		case qbtypes.CachedBucketHead:
			assert.Equal(t, []uint64{epochMs}, timestamps, "the head bucket holds the partial first step only")
		case qbtypes.CachedBucketTail:
			assert.Equal(t, []uint64{epochMs + 10*minuteStepMs}, timestamps, "the tail bucket holds the partial last step only")
		default:
			t.Fatalf("unexpected edge %q", bucket.Edge)
		}
	}
}

func TestBucketCache_WindowInsideTwoPartialStepsKeepsBothPoints(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	query := &mockQuery{fingerprint: "two-partials", startMs: epochMs + 30_000, endMs: epochMs + 90_000}
	series := minuteSeries("a", epochMs, epochMs+2*minuteStepMs, 1)
	series.Values[0].Partial, series.Values[1].Partial = true, true
	put(bc, query, step, seriesResult(1, series))

	cached, missing := get(bc, query, step)

	assert.Empty(t, missing)
	assert.Equal(t, []int64{int64(epochMs), int64(epochMs + minuteStepMs)}, timestampsOf(t, cached))
}

func TestBucketCache_IntervalStraddlingTheFluxBoundaryIsNotCached(t *testing.T) {
	now := time.Now()
	// The boundary sits 30s into a step so a few ms of drift between this
	// test and Put cannot move it to another step.
	intervalStart := now.Truncate(time.Minute).Add(-5 * time.Minute)
	boundary := intervalStart.Add(30 * time.Second)
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), createTestCache(t), time.Hour, now.Sub(boundary)).(*bucketCache)
	orgID := valuer.UUID{}

	query := &mockQuery{fingerprint: "flux-straddle", startMs: uint64(intervalStart.Add(-10 * time.Minute).UnixMilli()), endMs: uint64(now.UnixMilli())}
	result := seriesResult(1, minuteSeries("a", query.startMs, uint64(intervalStart.Add(2*time.Minute).UnixMilli()), 1))
	bc.Put(context.Background(), orgID, cacheRequest(query, minuteStep()), query.window(), result)

	boundaryMs := uint64(boundary.UnixMilli())
	data := storedEntry(t, bc, orgID, query.fingerprint)
	require.NotEmpty(t, data.Buckets)
	for _, bucket := range data.Buckets {
		assert.LessOrEqual(t, bucket.EndMs, boundaryMs)
		for _, ts := range bucketTimestamps(t, bucket) {
			assert.LessOrEqual(t, ts+minuteStepMs, boundaryMs, "the step starting at %d reaches past the flux boundary %d", ts, boundaryMs)
		}
	}
	cached, _ := get(bc, query, minuteStep())
	assert.NotContains(t, timestampsOf(t, cached), intervalStart.UnixMilli())
}

func TestBucketCache_SlidingWindowCoalescesIntoOneBodyBucket(t *testing.T) {
	bc := createTestBucketCache(t)
	orgID := valuer.UUID{}
	window := uint64(time.Hour.Milliseconds())

	single := &mockQuery{fingerprint: "single", startMs: epochMs, endMs: epochMs + window}
	put(bc, single, minuteStep(), seriesResult(100, minuteSeries("a", single.startMs, single.endMs, 1)))
	oneWindowCost := storedEntry(t, bc, orgID, single.fingerprint).Cost()

	for i := uint64(0); i < 10; i++ {
		startMs := epochMs + i*minuteStepMs
		query := &mockQuery{fingerprint: "sliding", startMs: startMs, endMs: startMs + window}
		put(bc, query, minuteStep(), seriesResult(100, minuteSeries("a", startMs, startMs+window, 1)))
	}

	data := storedEntry(t, bc, orgID, "sliding")
	require.Len(t, data.Buckets, 1)
	assert.Equal(t, qbtypes.TimeRange{From: epochMs, To: epochMs + window + 9*minuteStepMs}, qbtypes.TimeRange{From: data.Buckets[0].StartMs, To: data.Buckets[0].EndMs})
	assert.LessOrEqual(t, data.Cost(), oneWindowCost+oneWindowCost/4)
}

func TestBucketCache_FreshPointsReplaceOlderOnesWhenBucketsCoalesce(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	first := &mockQuery{fingerprint: "coalesce", startMs: epochMs, endMs: epochMs + 4*minuteStepMs}
	put(bc, first, step, seriesResult(1, minuteSeries("a", first.startMs, first.endMs, 1)))
	second := &mockQuery{fingerprint: "coalesce", startMs: epochMs + 2*minuteStepMs, endMs: epochMs + 6*minuteStepMs}
	put(bc, second, step, seriesResult(1, minuteSeries("a", second.startMs, second.endMs, 2)))

	whole := &mockQuery{fingerprint: "coalesce", startMs: epochMs, endMs: epochMs + 6*minuteStepMs}
	cached, missing := get(bc, whole, step)

	require.Empty(t, missing)
	var values []float64
	for _, v := range cached.Value.(*qbtypes.TimeSeriesData).Aggregations[0].Series[0].Values {
		values = append(values, v.Value)
	}
	assert.Equal(t, []float64{1, 1, 2, 2, 2, 2}, values)
}

func TestBucketCache_StatsCountEachFetchOnce(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	window := uint64(time.Hour.Milliseconds())

	first := &mockQuery{fingerprint: "stats", startMs: epochMs, endMs: epochMs + window}
	put(bc, first, step, seriesResult(100, minuteSeries("a", first.startMs, first.endMs, 1)))

	// The window slides by one step; only the new minute is fetched.
	second := &mockQuery{fingerprint: "stats", startMs: epochMs + minuteStepMs, endMs: epochMs + window + minuteStepMs}
	cached, missing := get(bc, second, step)
	require.NotNil(t, cached)
	require.Equal(t, []qbtypes.TimeRange{{From: epochMs + window, To: epochMs + window + minuteStepMs}}, missing)
	bc.Put(context.Background(), valuer.UUID{}, cacheRequest(second, step), missing[0], seriesResult(10, minuteSeries("a", missing[0].From, missing[0].To, 1)))

	cached, missing = get(bc, second, step)
	require.Empty(t, missing)
	// 110 rows were scanned for 61 minutes; the window covers 60 of them.
	assert.InDelta(t, 110, cached.Stats.RowsScanned, 2)
}

func TestBucketCache_WarningsBelongToTheWindowThatProducedThem(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	warned := &mockQuery{fingerprint: "warnings", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
	withWarning := seriesResult(1, minuteSeries("a", warned.startMs, warned.endMs, 1))
	withWarning.Warnings = []string{"trace lies outside the selected time range"}
	put(bc, warned, step, withWarning)
	clean := &mockQuery{fingerprint: "warnings", startMs: epochMs + 20*minuteStepMs, endMs: epochMs + 30*minuteStepMs}
	put(bc, clean, step, seriesResult(1, minuteSeries("a", clean.startMs, clean.endMs, 1)))

	cached, missing := get(bc, clean, step)
	require.Empty(t, missing)
	assert.Empty(t, cached.Warnings)

	cached, _ = get(bc, warned, step)
	assert.Equal(t, withWarning.Warnings, cached.Warnings)
}

func TestBucketCache_AggregationsKeepIndexOrder(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	for attempt := 0; attempt < 8; attempt++ {
		query := &mockQuery{fingerprint: fmt.Sprintf("agg-order-%d", attempt), startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
		tsData := &qbtypes.TimeSeriesData{}
		for idx := 2; idx >= 0; idx-- {
			tsData.Aggregations = append(tsData.Aggregations, &qbtypes.AggregationBucket{
				Index:  idx,
				Alias:  fmt.Sprintf("__result_%d", idx),
				Series: []*qbtypes.TimeSeries{minuteSeries("a", query.startMs, query.endMs, float64(idx))},
			})
		}
		put(bc, query, step, &qbtypes.Result{Type: qbtypes.RequestTypeTimeSeries, Value: tsData})

		cached, _ := get(bc, query, step)
		got := cached.Value.(*qbtypes.TimeSeriesData)
		require.Len(t, got.Aggregations, 3)
		for idx, agg := range got.Aggregations {
			assert.Equal(t, idx, agg.Index)
			assert.Equal(t, fmt.Sprintf("__result_%d", idx), agg.Alias)
		}
	}
}

func TestBucketCache_UnreadableBucketIsFetchedAgain(t *testing.T) {
	bc := createTestBucketCache(t)
	orgID := valuer.GenerateUUID()
	ctx := context.Background()
	step := minuteStep()
	query := &mockQuery{fingerprint: "unreadable", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}

	payloads := map[string]string{
		"incompatible_json":  `{"aggregations":"not-a-list"}`,
		"null_point_element": `{"aggregations":[{"index":0,"series":[{"labels":[],"points":[null]}]}]}`,
		"null_series":        `{"aggregations":[{"index":0,"series":[null]}]}`,
		"null_bucket":        "",
	}
	for name, payload := range payloads {
		t.Run(name, func(t *testing.T) {
			bucket := &qbtypes.CachedBucket{StartMs: query.startMs, EndMs: query.endMs, WrittenAtMs: time.Now().UnixMilli(), Type: qbtypes.RequestTypeTimeSeries, Value: json.RawMessage(payload)}
			if payload == "" {
				bucket = nil
			}
			require.NoError(t, bc.cache.Set(ctx, orgID, CacheKey(query.fingerprint), &qbtypes.CachedData{Buckets: []*qbtypes.CachedBucket{bucket}}, time.Hour))

			var missing []qbtypes.TimeRange
			require.NotPanics(t, func() { _, missing = bc.GetMissRanges(ctx, orgID, cacheRequest(query, step)) })
			assert.Equal(t, []qbtypes.TimeRange{query.window()}, missing)

			// The next write replaces the unreadable bucket.
			bc.Put(ctx, orgID, cacheRequest(query, step), query.window(), seriesResult(1, minuteSeries("a", query.startMs, query.endMs, 1)))
			_, missing = bc.GetMissRanges(ctx, orgID, cacheRequest(query, step))
			assert.Empty(t, missing)
		})
	}
}

func TestBucketCache_PartiallyCoveredStepIsFetched(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	warm := &mockQuery{fingerprint: "partial-step", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
	put(bc, warm, step, seriesResult(1, minuteSeries("a", warm.startMs, warm.endMs, 1)))

	cases := map[string]struct {
		startMs, endMs uint64
		missing        []qbtypes.TimeRange
	}{
		"window_shorter_than_a_step": {
			startMs: epochMs + 10_000, endMs: epochMs + 40_000,
			missing: []qbtypes.TimeRange{{From: epochMs + 10_000, To: epochMs + 40_000}},
		},
		"window_ends_inside_a_step": {
			startMs: epochMs, endMs: epochMs + 5*minuteStepMs + 30_000,
			missing: []qbtypes.TimeRange{{From: epochMs + 5*minuteStepMs, To: epochMs + 5*minuteStepMs + 30_000}},
		},
		"window_starts_inside_a_step": {
			startMs: epochMs + 30_000, endMs: epochMs + 5*minuteStepMs,
			missing: []qbtypes.TimeRange{{From: epochMs + 30_000, To: epochMs + minuteStepMs}},
		},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			query := &mockQuery{fingerprint: "partial-step", startMs: tc.startMs, endMs: tc.endMs}
			cached, missing := get(bc, query, step)
			assert.Equal(t, tc.missing, missing)
			if cached != nil {
				for _, ts := range timestampsOf(t, cached) {
					assert.True(t, uint64(ts) >= tc.startMs && uint64(ts)+minuteStepMs <= tc.endMs, "served the whole step at %d for [%d, %d)", ts, tc.startMs, tc.endMs)
				}
			}
		})
	}
}

func TestBucketCache_SubStepWindowIsOneRangeAcrossTheFluxBoundary(t *testing.T) {
	flux := 5 * time.Minute
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), createTestCache(t), time.Hour, flux).(*bucketCache)
	step := qbtypes.Step{Duration: 5 * time.Minute}
	older := &mockQuery{fingerprint: "flux-split", startMs: epochMs, endMs: epochMs + 60*minuteStepMs}
	put(bc, older, step, seriesResult(1, minuteSeries("a", older.startMs, older.endMs, 1)))

	boundary := time.Now().Add(-flux)
	query := &mockQuery{fingerprint: "flux-split", startMs: uint64(boundary.Add(-30 * time.Second).UnixMilli()), endMs: uint64(boundary.Add(30 * time.Second).UnixMilli())}
	_, missing := get(bc, query, step)

	assert.Equal(t, []qbtypes.TimeRange{query.window()}, missing)
}

func TestBucketCache_EdgeBucketsAreBounded(t *testing.T) {
	bc := createTestBucketCache(t)
	orgID := valuer.UUID{}
	step := minuteStep()
	for i := uint64(1); i <= uint64(maxEdgeBuckets)+3; i++ {
		query := &mockQuery{fingerprint: "edges", startMs: epochMs, endMs: epochMs + 10*minuteStepMs + i*1000}
		series := minuteSeries("a", query.startMs, query.endMs, 1)
		series.Values[len(series.Values)-1].Partial = true
		put(bc, query, step, seriesResult(1, series))
	}

	data := storedEntry(t, bc, orgID, "edges")
	edges := 0
	for _, bucket := range data.Buckets {
		if bucket.Edge != qbtypes.CachedBucketBody {
			edges++
		}
	}
	assert.Equal(t, maxEdgeBuckets, edges)
	newest := &mockQuery{fingerprint: "edges", startMs: epochMs, endMs: epochMs + 10*minuteStepMs + (uint64(maxEdgeBuckets)+3)*1000}
	_, missing := get(bc, newest, step)
	assert.Empty(t, missing, "the newest partial end is kept")
}

// slowGetCache holds every Get long enough for two concurrent Puts to read
// the same entry, the interleaving a busy dashboard produces.
type slowGetCache struct {
	cache.Cache
	delay time.Duration
}

func (c slowGetCache) Get(ctx context.Context, orgID valuer.UUID, key string, dest cachetypes.Cacheable) error {
	time.Sleep(c.delay)
	return c.Cache.Get(ctx, orgID, key, dest)
}

func TestBucketCache_ConcurrentWritesKeepEveryRange(t *testing.T) {
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), slowGetCache{Cache: createTestCache(t), delay: 50 * time.Millisecond}, time.Hour, 5*time.Minute).(*bucketCache)
	step := minuteStep()
	first := &mockQuery{fingerprint: "concurrent", startMs: epochMs, endMs: epochMs + 2*minuteStepMs}
	put(bc, first, step, seriesResult(1, minuteSeries("a", first.startMs, first.endMs, 1)))

	var wg sync.WaitGroup
	for _, window := range []qbtypes.TimeRange{
		{From: epochMs + 2*minuteStepMs, To: epochMs + 4*minuteStepMs},
		{From: epochMs + 4*minuteStepMs, To: epochMs + 6*minuteStepMs},
	} {
		wg.Add(1)
		go func(window qbtypes.TimeRange) {
			defer wg.Done()
			query := &mockQuery{fingerprint: "concurrent", startMs: window.From, endMs: window.To}
			put(bc, query, step, seriesResult(1, minuteSeries("a", window.From, window.To, 1)))
		}(window)
	}
	wg.Wait()

	whole := &mockQuery{fingerprint: "concurrent", startMs: epochMs, endMs: epochMs + 6*minuteStepMs}
	_, missing := get(bc, whole, step)
	assert.Empty(t, missing)
}

func TestBucketCache_SeriesWithoutPointsInTheWindowAreNotServed(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	warm := &mockQuery{fingerprint: "empty-series", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
	put(bc, warm, step, seriesResult(1,
		minuteSeries("always", warm.startMs, warm.endMs, 1),
		minuteSeries("first-half-only", warm.startMs, warm.startMs+5*minuteStepMs, 1),
	))

	query := &mockQuery{fingerprint: "empty-series", startMs: epochMs + 5*minuteStepMs, endMs: epochMs + 10*minuteStepMs}
	cached, missing := get(bc, query, step)

	require.Empty(t, missing)
	series := cached.Value.(*qbtypes.TimeSeriesData).Aggregations[0].Series
	require.Len(t, series, 1)
	assert.Equal(t, "always", series[0].Labels[0].Value)
}

func TestBucketCache_HeatmapKeepsAxisAndTrimsItWhenAsked(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	heatmap := func(startMs, endMs uint64, axis []float64, counts []float64) *qbtypes.Result {
		series := &qbtypes.TimeSeries{}
		for ts := startMs; ts < endMs; ts += minuteStepMs {
			series.Values = append(series.Values, &qbtypes.TimeSeriesValue{Timestamp: int64(ts), Values: slices.Clone(counts)})
		}
		return &qbtypes.Result{
			Type: qbtypes.RequestTypeHeatmap,
			Value: &qbtypes.TimeSeriesData{Aggregations: []*qbtypes.AggregationBucket{{
				Index: 0, Alias: "__result_0", Meta: qbtypes.AggregationMeta{Unit: "By", Buckets: axis}, Series: []*qbtypes.TimeSeries{series},
			}}},
		}
	}
	first := &mockQuery{fingerprint: "heatmap", startMs: epochMs, endMs: epochMs + 2*minuteStepMs}
	req := cacheRequest(first, step)
	req.Kind, req.TrimHeatmapAxis = qbtypes.RequestTypeHeatmap, true
	bc.Put(context.Background(), valuer.UUID{}, req, first.window(), heatmap(first.startMs, first.endMs, []float64{1, 4, 16}, []float64{1, 2, 3, 4}))
	second := &mockQuery{fingerprint: "heatmap", startMs: epochMs + 2*minuteStepMs, endMs: epochMs + 4*minuteStepMs}
	bc.Put(context.Background(), valuer.UUID{}, req, second.window(), heatmap(second.startMs, second.endMs, []float64{2, 4}, []float64{5, 6, 7}))

	whole := &mockQuery{fingerprint: "heatmap", startMs: epochMs, endMs: epochMs + 4*minuteStepMs}
	req.Window = whole.window()
	cached, missing := bc.GetMissRanges(context.Background(), valuer.UUID{}, req)

	require.Empty(t, missing)
	agg := cached.Value.(*qbtypes.TimeSeriesData).Aggregations[0]
	assert.Equal(t, "__result_0", agg.Alias)
	assert.Equal(t, "By", agg.Meta.Unit)
	assert.Equal(t, []float64{1, 2, 4, 16}, agg.Meta.Buckets)
	require.Len(t, agg.Series, 1)
	require.Len(t, agg.Series[0].Values, 4)
	assert.Equal(t, []float64{1, 0, 2, 3, 4}, agg.Series[0].Values[0].Values)
	assert.Equal(t, []float64{0, 5, 6, 0, 7}, agg.Series[0].Values[2].Values)

	req.Window = second.window()
	cached, _ = bc.GetMissRanges(context.Background(), valuer.UUID{}, req)
	agg = cached.Value.(*qbtypes.TimeSeriesData).Aggregations[0]
	assert.Equal(t, []float64{2, 4}, agg.Meta.Buckets, "bands no served column reached are trimmed")
	assert.Equal(t, []float64{5, 6, 7}, agg.Series[0].Values[0].Values)
}

func TestBucketCache_BucketsExpireOnTheirOwnWriteTime(t *testing.T) {
	bc := NewBucketCache(instrumentationtest.New().ToProviderSettings(), createTestCache(t), time.Hour, defaultFluxInterval).(*bucketCache)
	step := minuteStep()
	old := &mockQuery{fingerprint: "expiry", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
	put(bc, old, step, seriesResult(1, minuteSeries("a", old.startMs, old.endMs, 1)))

	// The entry's TTL restarts on every write, so age the first bucket by hand.
	data := storedEntry(t, bc, valuer.UUID{}, "expiry")
	data.Buckets[0].WrittenAtMs = time.Now().Add(-2 * time.Hour).UnixMilli()
	require.NoError(t, bc.cache.Set(context.Background(), valuer.UUID{}, CacheKey("expiry"), data, time.Hour))

	recent := &mockQuery{fingerprint: "expiry", startMs: epochMs + 10*minuteStepMs, endMs: epochMs + 20*minuteStepMs}
	put(bc, recent, step, seriesResult(1, minuteSeries("a", recent.startMs, recent.endMs, 1)))

	whole := &mockQuery{fingerprint: "expiry", startMs: epochMs, endMs: epochMs + 20*minuteStepMs}
	_, missing := get(bc, whole, step)
	assert.Equal(t, []qbtypes.TimeRange{{From: epochMs, To: epochMs + 10*minuteStepMs}}, missing, "the expired bucket is fetched again, the recent one is served")
}

func TestBucketCache_StatsAreSharedByTheServedPartOfABucket(t *testing.T) {
	bc := createTestBucketCache(t)
	step := minuteStep()
	wide := &mockQuery{fingerprint: "stats-share", startMs: epochMs, endMs: epochMs + 100*minuteStepMs}
	put(bc, wide, step, seriesResult(1000, minuteSeries("a", wide.startMs, wide.endMs, 1)))

	narrow := &mockQuery{fingerprint: "stats-share", startMs: epochMs, endMs: epochMs + 10*minuteStepMs}
	cached, missing := get(bc, narrow, step)

	require.Empty(t, missing)
	assert.Equal(t, uint64(100), cached.Stats.RowsScanned)
}
