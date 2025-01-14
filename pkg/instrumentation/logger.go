package instrumentation

import (
	"os"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	sdklog "go.opentelemetry.io/otel/log"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// newLogger creates a new Zap logger with the configured level and output.
// It combines a JSON encoder for stdout and an OpenTelemetry bridge.
func newLogger(cfg Config, provider sdklog.LoggerProvider) *zap.Logger {
	core := zapcore.NewTee(
		zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), cfg.Logs.Level),
		otelzap.NewCore("go.signoz.io/pkg/instrumentation", otelzap.WithLoggerProvider(provider)),
	)

	return zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))
}
