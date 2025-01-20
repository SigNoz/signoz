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

type ScopedProviderSettings interface {
	Logger() sdklog.Logger
	ZapLogger() *zap.Logger
	Meter() sdkmetric.Meter
	Tracer() sdktrace.Tracer
}

type scoped struct {
	logger    sdklog.Logger
	zapLogger *zap.Logger
	meter     sdkmetric.Meter
	tracer    sdktrace.Tracer
}

func NewScopedProviderSettings(settings ProviderSettings, pkgName string) *scoped {
	return &scoped{
		logger:    settings.LoggerProvider.Logger(pkgName),
		zapLogger: settings.ZapLogger.Named(pkgName),
		meter:     settings.MeterProvider.Meter(pkgName),
		tracer:    settings.TracerProvider.Tracer(pkgName),
	}
}

func (s *scoped) Logger() sdklog.Logger {
	return s.logger
}

func (s *scoped) ZapLogger() *zap.Logger {
	return s.zapLogger
}

func (s *scoped) Meter() sdkmetric.Meter {
	return s.meter
}

func (s *scoped) Tracer() sdktrace.Tracer {
	return s.tracer
}
