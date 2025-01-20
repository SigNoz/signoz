package factory

import (
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

type ProviderSettings struct {
	// ZapLogger is the zap logger.
	ZapLogger *zap.Logger
	// SlogLogger is the slog logger.
	SlogLogger *slog.Logger
	// MeterProvider is the meter provider.
	MeterProvider sdkmetric.MeterProvider
	// TracerProvider is the tracer provider.
	TracerProvider sdktrace.TracerProvider
	// PrometheusRegistry is the prometheus registry.
	PrometheusRegisterer prometheus.Registerer
}

type ScopedProviderSettings interface {
	ZapLogger() *zap.Logger
	SlogLogger() *slog.Logger
	Meter() sdkmetric.Meter
	Tracer() sdktrace.Tracer
	PrometheusRegisterer() prometheus.Registerer
}

type scoped struct {
	zapLogger            *zap.Logger
	slogLogger           *slog.Logger
	meter                sdkmetric.Meter
	tracer               sdktrace.Tracer
	prometheusRegisterer prometheus.Registerer
}

func NewScopedProviderSettings(settings ProviderSettings, pkgName string) *scoped {
	return &scoped{
		zapLogger:            settings.ZapLogger.Named(pkgName),
		slogLogger:           settings.SlogLogger.With("pkg", pkgName),
		meter:                settings.MeterProvider.Meter(pkgName),
		tracer:               settings.TracerProvider.Tracer(pkgName),
		prometheusRegisterer: settings.PrometheusRegisterer,
	}
}

func (s *scoped) ZapLogger() *zap.Logger {
	return s.zapLogger
}

func (s *scoped) SlogLogger() *slog.Logger {
	return s.slogLogger
}

func (s *scoped) Meter() sdkmetric.Meter {
	return s.meter
}

func (s *scoped) Tracer() sdktrace.Tracer {
	return s.tracer
}

func (s *scoped) PrometheusRegisterer() prometheus.Registerer {
	return s.prometheusRegisterer
}
