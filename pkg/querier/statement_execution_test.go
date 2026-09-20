package querier

import (
	"context"
	"fmt"
	"testing"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/require"
)

type statementTestStore struct {
	telemetrystore.TelemetryStore
	rows telemetrystore.Rows
	err  error
}

func (s statementTestStore) QueryContext(context.Context, string, ...any) (telemetrystore.Rows, error) {
	return s.rows, s.err
}

type statementTestRows struct {
	telemetrystore.Rows
	closed bool
}

func (r *statementTestRows) Close() error {
	r.closed = true
	return r.Rows.Close()
}

func TestExecuteStatementBoundedResults(t *testing.T) {
	for _, count := range []int{2, 3} {
		t.Run(fmt.Sprint(count), func(t *testing.T) {
			values := make([][]any, count)
			for i := range values {
				values[i] = []any{uint64(i + 1)}
			}
			rows := &statementTestRows{Rows: telemetrystore.AdaptClickHouseRows(telemetrystore.WrapRows(cmock.NewRows([]cmock.ColumnType{{Name: "__result_0", Type: "UInt64"}}, values)), nil)}
			result, err := ExecuteStatement(context.Background(), statementTestStore{rows: rows}, &qbtypes.Statement{Query: "SELECT value"}, StatementExecution{Name: "A", Kind: qbtypes.RequestTypeScalar, MaxRows: 2})
			require.True(t, rows.closed, "close on success and on result-limit failure")
			if count > 2 {
				require.ErrorContains(t, err, "row result limit")
				require.True(t, errors.Ast(err, errors.TypeInvalidInput))
				require.Nil(t, result, "never return a silently truncated aggregate")
			} else {
				require.NoError(t, err)
				require.Len(t, result.Value.(*qbtypes.ScalarData).Data, count)
			}
		})
	}
}

func TestExecuteStatementBuilderErrorPolicy(t *testing.T) {
	for _, original := range []error{context.Canceled, context.DeadlineExceeded, telemetrystore.Unsupported("test feature"), fmt.Errorf("private database details")} {
		_, err := ExecuteStatement(context.Background(), statementTestStore{err: original}, &qbtypes.Statement{}, StatementExecution{MaskQueryErrors: true})
		if errors.Is(original, context.Canceled) || errors.Is(original, context.DeadlineExceeded) || errors.Ast(original, errors.TypeUnsupported) {
			require.Equal(t, original, err)
		} else {
			require.NotContains(t, err.Error(), "private database details")
			require.True(t, errors.Ast(err, errors.TypeInternal))
		}
	}
}
