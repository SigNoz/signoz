package instrumentation

import (
	"context"

	contribsdkconfig "go.opentelemetry.io/contrib/config"
	sdkmetric "go.opentelemetry.io/otel/metric"
	noopmetric "go.opentelemetry.io/otel/metric/noop"
)

// newMeterProvider creates a new meter provider based on the configuration.
// If metrics are disabled, it returns a no-op meter provider.
func newMeterProvider(ctx context.Context, cfg Config, cfgResource contribsdkconfig.Resource) (sdkmetric.MeterProvider, error) {
	if !cfg.Metrics.Enabled {
		return noopmetric.NewMeterProvider(), nil
	}

	sdk, err := contribsdkconfig.NewSDK(
		contribsdkconfig.WithContext(ctx),
		contribsdkconfig.WithOpenTelemetryConfiguration(contribsdkconfig.OpenTelemetryConfiguration{
			MeterProvider: &cfg.Metrics.MeterProvider,
			Resource:      &cfgResource,
		}),
	)
	if err != nil {
		return nil, err
	}

	return sdk.MeterProvider(), nil
}
