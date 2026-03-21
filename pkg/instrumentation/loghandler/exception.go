package loghandler

import (
	"context"
	"log/slog"
	"runtime"

	"github.com/SigNoz/signoz/pkg/errors"
)

type exception struct{}

func NewException() *exception {
	return &exception{}
}

func (h *exception) Wrap(next LogHandler) LogHandler {
	return LogHandlerFunc(func(ctx context.Context, record slog.Record) error {
		var foundErr error
		newRecord := slog.NewRecord(record.Time, record.Level, record.Message, record.PC)
		record.Attrs(func(a slog.Attr) bool {
			if a.Key == "exception" {
				if err, ok := a.Value.Any().(error); ok {
					foundErr = err
					return true
				}
			}
			newRecord.AddAttrs(a)
			return true
		})

		if foundErr == nil {
			return next.Handle(ctx, record)
		}

		t, c, _, _, _, _ := errors.Unwrapb(foundErr)
		newRecord.AddAttrs(
			slog.Group("exception",
				slog.String("type", t.String()),
				slog.String("code", c.String()),
				slog.String("message", foundErr.Error()),
				slog.String("stacktrace", captureStacktrace()),
			),
		)

		return next.Handle(ctx, newRecord)
	})
}

// captureStacktrace returns the raw runtime.Stack output for the current goroutine.
// See: https://github.com/open-telemetry/opentelemetry-go/blob/b8301a29d95f8b43d18a10d31db5d8ec360739bf/sdk/trace/span.go#L579 (recordStackTrace)
func captureStacktrace() string {
	stacktrace := make([]byte, 2048)
	n := runtime.Stack(stacktrace, false)
	return string(stacktrace[:n])
}
