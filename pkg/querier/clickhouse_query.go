package querier

import (
	"context"
	"log/slog"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type chSQLQuery struct {
	logger         *slog.Logger
	telemetryStore telemetrystore.TelemetryStore

	query  qbtypes.ClickHouseQuery
	args   []any
	fromMS uint64
	toMS   uint64
	kind   qbtypes.RequestType
	vars   map[string]qbtypes.VariableItem
}

var _ qbtypes.Query = (*chSQLQuery)(nil)
var _ qbtypes.StatementProvider = (*chSQLQuery)(nil)

func newchSQLQuery(
	logger *slog.Logger,
	telemetryStore telemetrystore.TelemetryStore,
	query qbtypes.ClickHouseQuery,
	args []any,
	tr qbtypes.TimeRange,
	kind qbtypes.RequestType,
	variables map[string]qbtypes.VariableItem,
) *chSQLQuery {
	return &chSQLQuery{
		logger:         logger,
		telemetryStore: telemetryStore,
		query:          query,
		args:           args,
		fromMS:         tr.From,
		toMS:           tr.To,
		kind:           kind,
		vars:           variables,
	}
}

func (q *chSQLQuery) Fingerprint() string {
	// No caching for CH queries for now
	return ""
}

func (q *chSQLQuery) Window() (uint64, uint64) { return q.fromMS, q.toMS }

func (q *chSQLQuery) renderVars(query string, vars map[string]qbtypes.VariableItem, start, end uint64) (string, error) {
	return substituteVariables(query, vars, start, end, formatValueForCH, "clickhouse-query")
}

func (q *chSQLQuery) render(ctx context.Context) (string, error) {
	rendered, err := q.renderVars(q.query.Query, q.vars, q.fromMS, q.toMS)
	if err != nil {
		return "", err
	}

	querybuilder.LogIfStatementIsNotValid(ctx, q.logger, rendered)

	return rendered, nil
}

// Statement renders the SQL without executing it, for the preview path.
func (q *chSQLQuery) Statement(ctx context.Context) (*qbtypes.Statement, error) {
	rendered, err := q.render(ctx)
	if err != nil {
		return nil, err
	}
	return &qbtypes.Statement{Query: rendered, Args: q.args}, nil
}

func (q *chSQLQuery) Execute(ctx context.Context) (*qbtypes.Result, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.QueryDuration: instrumentationtypes.DurationBucket(q.fromMS, q.toMS),
	})

	totalRows := uint64(0)
	totalBytes := uint64(0)
	elapsed := time.Duration(0)

	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		totalRows += p.Rows
		totalBytes += p.Bytes
		elapsed += p.Elapsed
	}))

	query, err := q.render(ctx)
	if err != nil {
		return nil, err
	}

	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, query, q.args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payload, err := consume(rows, q.kind, nil, qbtypes.Step{}, q.query.Name)
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
