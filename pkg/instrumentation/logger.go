package instrumentation

import (
	"context"
	"os"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	contribsdkconfig "go.opentelemetry.io/contrib/config"
	sdklog "go.opentelemetry.io/otel/log"
	nooplog "go.opentelemetry.io/otel/log/noop"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// newLoggerProvider creates a new logger provider based on the configuration.
// If logging is disabled, it returns a no-op logger provider.
func newLoggerProvider(ctx context.Context, cfg Config, cfgResource contribsdkconfig.Resource) (sdklog.LoggerProvider, error) {
	if !cfg.Logs.Enabled {
		return nooplog.NewLoggerProvider(), nil
	}

	sdk, err := contribsdkconfig.NewSDK(
		contribsdkconfig.WithContext(ctx),
		contribsdkconfig.WithOpenTelemetryConfiguration(contribsdkconfig.OpenTelemetryConfiguration{
			LoggerProvider: &cfg.Logs.LoggerProvider,
			Resource:       &cfgResource,
		}),
	)
	if err != nil {
		return nil, err
	}

	return sdk.LoggerProvider(), nil
}

// newLogger creates a new Zap logger with the configured level and output.
// It combines a JSON encoder for stdout and an OpenTelemetry bridge.
func newLogger(cfg Config, provider sdklog.LoggerProvider) *zap.Logger {
	core := zapcore.NewTee(
		zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), cfg.Logs.Level),
		otelzap.NewCore("go.signoz.io/pkg/instrumentation", otelzap.WithLoggerProvider(provider)),
	)

	return zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))
}
