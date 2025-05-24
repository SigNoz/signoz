package querier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type builderQuery[T any] struct {
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.StatementBuilder[T]
	spec           qbtypes.QueryBuilderQuery[T]

	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
}

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
	return ""
}

func (q *builderQuery[T]) Window() (uint64, uint64) {
	return q.fromMS, q.toMS
}

func (q *builderQuery[T]) Execute(ctx context.Context) (qbtypes.Result, error) {
	stmt, err := q.stmtBuilder.Build(ctx, q.fromMS, q.toMS, q.kind, q.spec)
	if err != nil {
		return qbtypes.Result{}, err
	}

	chQuery := qbtypes.ClickHouseQuery{
		Name:  q.spec.Name,
		Query: stmt.Query,
	}

	chExec := newchSQLQuery(q.telemetryStore, chQuery, stmt.Args, qbtypes.TimeRange{From: q.fromMS, To: q.toMS}, q.kind)
	return chExec.Execute(ctx)
}
