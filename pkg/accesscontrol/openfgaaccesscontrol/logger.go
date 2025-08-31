package openfgaaccesscontrol

import (
	"context"
	"log/slog"

	"github.com/openfga/openfga/pkg/logger"
	"go.uber.org/zap"
)

var _ logger.Logger = (*openfgaLogger)(nil)

type openfgaLogger struct {
	logger *slog.Logger
}

func NewLogger(logger *slog.Logger) *openfgaLogger {
	return &openfgaLogger{logger: logger}
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

func (o *openfgaLogger) Debug(message string, fields ...zap.Field) {
	o.logger.Debug(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) DebugWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.DebugContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) Error(message string, fields ...zap.Field) {
	o.logger.Error(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) ErrorWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.ErrorContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) Fatal(message string, fields ...zap.Field) {
	o.logger.Error(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) FatalWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.ErrorContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) Info(message string, fields ...zap.Field) {
	o.logger.Info(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) InfoWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.InfoContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) Panic(message string, fields ...zap.Field) {
	o.logger.Error(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) PanicWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.ErrorContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) Warn(message string, fields ...zap.Field) {
	o.logger.Warn(message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) WarnWithContext(ctx context.Context, message string, fields ...zap.Field) {
	o.logger.WarnContext(ctx, message, zapFieldsToArgs(fields)...)
}

func (o *openfgaLogger) With(fields ...zap.Field) logger.Logger {
	newLogger := o.logger.With(zapFieldsToArgs(fields)...)
	return &openfgaLogger{logger: newLogger}
}
