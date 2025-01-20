package instrumentation

import (
	"log/slog"
	"os"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/factory"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var zapLogLevelToSlogLevel = map[zapcore.Level]slog.Level{
	zapcore.DebugLevel: slog.LevelDebug,
	zapcore.InfoLevel:  slog.LevelInfo,
	zapcore.WarnLevel:  slog.LevelWarn,
	zapcore.ErrorLevel: slog.LevelError,
}

// Instrumentation provides the core components for application instrumentation.
type Instrumentation interface {
	// Logger returns the Zap logger.
	Logger() *zap.Logger
	// SlogLogger returns the Slog logger.
	SlogLogger() *slog.Logger
	// MeterProvider returns the OpenTelemetry meter provider.
	MeterProvider() sdkmetric.MeterProvider
	// TracerProvider returns the OpenTelemetry tracer provider.
	TracerProvider() sdktrace.TracerProvider
	// PrometheusRegisterer returns the Prometheus registerer.
	PrometheusRegisterer() prometheus.Registerer
	// ToProviderSettings converts instrumentation to provider settings.
	ToProviderSettings() factory.ProviderSettings
}

// Merges the input attributes with the resource attributes.
func mergeAttributes(input map[string]any, resource *sdkresource.Resource) map[string]any {
	output := make(map[string]any)

	for k, v := range input {
		output[k] = v
	}

	kvs := resource.Attributes()
	for _, kv := range kvs {
		output[string(kv.Key)] = kv.Value
	}

	return output
}

// newLogger creates a new Zap logger with the configured level and output.
func newZapLogger(cfg Config) *zap.Logger {
	core := zapcore.NewTee(
		zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), cfg.Logs.Level),
	)

	return zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))
}

func newSlogLogger(cfg Config) *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: zapLogLevelToSlogLevel[cfg.Logs.Level]}))
}
