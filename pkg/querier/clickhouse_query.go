package querier

import (
	"context"
	"time"

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
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, q.query.Query, q.args...)
	if err != nil {
		return qbtypes.Result{}, err
	}
	defer rows.Close()

	payload, stats, err := consume(rows, q.kind)
	if err != nil {
		return qbtypes.Result{}, err
	}
	return qbtypes.Result{
		Type:  q.kind,
		Value: payload,
		Stats: qbtypes.ExecStats{
			RowsScanned:  stats.Rows,
			BytesScanned: stats.Bytes,
			DurationMS:   time.Since(start).Milliseconds(),
		},
	}, nil
}
