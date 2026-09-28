package querier

import (
	"context"
	"fmt"
	"regexp"
	"sync"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/metricsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// windowLogStmtBuilder stands in for the logs statement builder. It records
// every window it is asked to build and renders the window and the limit
// into the SQL text so the ClickHouse mock can answer each statement.
type windowLogStmtBuilder struct {
	mu     sync.Mutex
	ranges []qbtypes.TimeRange
}

func (b *windowLogStmtBuilder) Build(_ context.Context, _ valuer.UUID, start, end uint64, _ qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.ranges = append(b.ranges, qbtypes.TimeRange{From: start, To: end})
	return &qbtypes.Statement{Query: windowSQL(start, end, query.Limit)}, nil
}

func (b *windowLogStmtBuilder) built() []qbtypes.TimeRange {
	b.mu.Lock()
	defer b.mu.Unlock()
	return append([]qbtypes.TimeRange(nil), b.ranges...)
}

func windowSQL(start, end uint64, limit int) string {
	return fmt.Sprintf("SELECT ts, `service.name`, __result_0 FROM logs WHERE range = '%d-%d' AND lim = %d", start, end, limit)
}

var windowColumns = []cmock.ColumnType{
	{Name: "ts", Type: "DateTime"},
	{Name: "service.name", Type: "String"},
	{Name: "__result_0", Type: "Float64"},
}

// windowRows renders one row per minute and service in [start, end).
func windowRows(start, end uint64, services []string, valueAt func(ts uint64, service string) float64) *cmock.Rows {
	var values [][]any
	for ts := start; ts < end; ts += minuteStepMs {
		for _, service := range services {
			values = append(values, []any{time.UnixMilli(int64(ts)), service, valueAt(ts, service)})
		}
	}
	return cmock.NewRows(windowColumns, values)
}

func expectWindowQuery(store *telemetrystoretest.Provider, start, end uint64, limit int, rows *cmock.Rows) {
	store.Mock().ExpectQuery(regexp.QuoteMeta(windowSQL(start, end, limit))).WillReturnRows(rows)
}

func logSpec(limit int) qbtypes.QueryBuilderQuery[qbtypes.LogAggregation] {
	spec := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		Name:         "A",
		Signal:       telemetrytypes.SignalLogs,
		StepInterval: minuteStep(),
		Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
		GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
			Name: "service.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextResource,
		}}},
	}
	if limit > 0 {
		spec.Limit = limit
		spec.Order = []qbtypes.OrderBy{{
			Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "count()"}},
			Direction: qbtypes.OrderDirectionDesc,
		}}
	}
	return spec
}

func newCachingQuerier(t *testing.T, builder *windowLogStmtBuilder, store *telemetrystoretest.Provider) *querier {
	t.Helper()
	return &querier{
		logger:               instrumentationtest.New().Logger(),
		fl:                   flaggertest.New(t),
		telemetryStore:       store,
		logStmtBuilder:       builder,
		bucketCache:          createTestBucketCache(t),
		maxConcurrentQueries: DefaultMaxConcurrentQueries,
	}
}

func logRequest(startMs, endMs uint64, spec qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]) *qbtypes.QueryRangeRequest {
	return &qbtypes.QueryRangeRequest{
		Start:       startMs,
		End:         endMs,
		RequestType: qbtypes.RequestTypeTimeSeries,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{{Type: qbtypes.QueryTypeBuilder, Spec: spec}},
		},
	}
}

func runLogRequest(t *testing.T, q *querier, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, spec qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]) *qbtypes.TimeSeriesData {
	t.Helper()
	bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, q.logStmtBuilder, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, nil, builderConfig{})
	resp, err := q.run(context.Background(), orgID, map[string]qbtypes.Query{spec.Name: bq}, req, map[string]qbtypes.Step{spec.Name: spec.StepInterval}, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)
	require.Len(t, resp.Data.Results, 1)
	tsData, ok := resp.Data.Results[0].(*qbtypes.TimeSeriesData)
	require.True(t, ok, "result is %T", resp.Data.Results[0])
	return tsData
}

func pointsByService(data *qbtypes.TimeSeriesData) map[string][]float64 {
	out := map[string][]float64{}
	for _, agg := range data.Aggregations {
		for _, s := range agg.Series {
			name := fmt.Sprint(s.Labels[0].Value)
			for _, v := range s.Values {
				out[name] = append(out[name], v.Value)
			}
		}
	}
	return out
}

// A timeShift query already reports its window in the shifted clock, so a
// gap of that window is fetched as it is.
func TestCreateRangedQuery_TimeShiftIsAppliedOnce(t *testing.T) {
	q := &querier{logger: instrumentationtest.New().Logger(), logStmtBuilder: &windowLogStmtBuilder{}}
	spec := logSpec(0)
	spec.Functions = []qbtypes.Function{{Name: qbtypes.FunctionNameTimeShift, Args: []qbtypes.FunctionArg{{Value: 3600.0}}}}
	spec.ShiftBy = extractShiftFromBuilderQuery(spec)

	requested := qbtypes.TimeRange{From: epochMs, To: epochMs + 60*minuteStepMs}
	shifted := adjustTimeRangeForShift(spec, requested, qbtypes.RequestTypeTimeSeries)
	require.Equal(t, requested.From-3_600_000, shifted.From)
	bq := newBuilderQuery(q.logger, nil, valuer.GenerateUUID(), q.logStmtBuilder, qbtypes.QueryTypeBuilder, spec, shifted, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})

	missing := qbtypes.TimeRange{From: shifted.From + 30*minuteStepMs, To: shifted.To}
	ranged := q.createRangedQuery(bq, missing)
	require.NotNil(t, ranged)

	from, to := ranged.Window()
	assert.Equal(t, missing, qbtypes.TimeRange{From: from, To: to})
}

func TestMergeResults_FreshPointReplacesCachedPoint(t *testing.T) {
	ts := int64(epochMs)
	point := func(value float64, partial bool) *qbtypes.Result {
		return seriesResult(1, &qbtypes.TimeSeries{
			Labels: []*qbtypes.Label{{Key: telemetrytypes.TelemetryFieldKey{Name: "service"}, Value: "a"}},
			Values: []*qbtypes.TimeSeriesValue{{Timestamp: ts, Value: value, Partial: partial}},
		})
	}
	req := CacheRequest{Window: qbtypes.TimeRange{From: epochMs, To: epochMs + minuteStepMs}, Step: minuteStep(), Kind: qbtypes.RequestTypeTimeSeries}

	merged := mergeResults(req, point(3, false), []*qbtypes.Result{point(7, false)})
	assert.Equal(t, map[string][]float64{"a": {7}}, pointsByService(merged.Value.(*qbtypes.TimeSeriesData)))
	assert.Equal(t, uint64(2), merged.Stats.RowsScanned)

	merged = mergeResults(req, point(3, false), []*qbtypes.Result{point(7, true)})
	assert.Equal(t, map[string][]float64{"a": {3}}, pointsByService(merged.Value.(*qbtypes.TimeSeriesData)), "a partial point never replaces a whole one")
}

func TestMergeResults_DropsPointsBeforeTheWindow(t *testing.T) {
	req := CacheRequest{Window: qbtypes.TimeRange{From: epochMs + 30_000, To: epochMs + 3*minuteStepMs}, Step: minuteStep(), Kind: qbtypes.RequestTypeTimeSeries}
	fresh := seriesResult(1, minuteSeries("a", epochMs-2*minuteStepMs, epochMs+3*minuteStepMs, 1))

	merged := mergeResults(req, nil, []*qbtypes.Result{fresh})

	assert.Equal(t, map[string][]float64{"a": {1, 1, 1}}, pointsByService(merged.Value.(*qbtypes.TimeSeriesData)), "the partial first step is kept, the widened lookback is not")
}

// A grouped query with a limit is a top-N over the requested window; its
// answer is cached for that window only and never assembled from pieces.
func TestRun_LimitedGroupByIsNeverAssembledFromPieces(t *testing.T) {
	head := qbtypes.TimeRange{From: epochMs, To: epochMs + 10*minuteStepMs}
	tail := qbtypes.TimeRange{From: head.To, To: head.To + 10*minuteStepMs}
	full := qbtypes.TimeRange{From: head.From, To: tail.To}

	// Top-2 of the head is {a, b}, of the tail {c, d}, of the full window {a, c}.
	headCounts := map[string]float64{"a": 10, "b": 8, "c": 1, "d": 1}
	tailCounts := map[string]float64{"a": 1, "b": 1, "c": 10, "d": 8}
	valueAt := func(ts uint64, service string) float64 {
		if ts < tail.From {
			return headCounts[service]
		}
		return tailCounts[service]
	}

	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	expectWindowQuery(store, head.From, head.To, 2, windowRows(head.From, head.To, []string{"a", "b"}, valueAt))
	expectWindowQuery(store, tail.From, tail.To, 2, windowRows(tail.From, tail.To, []string{"c", "d"}, valueAt))
	expectWindowQuery(store, full.From, full.To, 2, windowRows(full.From, full.To, []string{"a", "c"}, valueAt))

	builder := &windowLogStmtBuilder{}
	q := newCachingQuerier(t, builder, store)
	orgID := valuer.GenerateUUID()
	spec := logSpec(2)

	runLogRequest(t, q, orgID, logRequest(head.From, head.To, spec), spec)
	got := runLogRequest(t, q, orgID, logRequest(full.From, full.To, spec), spec)
	assert.Equal(t, map[string][]float64{"a": append(repeat(10, 10), repeat(1, 10)...), "c": append(repeat(1, 10), repeat(10, 10)...)}, pointsByService(got))
	assert.Equal(t, []qbtypes.TimeRange{head, full}, builder.built())

	got = runLogRequest(t, q, orgID, logRequest(full.From, full.To, spec), spec)
	assert.Len(t, builder.built(), 2, "the repeated window is a cache hit")
	assert.Len(t, got.Aggregations[0].Series, 2)
}

func repeat(value float64, n int) []float64 {
	out := make([]float64, n)
	for i := range out {
		out[i] = value
	}
	return out
}

// A request whose window the cache does not cover at all runs as one
// statement, whatever the grid alignment of its ends.
func TestExecuteWithCache_EntirelyMissingWindowRunsOneStatement(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	builder := &windowLogStmtBuilder{}
	q := newCachingQuerier(t, builder, store)
	orgID := valuer.GenerateUUID()
	ctx := context.Background()
	spec := logSpec(0)
	one := func(uint64, string) float64 { return 1 }

	older := qbtypes.TimeRange{From: epochMs - 120*minuteStepMs, To: epochMs - 60*minuteStepMs}
	olderQuery := newBuilderQuery(q.logger, store, orgID, builder, qbtypes.QueryTypeBuilder, spec, older, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})
	req := CacheRequest{Key: CacheKey(olderQuery.Fingerprint()), Window: older, Step: spec.StepInterval, Kind: qbtypes.RequestTypeTimeSeries}
	q.bucketCache.Put(ctx, orgID, req, older, seriesResult(1, minuteSeries("a", older.From, older.To, 1)))

	window := qbtypes.TimeRange{From: epochMs + 7_000, To: epochMs + 60*minuteStepMs}
	expectWindowQuery(store, window.From, window.To, 0, windowRows(window.From, window.To, []string{"a"}, one))

	bq := newBuilderQuery(q.logger, store, orgID, builder, qbtypes.QueryTypeBuilder, spec, window, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})
	_, err := q.executeWithCache(ctx, orgID, bq, spec.StepInterval, make(chan struct{}, q.maxConcurrentQueries))
	require.NoError(t, err)

	assert.Equal(t, []qbtypes.TimeRange{window}, builder.built())
}

func TestExecuteWithCache_GapsRunAsSeparateStatementsAndAreWrittenBack(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	builder := &windowLogStmtBuilder{}
	q := newCachingQuerier(t, builder, store)
	orgID := valuer.GenerateUUID()
	spec := logSpec(0)
	one := func(uint64, string) float64 { return 1 }

	middle := qbtypes.TimeRange{From: epochMs + 20*minuteStepMs, To: epochMs + 40*minuteStepMs}
	whole := qbtypes.TimeRange{From: epochMs, To: epochMs + 60*minuteStepMs}
	before := qbtypes.TimeRange{From: whole.From, To: middle.From}
	after := qbtypes.TimeRange{From: middle.To, To: whole.To}
	for _, window := range []qbtypes.TimeRange{middle, before, after} {
		expectWindowQuery(store, window.From, window.To, 0, windowRows(window.From, window.To, []string{"a"}, one))
	}

	runLogRequest(t, q, orgID, logRequest(middle.From, middle.To, spec), spec)
	got := runLogRequest(t, q, orgID, logRequest(whole.From, whole.To, spec), spec)
	assert.Equal(t, map[string][]float64{"a": repeat(1, 60)}, pointsByService(got))
	assert.ElementsMatch(t, []qbtypes.TimeRange{middle, before, after}, builder.built())

	runLogRequest(t, q, orgID, logRequest(whole.From, whole.To, spec), spec)
	assert.Len(t, builder.built(), 3, "the assembled window is a cache hit afterwards")
}

func TestExecuteWithCache_FailedGapFailsTheRequest(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	builder := &windowLogStmtBuilder{}
	q := newCachingQuerier(t, builder, store)
	orgID := valuer.GenerateUUID()
	spec := logSpec(0)
	one := func(uint64, string) float64 { return 1 }

	cached := qbtypes.TimeRange{From: epochMs, To: epochMs + 20*minuteStepMs}
	whole := qbtypes.TimeRange{From: epochMs, To: epochMs + 40*minuteStepMs}
	gap := qbtypes.TimeRange{From: cached.To, To: whole.To}
	expectWindowQuery(store, cached.From, cached.To, 0, windowRows(cached.From, cached.To, []string{"a"}, one))
	store.Mock().ExpectQuery(regexp.QuoteMeta(windowSQL(gap.From, gap.To, 0))).WillReturnError(fmt.Errorf("clickhouse is away"))

	runLogRequest(t, q, orgID, logRequest(cached.From, cached.To, spec), spec)
	bq := newBuilderQuery(q.logger, store, orgID, builder, qbtypes.QueryTypeBuilder, spec, whole, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})
	_, err := q.executeWithCache(context.Background(), orgID, bq, spec.StepInterval, make(chan struct{}, q.maxConcurrentQueries))

	require.Error(t, err)
	assert.Equal(t, []qbtypes.TimeRange{cached, gap}, builder.built(), "the whole window is not run again after a failed gap")
}

func TestRun_FormulaByAliasSurvivesFullCacheHit(t *testing.T) {
	window := qbtypes.TimeRange{From: epochMs, To: epochMs + 10*minuteStepMs}
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	three := func(uint64, string) float64 { return 3 }
	expectWindowQuery(store, window.From, window.To, 0, windowRows(window.From, window.To, []string{"a"}, three))

	q := newCachingQuerier(t, &windowLogStmtBuilder{}, store)
	orgID := valuer.GenerateUUID()
	spec := logSpec(0)
	req := logRequest(window.From, window.To, spec)
	req.CompositeQuery.Queries = append(req.CompositeQuery.Queries, qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeFormula,
		Spec: qbtypes.QueryBuilderFormula{Name: "F", Expression: "[A.__result_0] * 2"},
	})

	formulaValues := func() []float64 {
		bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, q.logStmtBuilder, qbtypes.QueryTypeBuilder, spec, window, req.RequestType, nil, builderConfig{})
		resp, err := q.run(context.Background(), orgID, map[string]qbtypes.Query{"A": bq}, req, map[string]qbtypes.Step{"A": spec.StepInterval}, &qbtypes.QBEvent{}, nil)
		require.NoError(t, err)
		for _, result := range resp.Data.Results {
			tsData, ok := result.(*qbtypes.TimeSeriesData)
			if !ok || tsData.QueryName != "F" {
				continue
			}
			var values []float64
			for _, agg := range tsData.Aggregations {
				for _, s := range agg.Series {
					for _, v := range s.Values {
						values = append(values, v.Value)
					}
				}
			}
			return values
		}
		t.Fatal("no result for formula F")
		return nil
	}

	first := formulaValues()
	require.Equal(t, repeat(6, 10), first)
	assert.Equal(t, first, formulaValues())
}

// lookbackMetricStmtBuilder stands in for the metrics statement builder. It
// widens the window the way the real builder does, so a runningDiff query
// fetches one step before the request.
type lookbackMetricStmtBuilder struct{}

func (b *lookbackMetricStmtBuilder) Build(_ context.Context, _ valuer.UUID, start, end uint64, _ qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	start, end = querybuilder.AdjustedMetricTimeRange(start, end, uint64(query.StepInterval.Seconds()), query)
	return &qbtypes.Statement{Query: windowSQL(start, end, 0)}, nil
}

func TestRun_RunningDiffKeepsFirstIntervalOnEveryCachePath(t *testing.T) {
	window := qbtypes.TimeRange{From: epochMs, To: epochMs + 3*minuteStepMs}
	lookback := window.From - minuteStepMs
	gauge := func(ts uint64, _ string) float64 { return 100 + float64((ts-lookback)/minuteStepMs)*10 }

	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	store.Mock().MatchExpectationsInOrder(false)
	expectWindowQuery(store, lookback, window.To, 0, windowRows(lookback, window.To, []string{"a"}, gauge))
	// The window then grows by one step at the end; only that step is fetched, with its own lookback.
	grown := qbtypes.TimeRange{From: window.From, To: window.To + minuteStepMs}
	expectWindowQuery(store, window.To-minuteStepMs, grown.To, 0, windowRows(window.To-minuteStepMs, grown.To, []string{"a"}, gauge))

	q := newCachingQuerier(t, &windowLogStmtBuilder{}, store)
	q.metricStmtBuilder = &lookbackMetricStmtBuilder{}
	orgID := valuer.GenerateUUID()
	spec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name:         "A",
		Signal:       telemetrytypes.SignalMetrics,
		StepInterval: minuteStep(),
		Aggregations: []qbtypes.MetricAggregation{{MetricName: "gauge", TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg}},
		Functions:    []qbtypes.Function{{Name: qbtypes.FunctionNameRunningDiff}},
	}
	diffs := func(window qbtypes.TimeRange) []float64 {
		req := &qbtypes.QueryRangeRequest{
			Start: window.From, End: window.To, RequestType: qbtypes.RequestTypeTimeSeries,
			CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{Type: qbtypes.QueryTypeBuilder, Spec: spec}}},
		}
		bq := newBuilderQuery(q.logger, q.telemetryStore, orgID, q.metricStmtBuilder, qbtypes.QueryTypeBuilder, spec, window, req.RequestType, nil, builderConfig{})
		resp, err := q.run(context.Background(), orgID, map[string]qbtypes.Query{"A": bq}, req, map[string]qbtypes.Step{"A": spec.StepInterval}, &qbtypes.QBEvent{}, nil)
		require.NoError(t, err)
		require.Len(t, resp.Data.Results, 1)
		return pointsByService(resp.Data.Results[0].(*qbtypes.TimeSeriesData))["a"]
	}

	require.Equal(t, []float64{10, 10, 10}, diffs(window), "uncached")
	assert.Equal(t, []float64{10, 10, 10}, diffs(window), "full cache hit")
	assert.Equal(t, []float64{10, 10, 10, 10}, diffs(grown), "partial cache hit")
}

func TestCreateRangedQuery_PromQLReservedVariablesKeepRequestWindow(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	engine := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{Timeout: time.Minute}, store)
	q := &querier{logger: instrumentationtest.New().Logger()}

	window := qbtypes.TimeRange{From: epochMs, To: epochMs + 4*minuteStepMs}
	original := newPromqlQuery(q.logger, engine, qbtypes.PromQuery{Name: "A", Query: "vector($start_timestamp)", Step: minuteStep()}, window, qbtypes.RequestTypeTimeSeries, nil)

	gap := qbtypes.TimeRange{From: window.From + 2*minuteStepMs, To: window.To}
	ranged := q.createRangedQuery(original, gap)
	require.NotNil(t, ranged)

	stmt, err := ranged.(*promqlQuery).Statement(context.Background())
	require.NoError(t, err)
	assert.Equal(t, fmt.Sprintf("vector(%d)", window.From/1000), stmt.Query)
	assert.Equal(t, original.Fingerprint(), ranged.Fingerprint())
	from, to := ranged.Window()
	assert.Equal(t, gap, qbtypes.TimeRange{From: from, To: to})
}

func TestBuilderQueryFingerprint_IsStableWithSeveralVariables(t *testing.T) {
	spec := logSpec(0)
	spec.Filter = &qbtypes.Filter{Expression: "service.name = $svc AND deployment.environment = $env AND cloud.region = $region"}
	variables := map[string]qbtypes.VariableItem{
		"svc":    {Value: "checkout"},
		"env":    {Value: "prod"},
		"region": {Value: "eu-west-1"},
	}
	bq := newBuilderQuery(instrumentationtest.New().Logger(), nil, valuer.GenerateUUID(), &windowLogStmtBuilder{}, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: epochMs, To: epochMs + minuteStepMs}, qbtypes.RequestTypeTimeSeries, variables, builderConfig{})

	seen := map[string]struct{}{}
	for range 50 {
		seen[bq.Fingerprint()] = struct{}{}
	}
	assert.Len(t, seen, 1)
}

func TestBuilderQueryFingerprint_DistinguishesVariableValues(t *testing.T) {
	spec := logSpec(0)
	spec.Filter = &qbtypes.Filter{Expression: "service.name IN $svc"}
	key := func(value any) string {
		bq := newBuilderQuery(instrumentationtest.New().Logger(), nil, valuer.GenerateUUID(), &windowLogStmtBuilder{}, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: epochMs, To: epochMs + minuteStepMs}, qbtypes.RequestTypeTimeSeries, map[string]qbtypes.VariableItem{"svc": {Value: value}}, builderConfig{})
		return bq.Fingerprint()
	}
	assert.NotEqual(t, key([]any{"a b"}), key([]any{"a", "b"}))
	assert.NotEqual(t, key(1.0), key("1"))
}

func TestBuilderQueryFingerprint_LimitedGroupByIncludesTheWindow(t *testing.T) {
	key := func(limit int, window qbtypes.TimeRange) string {
		return newBuilderQuery(instrumentationtest.New().Logger(), nil, valuer.GenerateUUID(), &windowLogStmtBuilder{}, qbtypes.QueryTypeBuilder, logSpec(limit), window, qbtypes.RequestTypeTimeSeries, nil, builderConfig{}).Fingerprint()
	}
	first := qbtypes.TimeRange{From: epochMs, To: epochMs + 10*minuteStepMs}
	second := qbtypes.TimeRange{From: epochMs, To: epochMs + 20*minuteStepMs}
	assert.NotEqual(t, key(2, first), key(2, second))
	assert.Equal(t, key(0, first), key(0, second))
}

func TestCreateRangedQuery_MetricsPieceReadsTheTablesOfTheRequest(t *testing.T) {
	q := &querier{logger: instrumentationtest.New().Logger(), metricStmtBuilder: &lookbackMetricStmtBuilder{}}
	spec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name:         "A",
		Signal:       telemetrytypes.SignalMetrics,
		StepInterval: qbtypes.Step{Duration: 30 * time.Minute},
		Aggregations: []qbtypes.MetricAggregation{{MetricName: "gauge", Type: metrictypes.GaugeType, TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg}},
	}
	request := qbtypes.TimeRange{From: epochMs, To: epochMs + 3*24*60*minuteStepMs}
	bq := newBuilderQuery(q.logger, nil, valuer.GenerateUUID(), q.metricStmtBuilder, qbtypes.QueryTypeBuilder, spec, request, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})

	gap := qbtypes.TimeRange{From: request.To - 60*minuteStepMs, To: request.To}
	ranged := q.createRangedQuery(bq, gap)
	require.NotNil(t, ranged)

	want := metricsstatementbuilder.TableHintsForWindow(request.From, request.To, spec.Aggregations[0])
	require.NotNil(t, want)
	got := ranged.(*builderQuery[qbtypes.MetricAggregation]).spec.Aggregations[0].TableHints
	assert.Equal(t, want, got)
	assert.Nil(t, bq.spec.Aggregations[0].TableHints, "the original query is left as it is")
}

func TestCreateRangedQuery_MeterPieceReadsTheTableOfTheRequest(t *testing.T) {
	q := &querier{logger: instrumentationtest.New().Logger(), meterStmtBuilder: &lookbackMetricStmtBuilder{}}
	spec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
		Name:         "A",
		Signal:       telemetrytypes.SignalMetrics,
		Source:       telemetrytypes.SourceMeter,
		StepInterval: qbtypes.Step{Duration: 24 * time.Hour},
		Aggregations: []qbtypes.MetricAggregation{{MetricName: "meter", Type: metrictypes.SumType, TimeAggregation: metrictypes.TimeAggregationSum, SpaceAggregation: metrictypes.SpaceAggregationSum}},
	}
	request := qbtypes.TimeRange{From: epochMs, To: epochMs + 60*24*60*minuteStepMs}
	bq := newBuilderQuery(q.logger, nil, valuer.GenerateUUID(), q.meterStmtBuilder, qbtypes.QueryTypeBuilder, spec, request, qbtypes.RequestTypeTimeSeries, nil, builderConfig{})

	gap := qbtypes.TimeRange{From: request.To - 24*60*minuteStepMs, To: request.To}
	ranged := q.createRangedQuery(bq, gap)
	require.NotNil(t, ranged)

	got := ranged.(*builderQuery[qbtypes.MetricAggregation]).spec.Aggregations[0].TableHints
	require.NotNil(t, got)
	assert.Equal(t, metertelemetryschema.SamplesAgg1dTableName, got.SamplesTableName)
	assert.Equal(t, metertelemetryschema.SamplesTableName, metertelemetryschema.WhichSamplesTableToUse(gap.From, gap.To, spec.Aggregations[0].Type, spec.Aggregations[0].TimeAggregation, nil), "the piece alone would read the raw table")
}

func TestTrimsHeatmapAxis_OnlyForAnAxisComputedFromTheData(t *testing.T) {
	metricHeatmap := func(bucketing *qbtypes.HeatmapBucketing) qbtypes.Query {
		spec := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name:         "A",
			Signal:       telemetrytypes.SignalMetrics,
			StepInterval: minuteStep(),
			Aggregations: []qbtypes.MetricAggregation{{MetricName: "m", HeatmapBucketing: bucketing}},
		}
		return newBuilderQuery(instrumentationtest.New().Logger(), nil, valuer.GenerateUUID(), &lookbackMetricStmtBuilder{}, qbtypes.QueryTypeBuilder, spec, qbtypes.TimeRange{From: epochMs, To: epochMs + minuteStepMs}, qbtypes.RequestTypeHeatmap, nil, builderConfig{})
	}
	assert.True(t, trimsHeatmapAxis(metricHeatmap(&qbtypes.HeatmapBucketing{Kind: qbtypes.BucketsKindLog})), "a gauge heatmap buckets the served values")
	assert.False(t, trimsHeatmapAxis(metricHeatmap(nil)), "a histogram reports its own le buckets")
	assert.False(t, trimsHeatmapAxis(newPromqlQuery(instrumentationtest.New().Logger(), nil, qbtypes.PromQuery{Query: "up", Step: minuteStep()}, qbtypes.TimeRange{From: epochMs, To: epochMs + minuteStepMs}, qbtypes.RequestTypeHeatmap, nil)))
}
