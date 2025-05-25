package querier

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type chSQLQuery struct {
	telemetryStore telemetrystore.TelemetryStore

	query  qbtypes.ClickHouseQuery
	args   []any
	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
}

func newchSQLQuery(
	telemetryStore telemetrystore.TelemetryStore,
	query qbtypes.ClickHouseQuery,
	args []any,
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
) *chSQLQuery {
	return &chSQLQuery{
		telemetryStore: telemetryStore,
		query:          query,
		args:           args,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
	}
}

func (q *chSQLQuery) Fingerprint() string      { return q.query.Query }
func (q *chSQLQuery) Window() (uint64, uint64) { return q.fromMS, q.toMS }

func (q *chSQLQuery) Execute(ctx context.Context) (qbtypes.Result, error) {
	start := time.Now()

	totalRows := uint64(0)
	totalBytes := uint64(0)
	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
	}))

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, q.query.Query, q.args...)
	if err != nil {
		return qbtypes.Result{}, err
	}
	defer rows.Close()

	payload, err := consume(rows, q.kind)
	if err != nil {
		return qbtypes.Result{}, err
	}
	return qbtypes.Result{
		Type:  q.kind,
		Value: payload,
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(time.Since(start).Milliseconds()),
		},
	}, nil
}
