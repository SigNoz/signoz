package querier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// StatementExecution describes the result of a server-built statement. This is
// an internal execution API, not an HTTP SQL endpoint. Callers must construct
// parameterized statements with the authenticated organization and time bounds.
type StatementExecution struct {
	Name            string
	Kind            qbtypes.RequestType
	Window          *qbtypes.TimeRange
	Step            qbtypes.Step
	NormalizeSpans  bool
	MaskQueryErrors bool
	MaxRows         int
}

// ExecuteStatement is shared by builder queries, trace operators and domain
// modules. All use the configured TelemetryStore, its hooks and the same typed
// result consumers; no module needs a second database connection or row decoder.
func ExecuteStatement(ctx context.Context, store telemetrystore.TelemetryStore, stmt *qbtypes.Statement, opts StatementExecution) (*qbtypes.Result, error) {
	rows, err := store.QueryContext(ctx, stmt.Query, stmt.Args...)
	if err != nil {
		// Preserve the builder API's existing handling of driver failures while
		// keeping cancellation, timeouts and deliberate unsupported responses.
		if opts.MaskQueryErrors && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) && !errors.Ast(err, errors.TypeUnsupported) {
			return nil, errors.NewInternalf(errors.CodeInternal, "Something went wrong on our end. It's not you, it's us. Our team is notified about it. Reach out to support if issue persists.")
		}
		return nil, err
	}
	defer rows.Close()
	if opts.MaxRows > 0 {
		rows = &boundedRows{Rows: rows, max: opts.MaxRows}
	}
	payload, err := consume(rows, opts.Kind, opts.Window, opts.Step, opts.Name)
	if err != nil {
		return nil, err
	}
	if opts.NormalizeSpans {
		if raw, ok := payload.(*qbtypes.RawData); ok {
			for _, row := range raw.Rows {
				mergeSpanAttributeColumns(row.Data)
			}
		}
	}
	stats := rows.QueryStats()
	return &qbtypes.Result{
		Type: opts.Kind, Value: payload,
		Stats: qbtypes.ExecStats{RowsScanned: stats.RowsScanned, BytesScanned: stats.BytesScanned, DurationMS: uint64(stats.Elapsed.Milliseconds())},
	}, nil
}

type boundedRows struct {
	telemetrystore.Rows
	max, seen int
	err       error
}

func (r *boundedRows) Next() bool {
	if r.err != nil || !r.Rows.Next() {
		return false
	}
	r.seen++
	if r.seen > r.max {
		r.err = errors.NewInvalidInputf(errors.CodeInvalidInput, "query exceeds the %d row result limit; narrow the time range or filters", r.max)
		return false
	}
	return true
}

func (r *boundedRows) Err() error {
	if r.err != nil {
		return r.err
	}
	return r.Rows.Err()
}
