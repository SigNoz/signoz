package querier

import (
	"context"
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Differential check of the bucket cache: random request sequences over a
// random dataset are answered twice, through the cache and with NoCache, and
// the two answers must be identical. ClickHouse is replaced by an in-process
// fake that evaluates the statement the fake builders render (window, step,
// limit) against the dataset with the semantics of the real statements:
// rows filtered to [start, end), bucketed to the step grid, grouped by
// service, the top-N of a limited query chosen over the statement window,
// and rate computed against the previous bucket within the lookback.
// consume, executeWithCache, the bucket cache and post-processing are the
// real code. Mismatches are reported by request shape and symptom.

const (
	fuzzDatasetStartMs = epochMs
	fuzzDatasetMinutes = 6 * 60
	fuzzServices       = 6
)

// fuzzDataset holds, per service and per minute, how many log rows exist (one
// second apart from the minute start) and the gauge value reported at the
// minute start.
type fuzzDataset struct {
	counts [fuzzServices][fuzzDatasetMinutes]int
	gauges [fuzzServices][fuzzDatasetMinutes]float64
	// counters are cumulative samples at the minute start; a negative entry
	// means no sample that minute (a gap), which is where window functions
	// see a different predecessor depending on the statement window.
	counters [fuzzServices][fuzzDatasetMinutes]float64
}

func newFuzzDataset(rng *rand.Rand) *fuzzDataset {
	d := &fuzzDataset{}
	for s := 0; s < fuzzServices; s++ {
		// Every service is active for one or two stretches so that windows
		// exist where a service has no rows at all.
		activeFrom := rng.Intn(fuzzDatasetMinutes / 2)
		activeTo := activeFrom + 30 + rng.Intn(fuzzDatasetMinutes/2)
		for m := 0; m < fuzzDatasetMinutes; m++ {
			if m >= activeFrom && m < activeTo {
				d.counts[s][m] = rng.Intn(6)
			}
			d.gauges[s][m] = float64(100 + 10*s + rng.Intn(50))
		}
		gapFrom := rng.Intn(fuzzDatasetMinutes - 20)
		gapTo := gapFrom + 3 + rng.Intn(12)
		total := float64(1000 * (s + 1))
		for m := 0; m < fuzzDatasetMinutes; m++ {
			total += float64(rng.Intn(20))
			if (m >= gapFrom && m < gapTo) || rng.Intn(25) == 0 {
				d.counters[s][m] = -1
				continue
			}
			d.counters[s][m] = total
		}
	}
	return d
}

func fuzzServiceName(s int) string { return fmt.Sprintf("svc-%c", 'a'+s) }

// logRows evaluates the logs time series statement: count of rows in
// [startMs, endMs) per (bucket, service); with limit > 0 only the limit
// services with the highest count over the window are kept, ties broken by
// name as ClickHouse would break them deterministically for one plan.
func (d *fuzzDataset) logRows(startMs, endMs, stepMs uint64, limit int) [][]any {
	type key struct {
		ts      uint64
		service int
	}
	perBucket := map[key]float64{}
	total := make([]float64, fuzzServices)
	for s := 0; s < fuzzServices; s++ {
		for m := 0; m < fuzzDatasetMinutes; m++ {
			minuteMs := fuzzDatasetStartMs + uint64(m)*60_000
			for i := 0; i < d.counts[s][m]; i++ {
				ts := minuteMs + uint64(i+1)*1000
				if ts < startMs || ts >= endMs {
					continue
				}
				perBucket[key{ts - ts%stepMs, s}]++
				total[s]++
			}
		}
	}
	keep := map[int]bool{}
	if limit > 0 {
		order := make([]int, 0, fuzzServices)
		for s := 0; s < fuzzServices; s++ {
			if total[s] > 0 {
				order = append(order, s)
			}
		}
		sort.Slice(order, func(i, j int) bool {
			if total[order[i]] != total[order[j]] {
				return total[order[i]] > total[order[j]]
			}
			return order[i] < order[j]
		})
		for i, s := range order {
			if i < limit {
				keep[s] = true
			}
		}
	}
	var rows [][]any
	for k, count := range perBucket {
		if limit > 0 && !keep[k.service] {
			continue
		}
		rows = append(rows, []any{time.UnixMilli(int64(k.ts)), fuzzServiceName(k.service), count})
	}
	sort.Slice(rows, func(i, j int) bool {
		ti, tj := rows[i][0].(time.Time), rows[j][0].(time.Time)
		if !ti.Equal(tj) {
			return ti.Before(tj)
		}
		return rows[i][1].(string) < rows[j][1].(string)
	})
	return rows
}

// gaugeRows evaluates the metrics statement for avg over the gauge: one row
// per (bucket, service) with the mean of the samples in [startMs, endMs).
func (d *fuzzDataset) gaugeRows(startMs, endMs, stepMs uint64) [][]any {
	type key struct {
		ts      uint64
		service int
	}
	sum := map[key]float64{}
	n := map[key]float64{}
	for s := 0; s < fuzzServices; s++ {
		for m := 0; m < fuzzDatasetMinutes; m++ {
			ts := fuzzDatasetStartMs + uint64(m)*60_000
			if ts < startMs || ts >= endMs {
				continue
			}
			k := key{ts - ts%stepMs, s}
			sum[k] += d.gauges[s][m]
			n[k]++
		}
	}
	var rows [][]any
	for k := range sum {
		rows = append(rows, []any{time.UnixMilli(int64(k.ts)), fuzzServiceName(k.service), sum[k] / n[k]})
	}
	sort.Slice(rows, func(i, j int) bool {
		ti, tj := rows[i][0].(time.Time), rows[j][0].(time.Time)
		if !ti.Equal(tj) {
			return ti.Before(tj)
		}
		return rows[i][1].(string) < rows[j][1].(string)
	})
	return rows
}

// rateRows evaluates the metrics statement for rate over the cumulative
// counter: per (bucket, service) the last sample of the bucket, then for
// each bucket the difference to the previous present bucket divided by the
// seconds between them (resets fall back to value / dt). A bucket without a
// predecessor within the lookback is nan, which consume drops, and the
// lookback buckets before the window are not part of the answer.
func (d *fuzzDataset) rateRows(startMs, endMs, stepMs uint64) [][]any {
	lookbackMs := querybuilder.RateLookbackMs(stepMs)
	var rows [][]any
	for s := 0; s < fuzzServices; s++ {
		type bucket struct {
			ts    uint64
			value float64
		}
		var buckets []bucket
		for m := 0; m < fuzzDatasetMinutes; m++ {
			ts := fuzzDatasetStartMs + uint64(m)*60_000
			if ts < startMs || ts >= endMs || d.counters[s][m] < 0 {
				continue
			}
			b := ts - ts%stepMs
			if len(buckets) > 0 && buckets[len(buckets)-1].ts == b {
				buckets[len(buckets)-1].value = d.counters[s][m]
				continue
			}
			buckets = append(buckets, bucket{ts: b, value: d.counters[s][m]})
		}
		for i := 1; i < len(buckets); i++ {
			if buckets[i].ts-buckets[i-1].ts > lookbackMs || buckets[i].ts < startMs+lookbackMs {
				continue
			}
			dt := float64(buckets[i].ts-buckets[i-1].ts) / 1000
			rate := (buckets[i].value - buckets[i-1].value) / dt
			if buckets[i].value < buckets[i-1].value {
				rate = buckets[i].value / dt
			}
			rows = append(rows, []any{time.UnixMilli(int64(buckets[i].ts)), fuzzServiceName(s), rate})
		}
	}
	sort.Slice(rows, func(i, j int) bool {
		ti, tj := rows[i][0].(time.Time), rows[j][0].(time.Time)
		if !ti.Equal(tj) {
			return ti.Before(tj)
		}
		return rows[i][1].(string) < rows[j][1].(string)
	})
	return rows
}

// fuzzConn answers the statements the fuzz builders render from the dataset.
type fuzzConn struct {
	clickhouse.Conn
	data *fuzzDataset
}

func (c *fuzzConn) Query(_ context.Context, query string, _ ...any) (driver.Rows, error) {
	var kind string
	var start, end, step uint64
	var limit int
	if _, err := fmt.Sscanf(query, "FUZZ %s %d %d %d %d", &kind, &start, &end, &step, &limit); err != nil {
		return nil, fmt.Errorf("fuzz conn: cannot parse %q: %w", query, err)
	}
	switch kind {
	case "logs":
		return cmock.NewRows(windowColumns, c.data.logRows(start, end, step, limit)), nil
	case "gauge":
		return cmock.NewRows(windowColumns, c.data.gaugeRows(start, end, step)), nil
	case "rate":
		return cmock.NewRows(windowColumns, c.data.rateRows(start, end, step)), nil
	}
	return nil, fmt.Errorf("fuzz conn: unknown kind %q", kind)
}

type fuzzStore struct {
	*telemetrystoretest.Provider
	conn clickhouse.Conn
}

func (s *fuzzStore) ClickhouseDB() clickhouse.Conn { return s.conn }

type fuzzLogStmtBuilder struct{}

func (fuzzLogStmtBuilder) Build(_ context.Context, _ valuer.UUID, start, end uint64, _ qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	return &qbtypes.Statement{Query: fmt.Sprintf("FUZZ logs %d %d %d %d", start, end, uint64(query.StepInterval.Milliseconds()), query.Limit)}, nil
}

type fuzzMetricStmtBuilder struct{}

func (fuzzMetricStmtBuilder) Build(_ context.Context, _ valuer.UUID, start, end uint64, _ qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation], _ map[string]qbtypes.VariableItem) (*qbtypes.Statement, error) {
	start, end = querybuilder.AdjustedMetricTimeRange(start, end, uint64(query.StepInterval.Seconds()), query)
	kind := "gauge"
	if query.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate {
		kind = "rate"
	}
	return &qbtypes.Statement{Query: fmt.Sprintf("FUZZ %s %d %d %d 0", kind, start, end, uint64(query.StepInterval.Milliseconds()))}, nil
}

// fuzzShape is one query shape a session keeps for all its requests.
type fuzzShape struct {
	metrics     bool
	rate        bool
	stepMs      uint64
	limit       int
	shiftSec    int64
	runningDiff bool
}

func (s fuzzShape) String() string {
	parts := []string{fmt.Sprintf("step=%ds", s.stepMs/1000)}
	if s.rate {
		parts = append(parts, "metrics/rate")
	} else if s.metrics {
		parts = append(parts, "metrics/avg")
	} else {
		parts = append(parts, "logs/count")
	}
	if s.limit > 0 {
		parts = append(parts, fmt.Sprintf("limit=%d", s.limit))
	}
	if s.shiftSec > 0 {
		parts = append(parts, fmt.Sprintf("timeShift=%d", s.shiftSec))
	}
	if s.runningDiff {
		parts = append(parts, "runningDiff")
	}
	return strings.Join(parts, " ")
}

func (s fuzzShape) envelope() (qbtypes.QueryEnvelope, qbtypes.Step) {
	step := qbtypes.Step{Duration: time.Duration(s.stepMs) * time.Millisecond}
	var functions []qbtypes.Function
	if s.shiftSec > 0 {
		functions = append(functions, qbtypes.Function{Name: qbtypes.FunctionNameTimeShift, Args: []qbtypes.FunctionArg{{Value: float64(s.shiftSec)}}})
	}
	if s.runningDiff {
		functions = append(functions, qbtypes.Function{Name: qbtypes.FunctionNameRunningDiff})
	}
	groupBy := []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldDataType: telemetrytypes.FieldDataTypeString, FieldContext: telemetrytypes.FieldContextResource}}}
	if s.rate {
		return qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name: "A", Signal: telemetrytypes.SignalMetrics, StepInterval: step, GroupBy: groupBy, Functions: functions,
			Aggregations: []qbtypes.MetricAggregation{{MetricName: "fuzz_counter", Type: metrictypes.SumType, Temporality: metrictypes.Cumulative, TimeAggregation: metrictypes.TimeAggregationRate, SpaceAggregation: metrictypes.SpaceAggregationSum}},
		}}, step
	}
	if s.metrics {
		return qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name: "A", Signal: telemetrytypes.SignalMetrics, StepInterval: step, GroupBy: groupBy, Functions: functions,
			Aggregations: []qbtypes.MetricAggregation{{MetricName: "fuzz_gauge", Type: metrictypes.GaugeType, TimeAggregation: metrictypes.TimeAggregationAvg, SpaceAggregation: metrictypes.SpaceAggregationAvg}},
		}}, step
	}
	spec := qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
		Name: "A", Signal: telemetrytypes.SignalLogs, StepInterval: step, GroupBy: groupBy, Functions: functions,
		Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
	}
	if s.limit > 0 {
		spec.Limit = s.limit
		spec.Order = []qbtypes.OrderBy{{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "count()"}}, Direction: qbtypes.OrderDirectionDesc}}
	}
	return qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: spec}, step
}

// fuzzPoint is the comparable projection of one response value.
type fuzzPoint struct {
	ts      int64
	value   float64
	partial bool
}

type fuzzResponse map[string][]fuzzPoint

func runFuzzRequest(t *testing.T, q *querier, orgID valuer.UUID, shape fuzzShape, window qbtypes.TimeRange, noCache bool) fuzzResponse {
	t.Helper()
	envelope, step := shape.envelope()
	req := &qbtypes.QueryRangeRequest{Start: window.From, End: window.To, RequestType: qbtypes.RequestTypeTimeSeries, NoCache: noCache, CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{envelope}}}
	// The same steps QueryRange takes before run: shift extraction and window adjustment.
	var query qbtypes.Query
	switch spec := envelope.Spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		spec.ShiftBy = extractShiftFromBuilderQuery(spec)
		query = newBuilderQuery(q.logger, q.telemetryStore, orgID, q.logStmtBuilder, qbtypes.QueryTypeBuilder, spec, adjustTimeRangeForShift(spec, window, req.RequestType), req.RequestType, nil, builderConfig{})
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		spec.ShiftBy = extractShiftFromBuilderQuery(spec)
		query = newBuilderQuery(q.logger, q.telemetryStore, orgID, q.metricStmtBuilder, qbtypes.QueryTypeBuilder, spec, adjustTimeRangeForShift(spec, window, req.RequestType), req.RequestType, nil, builderConfig{})
	}
	resp, err := q.run(context.Background(), orgID, map[string]qbtypes.Query{"A": query}, req, map[string]qbtypes.Step{"A": step}, &qbtypes.QBEvent{}, nil)
	require.NoError(t, err)
	out := fuzzResponse{}
	for _, result := range resp.Data.Results {
		tsData, ok := result.(*qbtypes.TimeSeriesData)
		if !ok {
			continue
		}
		for _, agg := range tsData.Aggregations {
			for _, s := range agg.Series {
				name := ""
				if len(s.Labels) > 0 {
					name = fmt.Sprint(s.Labels[0].Value)
				}
				points := make([]fuzzPoint, 0, len(s.Values))
				for _, v := range s.Values {
					points = append(points, fuzzPoint{ts: v.Timestamp, value: v.Value, partial: v.Partial})
				}
				sort.Slice(points, func(i, j int) bool { return points[i].ts < points[j].ts })
				out[name] = points
			}
		}
	}
	return out
}

// fuzzWindow draws a request window. Ends are on the step grid half of the
// time and a random number of seconds off it otherwise, like dashboards.
func fuzzWindow(rng *rand.Rand, stepMs uint64, previous *qbtypes.TimeRange, alignedOnly bool) qbtypes.TimeRange {
	datasetEnd := fuzzDatasetStartMs + uint64(fuzzDatasetMinutes)*60_000
	lengths := []uint64{30_000, 3 * 60_000, 17 * 60_000, 60 * 60_000, 2 * 60 * 60_000}
	length := lengths[rng.Intn(len(lengths))]
	var start uint64
	if previous != nil && rng.Intn(3) > 0 {
		// Related to the previous window: slide, grow, shrink, or nest.
		delta := int64(rng.Intn(31)-15) * 60_000
		start = uint64(int64(previous.From) + delta)
		if rng.Intn(2) == 0 {
			length = previous.To - previous.From
		}
	} else {
		start = fuzzDatasetStartMs + uint64(rng.Intn(fuzzDatasetMinutes-10))*60_000
	}
	if start < fuzzDatasetStartMs {
		start = fuzzDatasetStartMs
	}
	if !alignedOnly && rng.Intn(2) == 0 {
		start += uint64(rng.Intn(60)) * 1000
	}
	end := start + length
	if !alignedOnly && rng.Intn(2) == 0 {
		end += uint64(rng.Intn(60)) * 1000
	}
	if alignedOnly {
		start -= start % stepMs
		end -= end % stepMs
	}
	if end > datasetEnd {
		end = datasetEnd
	}
	if end <= start {
		end = start + stepMs
	}
	return qbtypes.TimeRange{From: start, To: end}
}

type fuzzMismatch struct {
	shape    fuzzShape
	window   qbtypes.TimeRange
	relation string
	symptom  string
	detail   string
}

func describeWindow(w qbtypes.TimeRange, stepMs uint64, history []qbtypes.TimeRange) string {
	var parts []string
	if w.From%stepMs != 0 {
		parts = append(parts, "start-unaligned")
	}
	if w.To%stepMs != 0 {
		parts = append(parts, "end-unaligned")
	}
	if w.To-w.From < stepMs {
		parts = append(parts, "sub-step")
	}
	relation := "first"
	if len(history) > 0 {
		relation = "disjoint"
		for _, h := range history {
			switch {
			case h.From == w.From && h.To == w.To:
				relation = "repeat"
			case w.From >= h.From && w.To <= h.To:
				relation = "inside-cached"
			case w.From <= h.From && w.To >= h.To:
				relation = "covers-cached"
			case w.From < h.To && w.To > h.From:
				relation = "overlaps-cached"
			}
			if relation != "disjoint" {
				break
			}
		}
	}
	parts = append(parts, relation)
	return strings.Join(parts, ",")
}

func compareFuzz(cached, fresh fuzzResponse) (symptom, detail string) {
	var symptoms []string
	var details []string
	for name := range fresh {
		if _, ok := cached[name]; !ok {
			symptoms = append(symptoms, "series-missing")
			details = append(details, fmt.Sprintf("%s missing", name))
		}
	}
	for name := range cached {
		if _, ok := fresh[name]; !ok {
			symptoms = append(symptoms, "series-extra")
			details = append(details, fmt.Sprintf("%s extra (%d points)", name, len(cached[name])))
		}
	}
	names := make([]string, 0, len(fresh))
	for name := range fresh {
		if _, ok := cached[name]; ok {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	for _, name := range names {
		want, got := fresh[name], cached[name]
		wantByTs := map[int64]fuzzPoint{}
		for _, p := range want {
			wantByTs[p.ts] = p
		}
		gotByTs := map[int64]fuzzPoint{}
		for _, p := range got {
			gotByTs[p.ts] = p
		}
		var tss []int64
		for ts := range wantByTs {
			tss = append(tss, ts)
		}
		for ts := range gotByTs {
			if _, ok := wantByTs[ts]; !ok {
				tss = append(tss, ts)
			}
		}
		sort.Slice(tss, func(i, j int) bool { return tss[i] < tss[j] })
		for _, ts := range tss {
			g, gok := gotByTs[ts]
			w, wok := wantByTs[ts]
			switch {
			case !gok:
				symptoms = append(symptoms, "points-missing")
				details = append(details, fmt.Sprintf("%s@%s missing (fresh %g%s)", name, fuzzClock(ts), w.value, fuzzFlag(w.partial)))
			case !wok:
				symptoms = append(symptoms, "points-extra")
				details = append(details, fmt.Sprintf("%s@%s extra (cached %g%s)", name, fuzzClock(ts), g.value, fuzzFlag(g.partial)))
			case g.value != w.value:
				symptoms = append(symptoms, "value-differs")
				details = append(details, fmt.Sprintf("%s@%s cached %g%s fresh %g%s", name, fuzzClock(ts), g.value, fuzzFlag(g.partial), w.value, fuzzFlag(w.partial)))
			case g.partial != w.partial:
				symptoms = append(symptoms, "partial-flag-differs")
				details = append(details, fmt.Sprintf("%s@%s cached %g%s fresh %g%s", name, fuzzClock(ts), g.value, fuzzFlag(g.partial), w.value, fuzzFlag(w.partial)))
			}
		}
	}
	sort.Strings(symptoms)
	symptoms = uniqueStrings(symptoms)
	if len(details) > 6 {
		details = append(details[:6], fmt.Sprintf("... %d more", len(details)-6))
	}
	return strings.Join(symptoms, "+"), strings.Join(details, "; ")
}

func fuzzClock(ms int64) string {
	return time.UnixMilli(ms).UTC().Format("15:04:05")
}

func fuzzFlag(partial bool) string {
	if partial {
		return "(partial)"
	}
	return ""
}

func uniqueStrings(in []string) []string {
	out := in[:0]
	for i, s := range in {
		if i == 0 || s != in[i-1] {
			out = append(out, s)
		}
	}
	return out
}

// TestCacheDifferential_CachedMatchesUncached runs random request sequences
// and requires every cached answer to equal the uncached one. The report
// groups mismatches by shape, window relation and symptom.
func TestCacheDifferential_CachedMatchesUncached(t *testing.T) {
	for _, seed := range []int64{20260910, 1, 2, 3} {
		t.Run(fmt.Sprintf("seed_%d", seed), func(t *testing.T) { runCacheDifferential(t, seed, 600, false) })
	}
}

// TestCacheDifferential_AlignedWindowsMatchUncached keeps every window on the
// step grid, the shape an aligned client sends.
func TestCacheDifferential_AlignedWindowsMatchUncached(t *testing.T) {
	for _, seed := range []int64{20260910, 1} {
		t.Run(fmt.Sprintf("seed_%d", seed), func(t *testing.T) { runCacheDifferential(t, seed, 600, true) })
	}
}

func runCacheDifferential(t *testing.T, seed int64, sessions int, alignedOnly bool) {
	rng := rand.New(rand.NewSource(seed))
	data := newFuzzDataset(rng)
	store := &fuzzStore{Provider: telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp), conn: &fuzzConn{data: data}}

	var mismatches []fuzzMismatch
	requests := 0
	for session := 0; session < sessions; session++ {
		shape := fuzzShape{stepMs: []uint64{60_000, 300_000}[rng.Intn(2)]}
		switch rng.Intn(7) {
		case 0:
			shape.limit = 1 + rng.Intn(2)
		case 1:
			shape.shiftSec = 3600
		case 2:
			shape.metrics = true
		case 3:
			shape.metrics = true
			shape.runningDiff = true
		case 4:
			shape.metrics = true
			shape.rate = true
		}
		q := &querier{
			logger:               instrumentationtest.New().Logger(),
			fl:                   flaggertest.New(t),
			telemetryStore:       store,
			logStmtBuilder:       fuzzLogStmtBuilder{},
			metricStmtBuilder:    fuzzMetricStmtBuilder{},
			bucketCache:          createTestBucketCache(t),
			maxConcurrentQueries: DefaultMaxConcurrentQueries,
		}
		orgID := valuer.GenerateUUID()
		var history []qbtypes.TimeRange
		steps := 2 + rng.Intn(5)
		for i := 0; i < steps; i++ {
			var previous *qbtypes.TimeRange
			if len(history) > 0 {
				previous = &history[len(history)-1]
			}
			window := fuzzWindow(rng, shape.stepMs, previous, alignedOnly)
			cached := runFuzzRequest(t, q, orgID, shape, window, false)
			fresh := runFuzzRequest(t, q, orgID, shape, window, true)
			requests++
			if symptom, detail := compareFuzz(cached, fresh); symptom != "" {
				mismatches = append(mismatches, fuzzMismatch{shape: shape, window: window, relation: describeWindow(window, shape.stepMs, history), symptom: symptom, detail: detail})
			}
			history = append(history, window)
		}
	}

	if len(mismatches) == 0 {
		return
	}
	type class struct{ shape, geometry, symptom string }
	counts := map[class]int{}
	example := map[class]fuzzMismatch{}
	for _, m := range mismatches {
		c := class{m.shape.String(), m.relation, m.symptom}
		counts[c]++
		if _, ok := example[c]; !ok {
			example[c] = m
		}
	}
	classes := make([]class, 0, len(counts))
	for c := range counts {
		classes = append(classes, c)
	}
	sort.Slice(classes, func(i, j int) bool { return counts[classes[i]] > counts[classes[j]] })
	var report strings.Builder
	fmt.Fprintf(&report, "%d of %d requests differ from the uncached answer (seed %d); %d classes\n", len(mismatches), requests, seed, len(classes))
	for _, c := range classes {
		e := example[c]
		fmt.Fprintf(&report, "  %4d  [%s] %s -> %s\n        e.g. %s-%s: %s\n", counts[c], c.shape, c.geometry, c.symptom, fuzzClock(int64(e.window.From)), fuzzClock(int64(e.window.To)), e.detail)
	}
	t.Fatal(report.String())
}
