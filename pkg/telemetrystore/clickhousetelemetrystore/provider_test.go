package clickhousetelemetrystore

import (
	"testing"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestCastError_LimitExceptions(t *testing.T) {
	testCases := []struct {
		name        string
		code        chproto.Error
		wantTimeout bool
		wantCode    errors.Code
	}{
		{name: "TooManyRowsOrBytes_ResultTooLarge", code: chproto.ErrTooManyRowsOrBytes, wantCode: ErrCodeResultTooLarge},
		{name: "MemoryLimitExceeded_InvalidInput", code: chproto.ErrMemoryLimitExceeded, wantCode: ErrCodeMemoryLimitExceeded},
		{name: "TimeoutExceeded_Timeout", code: chproto.ErrTimeoutExceeded, wantTimeout: true, wantCode: ErrCodeQueryTimeout},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := castError(&clickhouse.Exception{Code: int32(testCase.code), Message: "limit exceeded"})

			// Required rather than asserted: errors.Asc dereferences the error it is given.
			require.Error(t, err)
			assert.True(t, errors.Asc(err, testCase.wantCode), "got %v", err)
			if testCase.wantTimeout {
				assert.True(t, errors.Ast(err, errors.TypeTimeout))
			} else {
				assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			}
		})
	}
}
