package prometheustest

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

// New returns the clickhousev2 provider over the given telemetry store, so
// tests exercise the production read path against a mock store.
func New(ctx context.Context, providerSettings factory.ProviderSettings, config prometheus.Config, telemetryStore telemetrystore.TelemetryStore) prometheus.Prometheus {
	provider, err := clickhouseprometheusv2.New(ctx, providerSettings, config, telemetryStore)
	if err != nil {
		panic(err)
	}
	return provider
}
