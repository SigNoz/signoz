package loghandler

import (
	"context"
	"log/slog"

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

		t, c, m, _, _, _ := errors.Unwrapb(foundErr)

		attrs := []any{
			slog.String("type", t.String()),
			slog.String("code", c.String()),
			slog.String("message", m),
		}

		// Use the stacktrace captured at error creation time if available.
		type stacktracer interface {
			Stacktrace() string
		}
		if st, ok := foundErr.(stacktracer); ok && st.Stacktrace() != "" {
			attrs = append(attrs, slog.String("stacktrace", st.Stacktrace()))
		}

		newRecord.AddAttrs(slog.Group("exception", attrs...))

		return next.Handle(ctx, newRecord)
	})
}
