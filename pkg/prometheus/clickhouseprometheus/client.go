package clickhouseprometheus

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/cespare/xxhash/v2"
	promValue "github.com/prometheus/prometheus/model/value"
	"github.com/prometheus/prometheus/prompb"
	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
)

type client struct {
	settings       factory.ScopedProviderSettings
	telemetryStore telemetrystore.TelemetryStore
}

func NewReadClient(settings factory.ScopedProviderSettings, telemetryStore telemetrystore.TelemetryStore) remote.ReadClient {
	return &client{
		settings:       settings,
		telemetryStore: telemetryStore,
	}
}

func (client *client) Read(ctx context.Context, query *prompb.Query, sortSeries bool) (storage.SeriesSet, error) {
	if len(query.Matchers) == 2 {
		var hasJob bool
		var queryString string
		for _, m := range query.Matchers {
			if m.Type == prompb.LabelMatcher_EQ && m.Name == "job" && m.Value == "rawsql" {
				hasJob = true
			}
			if m.Type == prompb.LabelMatcher_EQ && m.Name == "query" {
				queryString = m.Value
			}
		}

		if hasJob && queryString != "" {
			res, err := client.queryRaw(ctx, queryString, int64(query.EndTimestampMs))
			if err != nil {
				return nil, err
			}

			return remote.FromQueryResult(sortSeries, res), nil
		}
	}

	var metricName string
	for _, matcher := range query.Matchers {
		if matcher.Name == "__name__" {
			metricName = matcher.Value
		}
	}

	clickhouseQuery, args, err := client.queryToClickhouseQuery(ctx, query, metricName, false)
	if err != nil {
		return nil, err
	}

	fingerprints, err := client.getFingerprintsFromClickhouseQuery(ctx, clickhouseQuery, args)
	if err != nil {
		return nil, err
	}
	if len(fingerprints) == 0 {
		return remote.FromQueryResult(sortSeries, new(prompb.QueryResult)), nil
	}

	clickhouseSubQuery, args, err := client.queryToClickhouseQuery(ctx, query, metricName, true)
	if err != nil {
		return nil, err
	}

	res := new(prompb.QueryResult)
	timeseries, err := client.querySamples(ctx, int64(query.StartTimestampMs), int64(query.EndTimestampMs), fingerprints, metricName, clickhouseSubQuery, args)
	if err != nil {
		return nil, err
	}
	res.Timeseries = timeseries

	return remote.FromQueryResult(sortSeries, res), nil
}

func (c *client) ReadMultiple(ctx context.Context, queries []*prompb.Query, sortSeries bool) (storage.SeriesSet, error) {
	if len(queries) == 0 {
		return storage.EmptySeriesSet(), nil
	}
	if len(queries) == 1 {
		return c.Read(ctx, queries[0], sortSeries)
	}

	type result struct {
		ss  storage.SeriesSet
		err error
	}

	results := make([]result, len(queries))
	var wg sync.WaitGroup
	wg.Add(len(queries))
	for i, q := range queries {
		go func(i int, q *prompb.Query) {
			defer wg.Done()
			ss, err := c.Read(ctx, q, sortSeries)
			results[i] = result{ss, err}
		}(i, q)
	}
	wg.Wait()

	sets := make([]storage.SeriesSet, 0, len(queries))
	for _, r := range results {
		if r.err != nil {
			return nil, r.err
		}
		sets = append(sets, r.ss)
	}
	return storage.NewMergeSeriesSet(sets, 0, storage.ChainedSeriesMerge), nil
}

func (client *client) queryToClickhouseQuery(_ context.Context, query *prompb.Query, metricName string, subQuery bool) (string, []any, error) {
	var clickHouseQuery string
	var conditions []string
	var argCount = 0
	var selectString = "fingerprint, any(labels)"
	if subQuery {
		argCount = 1
		selectString = "fingerprint"
	}

	start, end, tableName := getStartAndEndAndTableName(query.StartTimestampMs, query.EndTimestampMs)

	var args []any
	conditions = append(conditions, fmt.Sprintf("metric_name = $%d", argCount+1))
	conditions = append(conditions, "temporality IN ['Cumulative', 'Unspecified']")
	// Inclusive upper bound: registration rows are hour-floored by the
	// exporter, so a series first registered in the hour starting exactly at
	// `end` would otherwise be invisible while its samples (<= end) are in
	// range.
	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli <= %d", start, end))

	args = append(args, metricName)
	for _, m := range query.Matchers {
		switch m.Type {
		case prompb.LabelMatcher_EQ:
			conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, $%d) = $%d", argCount+2, argCount+3))
		case prompb.LabelMatcher_NEQ:
			conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, $%d) != $%d", argCount+2, argCount+3))
		case prompb.LabelMatcher_RE:
			conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, $%d), $%d)", argCount+2, argCount+3))
		case prompb.LabelMatcher_NRE:
			conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, $%d), $%d)", argCount+2, argCount+3))
		default:
			return "", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported or invalid matcher type: %s", m.Type.String())
		}
		args = append(args, m.Name, m.Value)
		argCount += 2
	}

	whereClause := strings.Join(conditions, " AND ")

	clickHouseQuery = fmt.Sprintf(`SELECT %s FROM %s.%s WHERE %s GROUP BY fingerprint`, selectString, databaseName, tableName, whereClause)

	return clickHouseQuery, args, nil
}

func (client *client) getFingerprintsFromClickhouseQuery(ctx context.Context, query string, args []any) (map[uint64][]prompb.Label, error) {
	ctx = client.withClickhousePrometheusContext(ctx, "getFingerprintsFromClickhouseQuery")
	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fingerprints := make(map[uint64][]prompb.Label)

	var fingerprint uint64
	var labelString string
	for rows.Next() {
		if err = rows.Scan(&fingerprint, &labelString); err != nil {
			return nil, err
		}

		labels, _, err := unmarshalLabels(labelString)
		if err != nil {
			return nil, err
		}

		fingerprints[fingerprint] = labels
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return fingerprints, nil
}

// buildSamplesQuery renders the samples SQL (and args) that fetches data
// points for the series selected by subQuery.
//
// Time bounds are inclusive on both ends because that is Prometheus's
// storage contract: Select(mint, maxt) returns [start, end] and the engine
// itself trims each evaluation window to left-open (T-window, T], so the
// sample at exactly `end` belongs to the last point. This deliberately
// differs from the query builder's `unix_milli < end`, which is correct for
// its own model — toStartOfInterval buckets covering [t, t+step), where a
// sample at `end` falls in an unrendered bucket and end-exclusive ranges
// tile exactly across cached time slices.
func buildSamplesQuery(start int64, end int64, metricName string, subQuery string, args []any) (string, []any) {
	argCount := len(args)

	query := fmt.Sprintf(`
		SELECT metric_name, fingerprint, unix_milli, value, flags
			FROM %s.%s
			WHERE metric_name = $1 AND fingerprint GLOBAL IN (%s) AND unix_milli >= $%s AND unix_milli <= $%s ORDER BY fingerprint, unix_milli;`,
		databaseName, distributedSamplesV4, subQuery, strconv.Itoa(argCount+2), strconv.Itoa(argCount+3))
	query = strings.TrimSpace(query)

	allArgs := append([]any{metricName}, args...)
	allArgs = append(allArgs, start, end)
	return query, allArgs
}

func (client *client) querySamples(ctx context.Context, start int64, end int64, fingerprints map[uint64][]prompb.Label, metricName string, subQuery string, args []any) ([]*prompb.TimeSeries, error) {
	ctx = client.withClickhousePrometheusContext(ctx, "querySamples")

	query, allArgs := buildSamplesQuery(start, end, metricName, subQuery, args)

	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query, allArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []*prompb.TimeSeries
	var ts *prompb.TimeSeries
	var fingerprint, prevFingerprint uint64
	var timestampMs, prevTimestamp int64
	var value float64
	var flags uint32

	prevTimestamp = math.MinInt64

	for rows.Next() {
		if err := rows.Scan(&metricName, &fingerprint, &timestampMs, &value, &flags); err != nil {
			return nil, err
		}

		// collect samples in time series
		if fingerprint != prevFingerprint {
			// add collected time series to result
			prevFingerprint = fingerprint
			if ts != nil {
				res = append(res, ts)
			}

			labels := fingerprints[fingerprint]
			ts = &prompb.TimeSeries{
				Labels: labels,
			}
			prevTimestamp = math.MinInt64
		}

		if flags&1 == 1 {
			value = math.Float64frombits(promValue.StaleNaN)
		}

		if timestampMs == prevTimestamp {
			continue
		}
		prevTimestamp = timestampMs

		// add samples to current time series
		ts.Samples = append(ts.Samples, prompb.Sample{
			Timestamp: timestampMs,
			Value:     value,
		})
	}

	// add last time series
	if ts != nil {
		res = append(res, ts)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return mergeSeriesWithIdenticalLabels(res), nil
}

// mergeSeriesWithIdenticalLabels collapses series sharing one labelset into
// one series each. Distinct fingerprints can map to one labelset: a label
// value goes empty over a series' lifetime (#8563), the fingerprint
// algorithm changes across exporter versions, or the env changes. The
// engine treats the labelset as series identity — duplicates raise
// "duplicate series", and #8563's workaround of injecting a synthetic
// fingerprint label silently broke without() and vector matching. Merging
// at the last point before hand-off keeps any future input-side label
// normalization collision-safe. Grouping is by an order-insensitive 64-bit
// hash so the common no-collision case costs one hash and one map insert
// per series; hash-equal groups are confirmed by exact labelset equality
// before any merge. Regression:
// TestClient_QuerySamplesMergesIdenticalLabelSets and
// tests/integration/tests/promqlconformance/02_fingerprint_probe.py.
func mergeSeriesWithIdenticalLabels(series []*prompb.TimeSeries) []*prompb.TimeSeries {
	if len(series) < 2 {
		return series
	}

	groups := make(map[uint64][]*prompb.TimeSeries, len(series))
	order := make([]uint64, 0, len(series))
	for _, ts := range series {
		key := labelsHash(ts.Labels)
		if _, ok := groups[key]; !ok {
			order = append(order, key)
		}
		groups[key] = append(groups[key], ts)
	}
	if len(order) == len(series) {
		return series
	}

	res := make([]*prompb.TimeSeries, 0, len(order))
	for _, key := range order {
		group := groups[key]
		if len(group) == 1 {
			res = append(res, group[0])
			continue
		}
		for _, sub := range splitByLabelSet(group) {
			if len(sub) == 1 {
				res = append(res, sub[0])
				continue
			}
			res = append(res, mergeSamples(sub))
		}
	}
	return res
}

var labelHashSep = []byte{0xff}

// labelsHash combines per-label hashes commutatively, so the stored JSON's
// key order (not canonical across fingerprints) needs no sort.
func labelsHash(lbls []prompb.Label) uint64 {
	var h uint64
	var d xxhash.Digest
	for _, l := range lbls {
		d.Reset()
		_, _ = d.WriteString(l.Name)
		_, _ = d.Write(labelHashSep)
		_, _ = d.WriteString(l.Value)
		h += d.Sum64()
	}
	return h
}

// splitByLabelSet partitions a hash-equal group into sub-groups of exactly
// equal labelsets, preserving input order; series that merely collide on the
// 64-bit hash must not be merged.
func splitByLabelSet(group []*prompb.TimeSeries) [][]*prompb.TimeSeries {
	var out [][]*prompb.TimeSeries
outer:
	for _, ts := range group {
		for i, sub := range out {
			if labelSetsEqual(sub[0].Labels, ts.Labels) {
				out[i] = append(out[i], ts)
				continue outer
			}
		}
		out = append(out, []*prompb.TimeSeries{ts})
	}
	return out
}

func labelSetsEqual(a, b []prompb.Label) bool {
	if len(a) != len(b) {
		return false
	}
	for _, la := range a {
		found := false
		for _, lb := range b {
			if la.Name == lb.Name {
				found = la.Value == lb.Value
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// mergeSamples k-way merges sample streams that share one labelset. On
// equal timestamps the highest fingerprint wins: the input is in ascending
// fingerprint order (samples SQL), keeping the choice deterministic.
func mergeSamples(group []*prompb.TimeSeries) *prompb.TimeSeries {
	merged := &prompb.TimeSeries{Labels: group[0].Labels}
	idx := make([]int, len(group))
	for {
		minTs := int64(math.MaxInt64)
		for i, ts := range group {
			if idx[i] < len(ts.Samples) && ts.Samples[idx[i]].Timestamp < minTs {
				minTs = ts.Samples[idx[i]].Timestamp
			}
		}
		if minTs == math.MaxInt64 {
			return merged
		}
		var chosen prompb.Sample
		for i, ts := range group {
			if idx[i] < len(ts.Samples) && ts.Samples[idx[i]].Timestamp == minTs {
				chosen = ts.Samples[idx[i]]
				idx[i]++
			}
		}
		merged.Samples = append(merged.Samples, chosen)
	}
}

func (client *client) queryRaw(ctx context.Context, query string, ts int64) (*prompb.QueryResult, error) {
	ctx = client.withClickhousePrometheusContext(ctx, "queryRaw")

	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := rows.Columns()
	var res prompb.QueryResult
	targets := make([]any, len(columns))
	for i := range targets {
		targets[i] = new(scanner)
	}

	for rows.Next() {
		if err = rows.Scan(targets...); err != nil {
			return nil, err
		}

		labels := make([]prompb.Label, 0, len(columns))
		var value float64
		for i, c := range columns {
			v := targets[i].(*scanner)
			switch c {
			case "value":
				value = v.f
			default:
				labels = append(labels, prompb.Label{
					Name:  c,
					Value: v.s,
				})
			}
		}

		res.Timeseries = append(res.Timeseries, &prompb.TimeSeries{
			Labels: labels,
			Samples: []prompb.Sample{{
				Value:     value,
				Timestamp: ts,
			}},
		})
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return &res, nil
}

func (client *client) withClickhousePrometheusContext(ctx context.Context, functionName string) context.Context {
	comments := map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "clickhouse-prometheus",
		instrumentationtypes.CodeFunctionName: functionName,
	}
	return ctxtypes.NewContextWithCommentVals(ctx, comments)
}
