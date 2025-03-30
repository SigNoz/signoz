package clickhouseprometheus

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/pkg/errors"
	"github.com/prometheus/common/model"
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
			if prometheus.MatchType(m.Type) == prometheus.MatchEqual && m.Name == "job" && m.Value == "rawsql" {
				hasJob = true
			}
			if prometheus.MatchType(m.Type) == prometheus.MatchEqual && m.Name == "query" {
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

	q := client.PromQueryToQuery(ctx, query)

	var metricName string
	for _, matcher := range q.Matchers {
		if matcher.Name == "__name__" {
			metricName = matcher.Value
		}
	}

	clickhouseQuery, args, err := client.QueryToClickhouseQuery(ctx, query, metricName, false)
	if err != nil {
		return nil, err
	}

	fingerprints, err := client.FingerprintsFromClickhouseQuery(ctx, clickhouseQuery, args)
	if err != nil {
		return nil, err
	}

	clickhouseSubQuery, args, err := client.QueryToClickhouseQuery(ctx, query, metricName, true)
	if err != nil {
		return nil, err
	}

	res := new(prompb.QueryResult)
	if len(fingerprints) == 0 {
		return remote.FromQueryResult(sortSeries, res), nil
	}

	timeseries, err := client.querySamples(ctx, int64(query.StartTimestampMs), int64(query.EndTimestampMs), fingerprints, metricName, clickhouseSubQuery, args)
	if err != nil {
		return nil, err
	}

	res.Timeseries = timeseries

	return remote.FromQueryResult(sortSeries, res), nil
}

func (client *client) PromQueryToQuery(ctx context.Context, query *prompb.Query) prometheus.Query {
	q := prometheus.Query{
		Start:    model.Time(query.StartTimestampMs),
		End:      model.Time(query.EndTimestampMs),
		Matchers: make([]prometheus.Matcher, len(query.Matchers)),
	}

	for j, m := range query.Matchers {
		var t prometheus.MatchType
		switch m.Type {
		case prompb.LabelMatcher_EQ:
			t = prometheus.MatchEqual
		case prompb.LabelMatcher_NEQ:
			t = prometheus.MatchNotEqual
		case prompb.LabelMatcher_RE:
			t = prometheus.MatchRegexp
		case prompb.LabelMatcher_NRE:
			t = prometheus.MatchNotRegexp
		default:
			client.settings.Logger().ErrorContext(ctx, "unexpected matcher found in query", "matcher", m.Type)
		}

		q.Matchers[j] = prometheus.Matcher{
			Type:  t,
			Name:  m.Name,
			Value: m.Value,
		}
	}

	if query.Hints != nil {
		client.settings.Logger().WarnContext(ctx, "ignoring hints for query", "hints", *query.Hints)
	}

	return q
}

func (client *client) QueryToClickhouseQuery(ctx context.Context, query *prompb.Query, metricName string, subQuery bool) (string, []any, error) {
	var clickHouseQuery string
	var conditions []string
	var argCount int = 0
	var selectString string = "fingerprint, any(labels)"
	if subQuery {
		argCount = 1
		selectString = "fingerprint"
	}

	start, end, tableName := GetStartEndAndTableName(query.StartTimestampMs, query.EndTimestampMs)

	var args []any
	conditions = append(conditions, fmt.Sprintf("metric_name = $%d", argCount+1))
	conditions = append(conditions, "temporality IN ['Cumulative', 'Unspecified']")
	conditions = append(conditions, "__normalized = true")
	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

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
			return "", nil, fmt.Errorf("prepareClickHouseQuery: unexpected matcher %d", m.Type)
		}
		args = append(args, m.Name, m.Value)
		argCount += 2
	}

	whereClause := strings.Join(conditions, " AND ")

	clickHouseQuery = fmt.Sprintf(`SELECT %s FROM %s.%s WHERE %s GROUP BY fingerprint`, selectString, databaseName, tableName, whereClause)

	return clickHouseQuery, args, nil
}

func (client *client) FingerprintsFromClickhouseQuery(ctx context.Context, query string, args []any) (map[uint64][]prompb.Label, error) {
	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fingerprints := make(map[uint64][]prompb.Label)

	var fingerprint uint64
	var b []byte
	for rows.Next() {
		if err = rows.Scan(&fingerprint, &b); err != nil {
			return nil, err
		}

		labels, _, err := unmarshalLabels(b)
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

func (client *client) scanSamples(_ context.Context, rows driver.Rows, fingerprints map[uint64][]prompb.Label) ([]*prompb.TimeSeries, error) {
	var res []*prompb.TimeSeries
	var ts *prompb.TimeSeries
	var fingerprint, prevFingerprint uint64
	var timestampMs int64
	var value float64
	var metricName string

	for rows.Next() {
		if err := rows.Scan(&metricName, &fingerprint, &timestampMs, &value); err != nil {
			return nil, errors.WithStack(err)
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
		}

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
		return nil, errors.WithStack(err)
	}

	return res, nil
}

func (client *client) querySamples(ctx context.Context, start int64, end int64, fingerprints map[uint64][]prompb.Label, metricName string, subQuery string, args []interface{}) ([]*prompb.TimeSeries, error) {
	argCount := len(args)

	query := fmt.Sprintf(`
		SELECT metric_name, fingerprint, unix_milli, value
			FROM %s.%s
			WHERE metric_name = $1 AND fingerprint GLOBAL IN (%s) AND unix_milli >= $%s AND unix_milli <= $%s ORDER BY fingerprint, unix_milli;`,
		databaseName, distributedSamplesV4, subQuery, strconv.Itoa(argCount+2), strconv.Itoa(argCount+3))
	query = strings.TrimSpace(query)

	allArgs := append([]interface{}{metricName}, args...)
	allArgs = append(allArgs, start, end)

	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query, allArgs...)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer rows.Close()

	return client.scanSamples(ctx, rows, fingerprints)
}

func (client *client) queryRaw(ctx context.Context, query string, ts int64) (*prompb.QueryResult, error) {
	rows, err := client.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := rows.Columns()
	var res prompb.QueryResult
	targets := make([]interface{}, len(columns))
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
