package openfgaauthz

import (
	"context"
	"log/slog"

	pkgopenfgalogger "github.com/openfga/openfga/pkg/logger"
	"go.uber.org/zap" //nolint:depguard
)

var _ pkgopenfgalogger.Logger = (*openfgaLogger)(nil)

type openfgaLogger struct {
	slog *slog.Logger
}

func NewLogger(logger *slog.Logger) *openfgaLogger {
	return &openfgaLogger{slog: logger}
}

func (logger *openfgaLogger) With(fields ...zap.Field) pkgopenfgalogger.Logger {
	newLogger := logger.slog.With(zapFieldsToArgs(fields)...)
	return &openfgaLogger{slog: newLogger}
}

func (logger *openfgaLogger) Info(message string, fields ...zap.Field) {
	logger.slog.Info(message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) InfoWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.InfoContext(ctx, message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Debug(message string, fields ...zap.Field) {
	logger.slog.Debug(message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) DebugWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.DebugContext(ctx, message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Warn(message string, fields ...zap.Field) {
	logger.slog.Warn(message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) WarnWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.WarnContext(ctx, message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Error(message string, fields ...zap.Field) {
	logger.slog.Error(message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) ErrorWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Fatal(message string, fields ...zap.Field) {
	logger.slog.Error(message, zapFieldsToArgs(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) FatalWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (logger *openfgaLogger) Panic(message string, fields ...zap.Field) {
	logger.slog.Error(message, zapFieldsToArgs(fields)...)
	panic(message)
}

func (logger *openfgaLogger) PanicWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, zapFieldsToArgs(fields)...)
	panic(message)
}

func zapFieldsToArgs(fields []zap.Field) []any {
	args := make([]any, 0, len(fields)*2)
	for _, f := range fields {
		args = append(args, f.Key)
		if f.Interface != nil {
			args = append(args, f.Interface)
		} else if f.String != "" {
			args = append(args, f.String)
		} else {
			args = append(args, f.Integer)
		}
	}
	return args
}
