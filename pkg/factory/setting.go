package factory

import (
	sdklog "go.opentelemetry.io/otel/log"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

type ProviderSettings struct {
	// LoggerProvider is the otel logger.
	LoggerProvider sdklog.LoggerProvider
	// ZapLogger is the zap logger.
	ZapLogger *zap.Logger
	// MeterProvider is the meter provider.
	MeterProvider sdkmetric.MeterProvider
	// TracerProvider is the tracer provider.
	TracerProvider sdktrace.TracerProvider
}
