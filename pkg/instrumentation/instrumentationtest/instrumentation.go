package instrumentationtest

import (
	sdklog "go.opentelemetry.io/otel/log"
	nooplog "go.opentelemetry.io/otel/log/noop"
	sdkmetric "go.opentelemetry.io/otel/metric"
	noopmetric "go.opentelemetry.io/otel/metric/noop"
	sdktrace "go.opentelemetry.io/otel/trace"
	nooptrace "go.opentelemetry.io/otel/trace/noop"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.uber.org/zap"
)

type noopInstrumentation struct {
	logger         *zap.Logger
	loggerProvider sdklog.LoggerProvider
	meterProvider  sdkmetric.MeterProvider
	tracerProvider sdktrace.TracerProvider
}

func New() instrumentation.Instrumentation {
	return &noopInstrumentation{
		logger:         zap.NewNop(),
		loggerProvider: nooplog.NewLoggerProvider(),
		meterProvider:  noopmetric.NewMeterProvider(),
		tracerProvider: nooptrace.NewTracerProvider(),
	}
}

func (i *noopInstrumentation) LoggerProvider() sdklog.LoggerProvider {
	return i.loggerProvider
}

func (i *noopInstrumentation) Logger() *zap.Logger {
	return i.logger
}

func (i *noopInstrumentation) MeterProvider() sdkmetric.MeterProvider {
	return i.meterProvider
}

func (i *noopInstrumentation) TracerProvider() sdktrace.TracerProvider {
	return i.tracerProvider
}

func (i *noopInstrumentation) ToProviderSettings() factory.ProviderSettings {
	return factory.ProviderSettings{
		LoggerProvider: i.LoggerProvider(),
		ZapLogger:      i.Logger(),
		MeterProvider:  i.MeterProvider(),
		TracerProvider: i.TracerProvider(),
	}
}
