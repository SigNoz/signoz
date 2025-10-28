package clickhouseprometheus

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
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

func (client *client) queryToClickhouseQuery(_ context.Context, query *prompb.Query, metricName string, subQuery bool) (string, []any, error) {
	var clickHouseQuery string
	var conditions []string
	var argCount int = 0
	var selectString string = "fingerprint, any(labels)"
	if subQuery {
		argCount = 1
		selectString = "fingerprint"
	}

	start, end, tableName := getStartAndEndAndTableName(query.StartTimestampMs, query.EndTimestampMs)

	var args []any
	conditions = append(conditions, fmt.Sprintf("metric_name = $%d", argCount+1))
	conditions = append(conditions, "temporality IN ['Cumulative', 'Unspecified']")
	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", start, end))

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	conditions = append(conditions, fmt.Sprintf("__normalized = %v", normalized))

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
