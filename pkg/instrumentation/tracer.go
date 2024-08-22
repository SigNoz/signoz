package instrumentation

import (
	"context"

	contribsdkconfig "go.opentelemetry.io/contrib/config"
	sdktrace "go.opentelemetry.io/otel/trace"
	nooptrace "go.opentelemetry.io/otel/trace/noop"
)

// newTracerProvider creates a new tracer provider based on the configuration.
// If tracing is disabled, it returns a no-op tracer provider.
func newTracerProvider(ctx context.Context, cfg Config, cfgResource contribsdkconfig.Resource) (sdktrace.TracerProvider, error) {
	if !cfg.Traces.Enabled {
		return nooptrace.NewTracerProvider(), nil
	}

	sdk, err := contribsdkconfig.NewSDK(
		contribsdkconfig.WithContext(ctx),
		contribsdkconfig.WithOpenTelemetryConfiguration(contribsdkconfig.OpenTelemetryConfiguration{
			TracerProvider: &cfg.Traces.TracerProvider,
			Resource:       &cfgResource,
		}),
	)
	if err != nil {
		return nil, err
	}

	return sdk.TracerProvider(), nil
}
