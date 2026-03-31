package loghandler

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/errors"
)

type filtering struct{}

func NewFiltering() *filtering {
	return &filtering{}
}

func (h *filtering) Wrap(next LogHandler) LogHandler {
	return LogHandlerFunc(func(ctx context.Context, record slog.Record) error {
		if !filterRecord(record) {
			return nil
		}

		return next.Handle(ctx, record)
	})
}

func filterRecord(record slog.Record) bool {
	suppress := false
	record.Attrs(func(a slog.Attr) bool {
		if a.Value.Kind() == slog.KindAny {
			if err, ok := a.Value.Any().(error); ok {
				if errors.Is(err, context.Canceled) {
					suppress = true
					return false
				}
			}
		}
		return true
	})

	return !suppress
}
