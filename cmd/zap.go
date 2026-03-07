package cmd

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"go.uber.org/zap"         //nolint:depguard
	"go.uber.org/zap/zapcore" //nolint:depguard
)

// Deprecated: Use `NewLogger` from `pkg/instrumentation` instead.
func newZapLogger() *zap.Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	// Extract sampling config before building the logger.
	// We need to disable sampling in the config and apply it manually later
	// to ensure correct core ordering. See filteringCore documentation for details.
	samplerConfig := config.Sampling
	config.Sampling = nil

	logger, _ := config.Build()

	// Wrap with custom core wrapping to filter certain log entries.
	// The order of wrapping is important:
	//   1. First wrap with filteringCore
	//   2. Then wrap with sampler
	//
	// This creates the call chain: sampler -> filteringCore -> ioCore
	//
	// During logging:
	//   - sampler.Check decides whether to sample the log entry
	//   - If sampled, filteringCore.Check is called
	//   - filteringCore adds itself to CheckedEntry.cores
	//   - All cores in CheckedEntry.cores have their Write method called
	//   - filteringCore.Write can now filter the entry before passing to ioCore
	//
	// If we didn't disable the sampler above, filteringCore would have wrapped
	// sampler. By calling sampler.Check we would have allowed it to call
	// ioCore.Check that adds itself to CheckedEntry.cores. Then ioCore.Write
	// would have bypassed our checks, making filtering impossible.
	return logger.WithOptions(zap.WrapCore(func(core zapcore.Core) zapcore.Core {
		core = &filteringCore{core}
		if samplerConfig != nil {
			core = zapcore.NewSamplerWithOptions(
				core,
				time.Second,
				samplerConfig.Initial,
				samplerConfig.Thereafter,
			)
		}
		return core
	}))
}

// filteringCore wraps a zapcore.Core to filter out log entries based on a
// custom logic.
//
// Note: This core must be positioned before the sampler in the core chain
// to ensure Write is called. See newZapLogger for ordering details.
type filteringCore struct {
	zapcore.Core
}

// filter determines whether a log entry should be written based on its fields.
// Returns false if the entry should be suppressed, true otherwise.
//
// Current filters:
//   - context.Canceled: These are expected errors from cancelled operations,
//     and create noise in logs.
func (c *filteringCore) filter(fields []zapcore.Field) bool {
	for _, field := range fields {
		if field.Type == zapcore.ErrorType {
			if loggedErr, ok := field.Interface.(error); ok {
				// Suppress logs containing context.Canceled errors
				if errors.Is(loggedErr, context.Canceled) {
					return false
				}
			}
		}
	}
	return true
}

// With implements zapcore.Core.With
// It returns a new copy with the added context.
func (c *filteringCore) With(fields []zapcore.Field) zapcore.Core {
	return &filteringCore{c.Core.With(fields)}
}

// Check implements zapcore.Core.Check.
// It adds this core to the CheckedEntry if the log level is enabled,
// ensuring that Write will be called for this entry.
func (c *filteringCore) Check(ent zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(ent.Level) {
		return ce.AddCore(ent, c)
	}
	return ce
}

// Write implements zapcore.Core.Write.
// It filters log entries based on their fields before delegating to the wrapped core.
func (c *filteringCore) Write(ent zapcore.Entry, fields []zapcore.Field) error {
	if !c.filter(fields) {
		return nil
	}
	return c.Core.Write(ent, fields)
}
