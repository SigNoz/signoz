package loghandler

import (
	"context"
	"log/slog"
	"runtime"

	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
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
				slog.String(instrumentationtypes.CodeFilePath, frame.File),
				slog.String(instrumentationtypes.CodeFunctionName, frame.Function),
				slog.Int(instrumentationtypes.CodeLineNumber, frame.Line),
			)
		}

		return next.Handle(ctx, record)
	})
}
