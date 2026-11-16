package kafkacondensedmeter

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metertelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/metricstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/condensedmetertypes"
)

const metricNameMetricsDataPointsIngestedCount = "signoz.meter.metric.datapoint.ingested.count"

type clickhouseStore struct {
	telemetryStore telemetrystore.TelemetryStore
}

func newClickhouseStore(telemetryStore telemetrystore.TelemetryStore) *clickhouseStore {
	return &clickhouseStore{telemetryStore: telemetryStore}
}

// FirstIngested is the time of the first ingested meter row, zero when there is none yet.
func (store *clickhouseStore) FirstIngested(ctx context.Context) (time.Time, error) {
	query := fmt.Sprintf("SELECT toInt64(ifNull(min(unix_milli), 0)) FROM %s.%s WHERE metric_name = ?", metertelemetryschema.DBName, metertelemetryschema.SamplesTableName)

	var unixMilli int64
	if err := store.telemetryStore.ClickhouseDB().QueryRow(ctx, query, metricNameMetricsDataPointsIngestedCount).Scan(&unixMilli); err != nil {
		return time.Time{}, errors.WrapInternalf(err, errors.CodeInternal, "failed to query first ingested meter row")
	}

	if unixMilli == 0 {
		return time.Time{}, nil
	}

	return time.UnixMilli(unixMilli), nil
}

// CondensedRows counts distinct (reduced_fingerprint, minute) in both reduced tables, since the condensing views append each minute several times.
// A minute never appears in both tables: gauges go to one and counters to the other.
// Dimensions come from the reduced series; a condensed row without its series is still counted, without dimensions.
func (store *clickhouseStore) CondensedRows(ctx context.Context, dimensions []string, hour time.Time) ([]condensedmetertypes.Row, error) {
	aliases := make([]string, len(dimensions))
	selects := make([]string, len(dimensions))
	for i, dimension := range dimensions {
		aliases[i] = clickhousesql.Identifier(fmt.Sprintf("dimension_%d", i))
		selects[i] = fmt.Sprintf("any(resource_attrs[%s]) AS %s", clickhousesql.StringLiteral(dimension), aliases[i])
	}

	condensed := func(table string) string {
		return fmt.Sprintf("SELECT reduced_fingerprint, unix_milli FROM %s.%s WHERE unix_milli >= ? AND unix_milli < ? AND NOT match(metric_name, '^(signoz|otelcol)') GROUP BY reduced_fingerprint, unix_milli", metricstelemetryschema.DBName, table)
	}

	query := fmt.Sprintf(
		"SELECT %s FROM (%s UNION ALL %s) AS condensed LEFT JOIN (SELECT %s FROM %s.%s WHERE unix_milli >= ? AND unix_milli < ? GROUP BY fingerprint) AS series ON condensed.reduced_fingerprint = series.fingerprint",
		strings.Join(append(aliases, "toUInt64(count())"), ", "),
		condensed(metricstelemetryschema.SamplesV4ReducedLastTableName),
		condensed(metricstelemetryschema.SamplesV4ReducedSumTableName),
		strings.Join(append([]string{"fingerprint"}, selects...), ", "),
		metricstelemetryschema.DBName,
		metricstelemetryschema.TimeseriesV4ReducedTableName,
	)
	if len(aliases) > 0 {
		query += " GROUP BY " + strings.Join(aliases, ", ")
	}

	start, end := hour.UnixMilli(), hour.Add(time.Hour).UnixMilli()
	rows, err := store.telemetryStore.ClickhouseDB().Query(ctx, query, start, end, start, end, start, end)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to query condensed rows")
	}
	defer rows.Close()

	condensedRows := []condensedmetertypes.Row{}
	for rows.Next() {
		row := condensedmetertypes.Row{Values: make([]string, len(dimensions))}
		dest := make([]any, 0, len(dimensions)+1)
		for i := range row.Values {
			dest = append(dest, &row.Values[i])
		}
		dest = append(dest, &row.Count)

		if err := rows.Scan(dest...); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan condensed rows")
		}

		if row.Count > 0 {
			condensedRows = append(condensedRows, row)
		}
	}

	return condensedRows, rows.Err()
}
