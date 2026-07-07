package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
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
				errors.Attr(errors.Newf(errors.TypeInternal, errors.MustNewCode("internal"), "something went wrong")),
			},
			exceptionType:    "internal",
			exceptionCode:    "internal",
			exceptionMessage: "something went wrong",
			hasException:     true,
		},
		{
			name: "WrappedPkgError",
			attrs: []slog.Attr{
				errors.Attr(errors.Wrapf(errors.New(errors.TypeNotFound, errors.MustNewCode("not_found"), "db connection failed"), errors.TypeInternal, errors.MustNewCode("db_error"), "failed to fetch user")),
			},
			exceptionType:    "internal",
			exceptionCode:    "db_error",
			exceptionMessage: "failed to fetch user",
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
				assert.Equal(t, tc.exceptionType, m["exception.type"])
				assert.Equal(t, tc.exceptionCode, m["exception.code"])
				assert.Equal(t, tc.exceptionMessage, m["exception.message"])
				stacktrace, ok := m["exception.stacktrace"].(string)
				require.True(t, ok)
				assert.Contains(t, stacktrace, "exception_test.go:")
			} else {
				assert.Nil(t, m["exception.type"])
				assert.Nil(t, m["exception.code"])
				assert.Nil(t, m["exception.message"])
				assert.Nil(t, m["exception.stacktrace"])
			}
		})
	}
}
