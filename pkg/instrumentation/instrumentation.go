package instrumentation

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	noopmetric "go.opentelemetry.io/otel/metric/noop"
	"go.opentelemetry.io/otel/propagation"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.25.0"
	nooptrace "go.opentelemetry.io/otel/trace/noop"
)

var (
	noopShutdown Shutdown = func(ctx context.Context) error { return nil }
)

type Shutdown func(context.Context) error

type Resource struct {
	*sdkresource.Resource
	cfg                   Config
	serviceName           string
	deploymentEnvironment string
}

// Creates a new OpenTelemetry Resource. By default, it adds
// container, env, process, sdk and host attributes.
func New(ctx context.Context, cfg Config) (*Resource, error) {
	resource, err := sdkresource.New(
		ctx,
		sdkresource.WithContainer(),
		sdkresource.WithFromEnv(),
		sdkresource.WithProcess(),
		sdkresource.WithTelemetrySDK(),
		sdkresource.WithHost(),
	)
	if err != nil {
		return nil, err
	}

	return &Resource{
		resource,
		cfg,
		getServiceName(resource),
		getDeploymentEnvironment(resource),
	}, nil
}

// Inits tracing for the application. It sets the tracer as the global tracer provider
// and returns a shutdown function to be called on application shutdown. The grpc exporter
// is used by this tracer.
func (resource *Resource) InitTracing(ctx context.Context) (Shutdown, error) {
	if !resource.cfg.Tracing {
		tracerProvider := nooptrace.NewTracerProvider()
		otel.SetTracerProvider(tracerProvider)
		return noopShutdown, nil
	}

	traceExporter, err := otlptracegrpc.New(ctx)
	if err != nil {
		return nil, err
	}

	bsp := sdktrace.NewBatchSpanProcessor(traceExporter)
	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithResource(resource.Resource),
		sdktrace.WithSpanProcessor(bsp),
	)
	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(propagation.TraceContext{})

	return tracerProvider.Shutdown, nil
}

// Inits metering for the application. It sets the meter as the global meter provider
// and returns a shutdown function to be called on application shutdown. The grpc exporter
// is used by this meter.
func (resource *Resource) InitMetering(ctx context.Context) (Shutdown, error) {
	if !resource.cfg.Metering {
		meterProvider := noopmetric.NewMeterProvider()
		otel.SetMeterProvider(meterProvider)
		return noopShutdown, nil
	}

	metricExporter, err := otlpmetricgrpc.New(ctx)
	if err != nil {
		return nil, err
	}

	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)),
		sdkmetric.WithResource(resource.Resource),
	)
	otel.SetMeterProvider(meterProvider)

	return meterProvider.Shutdown, nil
}

// Get the service name from the resource.
func (resource *Resource) ServiceName() string {
	return resource.serviceName
}

// Get the deployment environment from the resource.
func (resource *Resource) DeploymentEnvironment() string {
	return resource.deploymentEnvironment
}

// Gets the service name as per the OpenTelemetry convention for service name.
// If the service name is not present, "signoz:go" is returned.
func getServiceName(resource *sdkresource.Resource) string {
	val, ok := resource.Set().Value(semconv.ServiceNameKey)
	if !ok {
		return "signoz:go"
	}

	return val.AsString()
}

// Gets the deployment environment as per the OpenTelemetry convention for deployment environment.
// If the deployment environment is not present, "environment:go" is returned.
func getDeploymentEnvironment(resource *sdkresource.Resource) string {
	val, ok := resource.Set().Value(semconv.DeploymentEnvironmentKey)
	if !ok {
		return "environment:go"
	}

	return val.AsString()
}
