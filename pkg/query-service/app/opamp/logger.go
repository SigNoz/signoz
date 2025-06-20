package opamp

import (
	"context"

	"go.uber.org/zap"
)

type Logger struct {
	*zap.SugaredLogger
}

func NewWrappedLogger(sugar *zap.SugaredLogger) *Logger {
	return &Logger{
		SugaredLogger: sugar,
	}
}

func (l *Logger) Debugf(ctx context.Context, format string, args ...interface{}) {
	l.SugaredLogger.Debugf(format, args...)
}

func (l *Logger) Errorf(ctx context.Context, format string, args ...interface{}) {
	l.SugaredLogger.Errorf(format, args...)
}
