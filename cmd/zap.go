package cmd

import (
	"go.uber.org/zap"         //nolint:depguard
	"go.uber.org/zap/zapcore" //nolint:depguard
)

// Deprecated: Use `NewLogger` from `pkg/instrumentation` instead.
func newZapLogger() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	logger, _ := config.Build()
	return logger
}
