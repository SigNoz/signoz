package instrumentation

import (
	"context"
	"fmt"

	contribsdkconfig "go.opentelemetry.io/contrib/config"
	sdklog "go.opentelemetry.io/otel/log"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/version"
	"go.uber.org/zap"
)

// Instrumentation holds the core components for application instrumentation.
type Instrumentation struct {
	LoggerProvider sdklog.LoggerProvider
	Logger         *zap.Logger
	MeterProvider  sdkmetric.MeterProvider
	TracerProvider sdktrace.TracerProvider
}

// New creates a new Instrumentation instance with configured providers.
// It sets up logging, tracing, and metrics based on the provided configuration.
func New(ctx context.Context, build version.Build, cfg Config) (*Instrumentation, error) {
	// Set default resource attributes if not provided
	if cfg.Resource.Attributes == nil {
		cfg.Resource.Attributes = map[string]any{
			string(semconv.ServiceNameKey):    build.Name,
			string(semconv.ServiceVersionKey): build.Version,
		}
	}

	// Create a new resource with default detectors.
	// The upstream contrib repository is not taking detectors into account.
	// We are, therefore, using some sensible defaults here.
	resource, err := sdkresource.New(
		ctx,
		sdkresource.WithContainer(),
		sdkresource.WithFromEnv(),
		sdkresource.WithHost(),
	)
	if err != nil {
		return nil, err
	}

	// Prepare the resource configuration by merging
	// resource and attributes.
	sch := semconv.SchemaURL
	configResource := contribsdkconfig.Resource{
		Attributes: attributes(cfg.Resource.Attributes, resource),
		Detectors:  nil,
		SchemaUrl:  &sch,
	}

	loggerProvider, err := newLoggerProvider(ctx, cfg, configResource)
	if err != nil {
		return nil, fmt.Errorf("cannot create logger provider: %w", err)
	}

	tracerProvider, err := newTracerProvider(ctx, cfg, configResource)
	if err != nil {
		return nil, fmt.Errorf("cannot create tracer provider: %w", err)
	}

	meterProvider, err := newMeterProvider(ctx, cfg, configResource)
	if err != nil {
		return nil, fmt.Errorf("cannot create meter provider: %w", err)
	}

	return &Instrumentation{
		LoggerProvider: loggerProvider,
		TracerProvider: tracerProvider,
		MeterProvider:  meterProvider,
		Logger:         newLogger(cfg, loggerProvider),
	}, nil
}

// attributes merges the input attributes with the resource attributes.
func attributes(input map[string]any, resource *sdkresource.Resource) map[string]any {
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
