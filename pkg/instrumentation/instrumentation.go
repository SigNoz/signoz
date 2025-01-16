package instrumentation

import (
	"os"

	"go.opentelemetry.io/contrib/bridges/otelzap"
	sdklog "go.opentelemetry.io/otel/log"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/factory"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Instrumentation provides the core components for application instrumentation.
type Instrumentation interface {
	// LoggerProvider returns the OpenTelemetry logger provider.
	LoggerProvider() sdklog.LoggerProvider
	// Logger returns the Zap logger.
	Logger() *zap.Logger
	// MeterProvider returns the OpenTelemetry meter provider.
	MeterProvider() sdkmetric.MeterProvider
	// TracerProvider returns the OpenTelemetry tracer provider.
	TracerProvider() sdktrace.TracerProvider
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
// It combines a JSON encoder for stdout and an OpenTelemetry bridge.
func newLogger(cfg Config, provider sdklog.LoggerProvider) *zap.Logger {
	core := zapcore.NewTee(
		zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), cfg.Logs.Level),
		otelzap.NewCore("go.signoz.io/pkg/instrumentation", otelzap.WithLoggerProvider(provider)),
	)

	return zap.New(core, zap.AddCaller(), zap.AddStacktrace(zap.ErrorLevel))
}
