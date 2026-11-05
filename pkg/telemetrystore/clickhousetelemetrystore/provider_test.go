package clickhousetelemetrystore

import (
	"context"
	"testing"
	"time"

	chproto "github.com/ClickHouse/ch-go/proto"
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
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

func TestCastQueryError_DeadlineExceeded(t *testing.T) {
	testCases := []struct {
		name           string
		ctx            func() (context.Context, context.CancelFunc)
		wantSuggestion bool
	}{
		{
			name: "QueryTimeout_Suggestion",
			ctx: func() (context.Context, context.CancelFunc) {
				return telemetrystore.NewContextWithQueryTimeout(context.Background(), time.Nanosecond)
			},
			wantSuggestion: true,
		},
		{
			name: "CallerDeadline_NoSuggestion",
			ctx: func() (context.Context, context.CancelFunc) {
				return context.WithTimeout(context.Background(), time.Nanosecond)
			},
		},
		{
			name: "CallerDeadlineBeforeQueryTimeout_NoSuggestion",
			ctx: func() (context.Context, context.CancelFunc) {
				ctx, cancel := context.WithTimeout(context.Background(), time.Nanosecond)
				ctx, cancelQuery := telemetrystore.NewContextWithQueryTimeout(ctx, time.Hour)
				return ctx, func() { cancelQuery(); cancel() }
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ctx, cancel := testCase.ctx()
			defer cancel()
			<-ctx.Done()

			err := castQueryError(ctx, ctx.Err())

			require.Error(t, err)
			assert.True(t, errors.Asc(err, ErrCodeQueryTimeout), "got %v", err)
			assert.Equal(t, testCase.wantSuggestion, len(errors.AsJSON(err).Suggestions) > 0, "got %v", err)
		})
	}
}
