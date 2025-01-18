package instrumentation

import (
	"context"

	contribsdkconfig "go.opentelemetry.io/contrib/config"
	sdklog "go.opentelemetry.io/otel/log"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/version"
	"go.uber.org/zap"
)

var _ factory.Service = (*SDK)(nil)
var _ Instrumentation = (*SDK)(nil)

// SDK holds the core components for application instrumentation.
type SDK struct {
	sdk    contribsdkconfig.SDK
	logger *zap.Logger
}

// New creates a new Instrumentation instance with configured providers.
// It sets up logging, tracing, and metrics based on the provided configuration.
func New(ctx context.Context, build version.Build, cfg Config) (*SDK, error) {
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
		Attributes: mergeAttributes(cfg.Resource.Attributes, resource),
		Detectors:  nil,
		SchemaUrl:  &sch,
	}

	var loggerProvider *contribsdkconfig.LoggerProvider
	if cfg.Logs.Enabled {
		loggerProvider = &contribsdkconfig.LoggerProvider{
			Processors: []contribsdkconfig.LogRecordProcessor{
				{Batch: &cfg.Logs.Processors.Batch},
			},
		}
	}

	var tracerProvider *contribsdkconfig.TracerProvider
	if cfg.Traces.Enabled {
		tracerProvider = &contribsdkconfig.TracerProvider{
			Processors: []contribsdkconfig.SpanProcessor{
				{Batch: &cfg.Traces.Processors.Batch},
			},
			Sampler: &cfg.Traces.Sampler,
		}
	}

	var meterProvider *contribsdkconfig.MeterProvider
	if cfg.Metrics.Enabled {
		meterProvider = &contribsdkconfig.MeterProvider{
			Readers: []contribsdkconfig.MetricReader{
				{Pull: &cfg.Metrics.Readers.Pull},
			},
		}
	}

	sdk, err := contribsdkconfig.NewSDK(
		contribsdkconfig.WithContext(ctx),
		contribsdkconfig.WithOpenTelemetryConfiguration(contribsdkconfig.OpenTelemetryConfiguration{
			LoggerProvider: loggerProvider,
			TracerProvider: tracerProvider,
			MeterProvider:  meterProvider,
			Resource:       &configResource,
		}),
	)
	if err != nil {
		return nil, err
	}

	return &SDK{
		sdk:    sdk,
		logger: newLogger(cfg, sdk.LoggerProvider()),
	}, nil
}

func (i *SDK) Start(ctx context.Context) error {
	return nil
}

func (i *SDK) Stop(ctx context.Context) error {
	return i.sdk.Shutdown(ctx)
}

func (i *SDK) LoggerProvider() sdklog.LoggerProvider {
	return i.sdk.LoggerProvider()
}

func (i *SDK) Logger() *zap.Logger {
	return i.logger
}

func (i *SDK) MeterProvider() sdkmetric.MeterProvider {
	return i.sdk.MeterProvider()
}

func (i *SDK) TracerProvider() sdktrace.TracerProvider {
	return i.sdk.TracerProvider()
}

func (i *SDK) ToProviderSettings() factory.ProviderSettings {
	return factory.ProviderSettings{
		LoggerProvider: i.LoggerProvider(),
		ZapLogger:      i.Logger(),
		MeterProvider:  i.MeterProvider(),
		TracerProvider: i.TracerProvider(),
	}
}
