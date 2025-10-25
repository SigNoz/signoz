package querier

import (
	"context"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type traceOperatorQuery struct {
	telemetryStore telemetrystore.TelemetryStore
	stmtBuilder    qbtypes.TraceOperatorStatementBuilder
	spec           qbtypes.QueryBuilderTraceOperator
	compositeQuery *qbtypes.CompositeQuery
	fromMS         uint64
	toMS           uint64
	kind           qbtypes.RequestType
}

var _ qbtypes.Query = (*traceOperatorQuery)(nil)

func (q *traceOperatorQuery) Fingerprint() string {
	return ""
}

func (q *traceOperatorQuery) Window() (uint64, uint64) {
	return q.fromMS, q.toMS
}

func (q *traceOperatorQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
	stmt, err := q.stmtBuilder.Build(
		ctx,
		q.fromMS,
		q.toMS,
		q.kind,
		q.spec,
		q.compositeQuery,
	)
	if err != nil {
		return nil, err
	}

	// Execute the query with proper context
	result, err := q.executeWithContext(ctx, stmt.Query, stmt.Args)
	if err != nil {
		return nil, err
	}
	result.Warnings = stmt.Warnings
	return result, nil
}

func (q *traceOperatorQuery) executeWithContext(ctx context.Context, query string, args []any) (*qbtypes.Result, error) {
	totalRows := uint64(0)
	totalBytes := uint64(0)
	elapsed := time.Duration(0)

	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
		elapsed += p.Elapsed
	}))

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Pass query window and step for partial value detection
	queryWindow := &qbtypes.TimeRange{From: q.fromMS, To: q.toMS}

	// Use the consume function like builderQuery does
	payload, err := consume(rows, q.kind, queryWindow, q.spec.StepInterval, q.spec.Name)
	if err != nil {
		return nil, err
	}

	return &qbtypes.Result{
		Type:  q.kind,
		Value: payload,
		Stats: qbtypes.ExecStats{
			RowsScanned:  totalRows,
			BytesScanned: totalBytes,
			DurationMS:   uint64(elapsed.Milliseconds()),
		},
	}, nil
}
