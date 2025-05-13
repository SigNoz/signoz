package engine

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type sqlQuery struct {
	telemetryStore telemetrystore.TelemetryStore

	sql    string
	args   []any
	fp     string
	fromMS uint64
	toMS   uint64
	kind   querybuildertypesv5.RequestType
}

func newSQLQuery(sql string, args []any, fp string, from, to uint64,
	kind querybuildertypesv5.RequestType, telemetryStore telemetrystore.TelemetryStore) *sqlQuery {
	return &sqlQuery{telemetryStore, sql, args, fp, from, to, kind}
}

func (q *sqlQuery) Fingerprint() string      { return q.fp }
func (q *sqlQuery) Window() (uint64, uint64) { return q.fromMS, q.toMS }

// Execute runs the query and converts rows → query.Result.
// Swap the 'consume' stub with your own mapper.
func (q *sqlQuery) Execute(ctx context.Context) (querybuildertypesv5.Result, error) {
	fmt.Println(q.sql, q.args)
	return querybuildertypesv5.Result{}, nil
	start := time.Now()
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, q.sql, q.args...)
	if err != nil {
		return querybuildertypesv5.Result{}, err
	}
	defer rows.Close()

	payload, stats, err := consume(rows, q.kind)
	if err != nil {
		return querybuildertypesv5.Result{}, err
	}
	return querybuildertypesv5.Result{
		Type:  q.kind,
		Value: payload,
		Stats: querybuildertypesv5.ExecStats{
			RowsScanned:  stats.Rows,
			BytesScanned: stats.Bytes,
			DurationMS:   time.Since(start).Milliseconds(),
		},
	}, nil
}

// consume is **intentionally trivial** here; replace with real mapping.
type rowStats struct{ Rows, Bytes int64 }

func consume(rows driver.Rows, kind querybuildertypesv5.RequestType) (any, rowStats, error) {
	var out any
	switch kind {
	case querybuildertypesv5.RequestTypeScalar:
		var v float64
		if rows.Next() {
			_ = rows.Scan(&v)
		}
		out = v
	case querybuildertypesv5.RequestTypeTimeSeries:
		type point struct {
			TS  int64
			Val float64
		}
		var series []point
		for rows.Next() {
			var p point
			_ = rows.Scan(&p.TS, &p.Val)
			series = append(series, p)
		}
		out = series
	default:
		// raw, _ := sqlx.RowsToSlice(rows)
		// out = raw
	}
	return out, rowStats{}, nil
}
