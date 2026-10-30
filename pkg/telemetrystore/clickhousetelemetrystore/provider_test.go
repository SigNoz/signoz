package clickhousetelemetrystore

import (
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCastError(t *testing.T) {
	testCases := []struct {
		name            string
		exception       *clickhouse.Exception
		wantCode        errors.Code
		wantMessage     string
		wantSuggestions []string
	}{
		{
			name:            "BadGet_ParameterOfWrongType",
			exception:       &clickhouse.Exception{Code: int32(chproto.ErrBadGet), Message: "Bad get: has UInt64, requested Float64"},
			wantCode:        ErrCodeIllegalArgument,
			wantMessage:     "parameter of the wrong type: Bad get: has UInt64, requested Float64",
			wantSuggestions: []string{"write numeric function parameters in the type the function expects, for example 1.0 rather than 1 where it takes a Float64"},
		},
		{
			name:            "DistributedInJoinSubqueryDenied_UseGlobal",
			exception:       &clickhouse.Exception{Code: int32(chproto.ErrDistributedInJoinSubqueryDenied), Message: "Double-distributed IN/JOIN subqueries is denied (distributed_product_mode = 'deny')"},
			wantCode:        ErrCodeDistributedSubqueryDenied,
			wantMessage:     "IN or JOIN subquery over a distributed table is not allowed: Double-distributed IN/JOIN subqueries is denied (distributed_product_mode = 'deny')",
			wantSuggestions: []string{"use GLOBAL IN or GLOBAL JOIN for the subquery"},
		},
		{
			name:            "DecimalOverflow_CastWider",
			exception:       &clickhouse.Exception{Code: int32(chproto.ErrDecimalOverflow), Message: "Decimal math overflow"},
			wantCode:        ErrCodeDecimalOverflow,
			wantMessage:     "decimal overflow: Decimal math overflow",
			wantSuggestions: []string{"cast the Decimal values to Float64, or to a wider Decimal such as Decimal128, before the arithmetic"},
		},
		{
			name:            "SyntaxError_NoSuggestions",
			exception:       &clickhouse.Exception{Code: int32(chproto.ErrSyntaxError), Message: "Syntax error: failed at position 1"},
			wantCode:        ErrCodeSyntaxError,
			wantMessage:     "SQL syntax error: Syntax error: failed at position 1",
			wantSuggestions: []string{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := castError(testCase.exception)
			require.Error(t, err)

			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			assert.True(t, errors.Asc(err, testCase.wantCode))
			got := errors.AsJSON(err)
			assert.Equal(t, testCase.wantMessage, got.Message)
			assert.Equal(t, testCase.wantSuggestions, got.Suggestions)
		})
	}
}
