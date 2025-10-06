package openfgaauthz

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/instrumentation"
	pkgopenfgalogger "github.com/openfga/openfga/pkg/logger"
	"go.uber.org/zap" //nolint:depguard
)

var _ pkgopenfgalogger.Logger = (*openfgaLogger)(nil)

type openfgaLogger struct {
	slog      *slog.Logger
	convertor instrumentation.ZapToSlogConverter
}

func NewLogger(logger *slog.Logger) *openfgaLogger {
	return &openfgaLogger{slog: logger, convertor: instrumentation.NewZapToSlogConverter()}
}

func (logger *openfgaLogger) With(fields ...zap.Field) pkgopenfgalogger.Logger {
	newLogger := logger.slog.With(logger.convertor.FieldsToAttributes(fields)...)
	return &openfgaLogger{slog: newLogger, convertor: logger.convertor}
}

func (logger *openfgaLogger) Info(message string, fields ...zap.Field) {
	logger.slog.Info(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) InfoWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.InfoContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Debug(message string, fields ...zap.Field) {
	logger.slog.Debug(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) DebugWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.DebugContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Warn(message string, fields ...zap.Field) {
	logger.slog.Warn(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) WarnWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.WarnContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Error(message string, fields ...zap.Field) {
	logger.slog.Error(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) ErrorWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Fatal(message string, fields ...zap.Field) {
	logger.slog.Error(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) FatalWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
}

func (logger *openfgaLogger) Panic(message string, fields ...zap.Field) {
	logger.slog.Error(message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
	panic(message)
}

func (logger *openfgaLogger) PanicWithContext(ctx context.Context, message string, fields ...zap.Field) {
	logger.slog.ErrorContext(ctx, message, logger.convertor.FieldsToAttributes(fields)...) //nolint:sloglint
	panic(message)
}
