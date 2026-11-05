package clickhousetelemetrystore

import (
	"context"
	"net"
	"os"
	"testing"
	"time"

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

func TestCastError_Timeout(t *testing.T) {
	deadlineCtx, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
	defer cancel()
	<-deadlineCtx.Done()

	testCases := []struct {
		name string
		err  error
	}{
		{name: "ContextDeadline", err: deadlineCtx.Err()},
		// The driver sets the socket deadline from ctx, so a read can fail before it sees ctx is done.
		{name: "SocketTimeout", err: &net.OpError{Op: "read", Net: "tcp", Err: os.ErrDeadlineExceeded}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := castError(testCase.err)

			require.Error(t, err)
			assert.True(t, errors.Asc(err, ErrCodeQueryTimeout), "got %v", err)
			assert.True(t, errors.Ast(err, errors.TypeTimeout))
			assert.Empty(t, errors.AsJSON(err).Suggestions)
		})
	}
}
