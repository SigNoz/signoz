package factory

import (
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdktrace "go.opentelemetry.io/otel/trace"
)

type ProviderSettings struct {
	// SlogLogger is the slog logger.
	Logger *slog.Logger
	// MeterProvider is the meter provider.
	MeterProvider sdkmetric.MeterProvider
	// TracerProvider is the tracer provider.
	TracerProvider sdktrace.TracerProvider
	// PrometheusRegistry is the prometheus registry.
	PrometheusRegisterer prometheus.Registerer
}

type ScopedProviderSettings interface {
	Logger() *slog.Logger
	Meter() sdkmetric.Meter
	Tracer() sdktrace.Tracer
	PrometheusRegisterer() prometheus.Registerer
}

type scoped struct {
	logger               *slog.Logger
	meter                sdkmetric.Meter
	tracer               sdktrace.Tracer
	prometheusRegisterer prometheus.Registerer
}

func NewScopedProviderSettings(settings ProviderSettings, pkgName string) *scoped {
	return &scoped{
		logger:               settings.Logger.With("logger", pkgName),
		meter:                settings.MeterProvider.Meter(pkgName),
		tracer:               settings.TracerProvider.Tracer(pkgName),
		prometheusRegisterer: settings.PrometheusRegisterer,
	}
}

func (s *scoped) Logger() *slog.Logger {
	return s.logger
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
