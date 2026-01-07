package loghandler

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
)

// filter wraps a LogHandler to filter out log entries based on a custom logic
type filter struct{}

// NewFilter creates a new filtering wrapper
func NewFilter() Wrapper {
	return &filter{}
}

// Wrap implements the Wrapper interface.
// It returns a LogHandler that filters log records based on a custom logic
func (f *filter) Wrap(next LogHandler) LogHandler {
	return LogHandlerFunc(func(ctx context.Context, record slog.Record) error {
		dropEntry := false
		record.Attrs(func(attr slog.Attr) bool {
			if shouldDropEntry(attr) {
				dropEntry = true
				return false // stop iteration
			}
			return true
		})

		// Skip logging this entry
		if dropEntry {
			return nil
		}

		return next.Handle(ctx, record)
	})
}

// shouldDropEntry determines whether a log entry should be written based on
// its fields.
// Returns false if the entry should be suppressed, true otherwise.
//
// Current filters:
//   - context.Canceled: These are expected errors from cancelled operations,
//     and create noise in logs.
func shouldDropEntry(attr slog.Attr) bool {
	if (attr.Key == "error" || attr.Key == "err") && attr.Value.Kind() == slog.KindAny {
		if loggedErr, ok := attr.Value.Any().(error); ok && loggedErr != nil {
			return errors.Is(loggedErr, context.Canceled)
		}
	}
	return false
}
