package querier

import (
	"context"
	"encoding/base64"
	"strconv"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

type builderQuery[T any] struct {
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.StatementBuilder[T]
	spec           qbtypes.QueryBuilderQuery[T]

	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
}

var _ qbtypes.Query = (*builderQuery[any])(nil)

func newBuilderQuery[T any](
	telemetryStore telemetrystore.TelemetryStore,
	stmtBuilder qbtypes.StatementBuilder[T],
	spec qbtypes.QueryBuilderQuery[T],
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
) *builderQuery[T] {
	return &builderQuery[T]{
		telemetryStore: telemetryStore,
		stmtBuilder:    stmtBuilder,
		spec:           spec,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
	}
}

func (q *builderQuery[T]) Fingerprint() string {
	// TODO: implement this
	return ""
}

func (q *builderQuery[T]) Window() (uint64, uint64) {
	return q.fromMS, q.toMS
}

// must be a single query, ordered by timestamp (logs need an id tie-break).
func (q *builderQuery[T]) isWindowList() bool {
	if len(q.spec.Order) == 0 {
		return false
	}

	// first ORDER BY must be `timestamp`
	if q.spec.Order[0].Key.Name != "timestamp" {
		return false
	}

	if q.spec.Signal == telemetrytypes.SignalLogs {
		// logs require timestamp,id with identical direction
		if len(q.spec.Order) != 2 || q.spec.Order[1].Key.Name != "id" ||
			q.spec.Order[1].Direction != q.spec.Order[0].Direction {
			return false
		}
	}
	return true
}

func (q *builderQuery[T]) Execute(ctx context.Context) (*qbtypes.Result, error) {

	// can we do window based pagination?
	if q.kind == qbtypes.RequestTypeRaw && q.isWindowList() {
		return q.executeWindowList(ctx)
	}

	stmt, err := q.stmtBuilder.Build(ctx, q.fromMS, q.toMS, q.kind, q.spec)
	if err != nil {
		return nil, err
	}

	chQuery := qbtypes.ClickHouseQuery{
		Name:  q.spec.Name,
		Query: stmt.Query,
	}

	chExec := newchSQLQuery(q.telemetryStore, chQuery, stmt.Args, qbtypes.TimeRange{From: q.fromMS, To: q.toMS}, q.kind)
	result, err := chExec.Execute(ctx)
	if err != nil {
		return nil, err
	}
	result.Warnings = stmt.Warnings
	return result, nil
}

func (q *builderQuery[T]) executeWindowList(ctx context.Context) (*qbtypes.Result, error) {
	isAsc := len(q.spec.Order) > 0 &&
		strings.ToLower(string(q.spec.Order[0].Direction.StringValue())) == "asc"

	// Adjust [fromMS,toMS] window if a cursor was supplied
	if cur := strings.TrimSpace(q.spec.Cursor); cur != "" {
		if ts, err := decodeCursor(cur); err == nil {
			if isAsc {
				if uint64(ts) >= q.fromMS {
					q.fromMS = uint64(ts + 1)
				}
			} else { // DESC
				if uint64(ts) <= q.toMS {
					q.toMS = uint64(ts - 1)
				}
			}
		}
	}

	reqLimit := q.spec.Limit
	if reqLimit == 0 {
		reqLimit = 10_000 // sane upper-bound default
	}
	offsetLeft := q.spec.Offset
	need := reqLimit + offsetLeft // rows to fetch from ClickHouse

	var rows []*qbtypes.RawRow

	totalRows := uint64(0)
	totalBytes := uint64(0)
	start := time.Now()

	for _, r := range makeBuckets(q.fromMS, q.toMS) {
		q.spec.Offset = 0
		q.spec.Limit = need

		stmt, err := q.stmtBuilder.Build(ctx, r.fromNS/1e6, r.toNS/1e6, q.kind, q.spec)
		if err != nil {
			return nil, err
		}

		chExec := newchSQLQuery(
			q.telemetryStore,
			qbtypes.ClickHouseQuery{Name: q.spec.Name, Query: stmt.Query},
			stmt.Args,
			qbtypes.TimeRange{From: q.fromMS, To: q.toMS},
			q.kind,
		)
		res, err := chExec.Execute(ctx)
		if err != nil {
			return nil, err
		}
		totalRows += res.Stats.RowsScanned
		totalBytes += res.Stats.BytesScanned

		rawRows := res.Value.(*qbtypes.RawData).Rows
		need -= len(rawRows)

		for _, rr := range rawRows {
			if offsetLeft > 0 { // client-requested initial offset
				offsetLeft--
				continue
			}
			rows = append(rows, rr)
			if len(rows) >= reqLimit { // page filled
				break
			}
		}
		if len(rows) >= reqLimit {
			break
		}
	}

	nextCursor := ""
	if len(rows) == reqLimit {
		lastTS := rows[len(rows)-1].Timestamp.UnixMilli()
		nextCursor = encodeCursor(lastTS)
	}

	return &qbtypes.Result{
		Type: qbtypes.RequestTypeRaw,
		Value: &qbtypes.RawData{
			QueryName:  q.spec.Name,
			Rows:       rows,
			NextCursor: nextCursor,
		},
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(time.Since(start).Milliseconds()),
		},
	}, nil
}

func encodeCursor(tsMilli int64) string {
	return base64.StdEncoding.EncodeToString([]byte(strconv.FormatInt(tsMilli, 10)))
}

func decodeCursor(cur string) (int64, error) {
	b, err := base64.StdEncoding.DecodeString(cur)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(string(b), 10, 64)
}
