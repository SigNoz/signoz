package cmd

import (
	"context"
	"errors"
	"time"

	"go.uber.org/zap"         //nolint:depguard
	"go.uber.org/zap/zapcore" //nolint:depguard
)

// Deprecated: Use `NewLogger` from `pkg/instrumentation` instead.
func newZapLogger() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	samplerConfig := config.Sampling
	config.Sampling = nil

	logger, _ := config.Build()

	return logger.WithOptions(zap.WrapCore(func(core zapcore.Core) zapcore.Core {
		core = &filteringCore{core}
		return zapcore.NewSamplerWithOptions(
			core,
			time.Second,
			samplerConfig.Initial,
			samplerConfig.Thereafter,
		)
	}))
}

type filteringCore struct {
	zapcore.Core
}

func (c *filteringCore) filter(ent zapcore.Entry, fields []zap.Field) bool {
	for _, field := range fields {
		if field.Type == zapcore.ErrorType {
			err := field.Interface.(error)
			if errors.Is(err, context.Canceled) {
				return false
			}
		}
	}
	return true
}

func (c *filteringCore) Check(ent zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(ent.Level) {
		return ce.AddCore(ent, c)
	}
	return ce
}

func (c *filteringCore) Write(ent zapcore.Entry, fields []zapcore.Field) error {
	if !c.filter(ent, fields) {
		return nil
	}
	return c.Core.Write(ent, fields)
}
