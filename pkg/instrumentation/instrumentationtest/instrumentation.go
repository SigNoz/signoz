package instrumentationtest

import (
	"io"
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	noopmetric "go.opentelemetry.io/otel/metric/noop"
	sdktrace "go.opentelemetry.io/otel/trace"
	nooptrace "go.opentelemetry.io/otel/trace/noop"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
)

type noopInstrumentation struct {
	logger         *slog.Logger
	meterProvider  sdkmetric.MeterProvider
	tracerProvider sdktrace.TracerProvider
}

func New() instrumentation.Instrumentation {
	return &noopInstrumentation{
		logger:         slog.New(slog.NewTextHandler(io.Discard, nil)),
		meterProvider:  noopmetric.NewMeterProvider(),
		tracerProvider: nooptrace.NewTracerProvider(),
	}
}

func (i *noopInstrumentation) Logger() *slog.Logger {
	return i.logger
}

func (i *noopInstrumentation) MeterProvider() sdkmetric.MeterProvider {
	return i.meterProvider
}

func (i *noopInstrumentation) TracerProvider() sdktrace.TracerProvider {
	return i.tracerProvider
}

func (i *noopInstrumentation) PrometheusRegisterer() prometheus.Registerer {
	return prometheus.NewRegistry()
}

func (i *noopInstrumentation) ToProviderSettings() factory.ProviderSettings {
	return factory.ProviderSettings{
		Logger:               i.Logger(),
		MeterProvider:        i.MeterProvider(),
		TracerProvider:       i.TracerProvider(),
		PrometheusRegisterer: i.PrometheusRegisterer(),
	}
}
