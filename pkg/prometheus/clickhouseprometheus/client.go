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
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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

	// For series-only requests (e.g. /api/v1/series), return label sets directly
	// without fetching sample data. This avoids the "metric_name = ''" condition
	// in querySamples when no __name__ matcher is present.
	if query.Hints != nil && query.Hints.Func == "series" {
		res := new(prompb.QueryResult)
		for _, lbls := range fingerprints {
			res.Timeseries = append(res.Timeseries, &prompb.TimeSeries{Labels: lbls})
		}
		return remote.FromQueryResult(sortSeries, res), nil
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
	var selectString = "fingerprint, any(labels)"
	if subQuery {
		selectString = "fingerprint"
	}

	start, end, tableName := getStartAndEndAndTableName(query.StartTimestampMs, query.EndTimestampMs)

	// nextArgIdx is 1-based. For subQuery=true, $1 is reserved by querySamples
	// (prepended as metricName), so our args begin at $2.
	nextArgIdx := 1
	if subQuery {
		nextArgIdx = 2
	}

	var args []any

	// Only add a metric_name filter when __name__ was found in the matchers.
	// Omitting this when metricName is empty prevents "metric_name = ''" which
	// would match no rows for selectors like {k8s.container.name="coredns"}.
	if metricName != "" {
		conditions = append(conditions, fmt.Sprintf("metric_name = $%d", nextArgIdx))
		args = append(args, metricName)
		nextArgIdx++
	}
	conditions = append(conditions, "temporality IN ['Cumulative', 'Unspecified']")
	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	normalized := !constants.IsDotMetricsEnabled
	conditions = append(conditions, fmt.Sprintf("__normalized = %v", normalized))

	for _, m := range query.Matchers {
		if m.Name == "__name__" && m.Type == prompb.LabelMatcher_EQ {
			// EQ __name__ is already handled via metric_name = $N above;
			// skip the redundant JSONExtractString("__name__") condition.
			continue
		}
		switch m.Type {
		case prompb.LabelMatcher_EQ:
			conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, $%d) = $%d", nextArgIdx, nextArgIdx+1))
		case prompb.LabelMatcher_NEQ:
			conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, $%d) != $%d", nextArgIdx, nextArgIdx+1))
		case prompb.LabelMatcher_RE:
			conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, $%d), $%d)", nextArgIdx, nextArgIdx+1))
		case prompb.LabelMatcher_NRE:
			conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, $%d), $%d)", nextArgIdx, nextArgIdx+1))
		default:
			return "", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported or invalid matcher type: %s", m.Type.String())
		}
		args = append(args, unescapePromLabelName(m.Name), m.Value)
		nextArgIdx += 2
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

		labels, _, err := unmarshalLabels(labelString, fingerprint)
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

func (client *client) querySamples(ctx context.Context, start int64, end int64, fingerprints map[uint64][]prompb.Label, metricName string, subQuery string, args []any) ([]*prompb.TimeSeries, error) {
	ctx = client.withClickhousePrometheusContext(ctx, "querySamples")
	argCount := len(args)

	query := fmt.Sprintf(`
		SELECT metric_name, fingerprint, unix_milli, value, flags
			FROM %s.%s
			WHERE metric_name = $1 AND fingerprint GLOBAL IN (%s) AND unix_milli >= $%s AND unix_milli <= $%s ORDER BY fingerprint, unix_milli;`,
		databaseName, distributedSamplesV4, subQuery, strconv.Itoa(argCount+2), strconv.Itoa(argCount+3))
	query = strings.TrimSpace(query)

	allArgs := append([]any{metricName}, args...)
	allArgs = append(allArgs, start, end)

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

	return res, nil
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

// unescapePromLabelName converts a Prometheus value-encoded label name back to
// its original UTF-8 form. Value-encoded names start with "U__" and use _XX_
// (lowercase hex) sequences for non-legacy characters, and __ for a literal
// underscore. See https://prometheus.io/docs/instrumenting/escaping_schemes/
func unescapePromLabelName(name string) string {
	if len(name) < 3 || name[:3] != "U__" {
		return name
	}
	enc := name[3:]
	var b strings.Builder
	b.Grow(len(enc))
	for i := 0; i < len(enc); {
		if enc[i] != '_' {
			b.WriteByte(enc[i])
			i++
			continue
		}
		// doubled underscore → original underscore
		if i+1 < len(enc) && enc[i+1] == '_' {
			b.WriteByte('_')
			i += 2
			continue
		}
		// _XX_ hex escape
		if i+3 < len(enc) && enc[i+3] == '_' {
			hi, hiOk := promHexVal(enc[i+1])
			lo, loOk := promHexVal(enc[i+2])
			if hiOk && loOk {
				b.WriteByte(hi<<4 | lo)
				i += 4
				continue
			}
		}
		b.WriteByte('_')
		i++
	}
	return b.String()
}

func promHexVal(c byte) (byte, bool) {
	switch {
	case c >= '0' && c <= '9':
		return c - '0', true
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10, true
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10, true
	}
	return 0, false
}

func (client *client) withClickhousePrometheusContext(ctx context.Context, functionName string) context.Context {
	comments := map[string]string{
		instrumentationtypes.TelemetrySignal:  telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.CodeNamespace:    "clickhouse-prometheus",
		instrumentationtypes.CodeFunctionName: functionName,
	}
	return ctxtypes.NewContextWithCommentVals(ctx, comments)
}
