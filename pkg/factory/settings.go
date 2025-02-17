package factory

import (
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdktrace "go.opentelemetry.io/otel/trace"
)

type Settings struct {
	// Logger is the logger.
	Logger *slog.Logger
	// MeterProvider is the meter provider.
	MeterProvider sdkmetric.MeterProvider
	// TracerProvider is the tracer provider.
	TracerProvider sdktrace.TracerProvider
	// PrometheusRegisterer is the prometheus registerer.
	PrometheusRegisterer prometheus.Registerer
}

type NamespacedSettings interface {
	Logger() *slog.Logger
	Meter() sdkmetric.Meter
	Tracer() sdktrace.Tracer
	PrometheusRegisterer() prometheus.Registerer
}

type namespacedSettings struct {
	logger               *slog.Logger
	meter                sdkmetric.Meter
	tracer               sdktrace.Tracer
	prometheusRegisterer prometheus.Registerer
}

func NewNamespacedSettings(settings Settings, pkgName string) NamespacedSettings {
	return &namespacedSettings{
		logger:               settings.Logger.With("pkg", pkgName),
		meter:                settings.MeterProvider.Meter(pkgName),
		tracer:               settings.TracerProvider.Tracer(pkgName),
		prometheusRegisterer: prometheus.WrapRegistererWith(prometheus.Labels{"pkg": pkgName}, settings.PrometheusRegisterer),
	}
}

func (s *namespacedSettings) Logger() *slog.Logger {
	return s.logger
}

func (s *namespacedSettings) Meter() sdkmetric.Meter {
	return s.meter
}

func (s *namespacedSettings) Tracer() sdktrace.Tracer {
	return s.tracer
}

func (s *namespacedSettings) PrometheusRegisterer() prometheus.Registerer {
	return s.prometheusRegisterer
}

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
