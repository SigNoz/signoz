package opamp

import (
	"context"
	"fmt"
	"log/slog"
)

type logger struct {
	l *slog.Logger
}

func wrappedLogger(l *slog.Logger) *logger {
	return &logger{
		l: l,
	}
}

func (l *logger) Debugf(ctx context.Context, format string, args ...interface{}) {
	l.l.DebugContext(ctx, fmt.Sprintf(format, args...))
}

func (l *logger) Errorf(ctx context.Context, format string, args ...interface{}) {
	l.l.ErrorContext(ctx, fmt.Sprintf(format, args...))
}
