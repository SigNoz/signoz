package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestException(t *testing.T) {
	testCases := []struct {
		name             string
		attrs            []slog.Attr
		exceptionType    string
		exceptionCode    string
		exceptionMessage string
		hasException     bool
	}{
		{
			name: "PkgError",
			attrs: []slog.Attr{
				errors.Attr(errors.New(errors.TypeNotFound, errors.MustNewCode("test_code"), "resource not found")),
			},
			exceptionType:    "not-found",
			exceptionCode:    "test_code",
			exceptionMessage: "resource not found",
			hasException:     true,
		},
		{
			name: "StdlibError",
			attrs: []slog.Attr{
				errors.Attr(fmt.Errorf("something went wrong")),
			},
			exceptionType:    "internal",
			exceptionCode:    "unknown",
			exceptionMessage: "something went wrong",
			hasException:     true,
		},
		{
			name: "WrappedPkgError",
			attrs: []slog.Attr{
				errors.Attr(errors.Wrapf(fmt.Errorf("db connection failed"), errors.TypeInternal, errors.MustNewCode("db_error"), "failed to fetch user")),
			},
			exceptionType:    "internal",
			exceptionCode:    "db_error",
			exceptionMessage: "db connection failed",
			hasException:     true,
		},
		{
			name: "NoError",
			attrs: []slog.Attr{
				slog.String("key", "value"),
			},
			hasException: false,
		},
		{
			name: "ExceptionKeyWithNonError",
			attrs: []slog.Attr{
				slog.String("exception", "not an error type"),
			},
			hasException: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			buf := bytes.NewBuffer(nil)
			logger := slog.New(&handler{
				base:     slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}),
				wrappers: []Wrapper{NewException()},
			})

			logger.LogAttrs(context.Background(), slog.LevelError, "operation failed", tc.attrs...)

			m := make(map[string]any)
			err := json.Unmarshal(buf.Bytes(), &m)
			require.NoError(t, err)
			assert.Equal(t, "operation failed", m["msg"])

			if tc.hasException {
				exc, ok := m["exception"].(map[string]any)
				require.True(t, ok, "exception should be a nested object")
				assert.Equal(t, tc.exceptionType, exc["type"])
				assert.Equal(t, tc.exceptionCode, exc["code"])
				assert.Equal(t, tc.exceptionMessage, exc["message"])
				stacktrace, ok := exc["stacktrace"].(string)
				require.True(t, ok)
				assert.Contains(t, stacktrace, ".go:")
			} else {
				_, isMap := m["exception"].(map[string]any)
				assert.False(t, isMap, "exception should not be a structured object")
			}
		})
	}
}
