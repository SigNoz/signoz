package middleware

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRecovery(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name            string
		handler         http.HandlerFunc
		wantStatus      int
		wantLog         bool
		wantMessage     string
		wantErrorStatus bool
	}{
		{
			name: "PanicWithString",
			handler: func(w http.ResponseWriter, r *http.Request) {
				panic("something went wrong")
			},
			wantStatus:      http.StatusInternalServerError,
			wantLog:         true,
			wantMessage:     "something went wrong",
			wantErrorStatus: true,
		},
		{
			name: "PanicWithError",
			handler: func(w http.ResponseWriter, r *http.Request) {
				panic(errors.New(errors.TypeInternal, errors.CodeInternal, "db connection failed"))
			},
			wantStatus:      http.StatusInternalServerError,
			wantLog:         true,
			wantMessage:     "db connection failed",
			wantErrorStatus: true,
		},
		{
			name: "PanicWithInteger",
			handler: func(w http.ResponseWriter, r *http.Request) {
				panic(42)
			},
			wantStatus:      http.StatusInternalServerError,
			wantLog:         true,
			wantMessage:     "42",
			wantErrorStatus: true,
		},
		{
			name: "PanicWithDivisionByZero",
			handler: func(w http.ResponseWriter, r *http.Request) {
				divisor := 0
				_ = 1 / divisor
			},
			wantStatus:      http.StatusInternalServerError,
			wantLog:         true,
			wantMessage:     "runtime error: integer divide by zero",
			wantErrorStatus: true,
		},
		{
			name: "NoPanic",
			handler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			},
			wantStatus: http.StatusOK,
			wantLog:    false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			var records []slog.Record
			logger := slog.New(newRecordCollector(&records))

			m := NewRecovery(logger)
			handler := m.Wrap(http.HandlerFunc(tc.handler))

			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			handler.ServeHTTP(rr, req)

			assert.Equal(t, tc.wantStatus, rr.Code)

			if !tc.wantLog {
				assert.Empty(t, records)
				return
			}

			require.Len(t, records, 1)

			err := extractException(t, records[0])
			require.NotNil(t, err)

			typ, _, message, _, _, _ := errors.Unwrapb(err)
			assert.Equal(t, errors.TypeFatal, typ)
			assert.Equal(t, tc.wantMessage, message)

			type stacktracer interface {
				Stacktrace() string
			}
			st, ok := err.(stacktracer)
			require.True(t, ok, "error should implement stacktracer")
			assert.NotEmpty(t, st.Stacktrace())

			if tc.wantErrorStatus {
				var body map[string]any
				require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
				assert.Equal(t, "error", body["status"])
			}
		})
	}
}

// extractException finds the "exception" attr in a log record and returns the error.
func extractException(t *testing.T, record slog.Record) error {
	t.Helper()
	var found error
	record.Attrs(func(a slog.Attr) bool {
		if a.Key == "exception" {
			if err, ok := a.Value.Any().(error); ok {
				found = err
				return false
			}
		}
		return true
	})
	return found
}

// recordCollector is an slog.Handler that collects records for assertion.
type recordCollector struct {
	records *[]slog.Record
	attrs   []slog.Attr
}

func newRecordCollector(records *[]slog.Record) *recordCollector {
	return &recordCollector{records: records}
}

func (h *recordCollector) Enabled(_ context.Context, _ slog.Level) bool { return true }

func (h *recordCollector) Handle(_ context.Context, record slog.Record) error {
	for _, a := range h.attrs {
		record.AddAttrs(a)
	}
	*h.records = append(*h.records, record)
	return nil
}

func (h *recordCollector) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &recordCollector{records: h.records, attrs: append(h.attrs, attrs...)}
}

func (h *recordCollector) WithGroup(_ string) slog.Handler { return h }
