package loghandler

import (
	"context"
	"log/slog"
	"runtime"
)

type source struct{}

func NewSource() *source {
	return &source{}
}

func (h *source) Wrap(next LogHandler) LogHandler {
	return LogHandlerFunc(func(ctx context.Context, record slog.Record) error {
		if record.PC != 0 {
			frame, _ := runtime.CallersFrames([]uintptr{record.PC}).Next()
			record.AddAttrs(
				slog.String("code.filepath", frame.File),
				slog.String("code.function", frame.Function),
				slog.Int("code.lineno", frame.Line),
			)
		}

		return next.Handle(ctx, record)
	})
}
