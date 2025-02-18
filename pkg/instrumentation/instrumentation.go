package instrumentation

import (
	"log/slog"

	"github.com/prometheus/client_golang/prometheus"
	sdkmetric "go.opentelemetry.io/otel/metric"
	sdkresource "go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/trace"
	"go.signoz.io/signoz/pkg/factory"
)

// Instrumentation provides the core components for application instrumentation.
type Instrumentation interface {
	// Logger returns the Slog logger.
	Logger() *slog.Logger
	// MeterProvider returns the OpenTelemetry meter provider.
	MeterProvider() sdkmetric.MeterProvider
	// TracerProvider returns the OpenTelemetry tracer provider.
	TracerProvider() sdktrace.TracerProvider
	// PrometheusRegisterer returns the Prometheus registerer.
	PrometheusRegisterer() prometheus.Registerer
	// ToProviderSettings converts instrumentation to provider settings.
	ToProviderSettings() factory.ProviderSettings
}

// Merges the input attributes with the resource attributes.
func mergeAttributes(input map[string]any, resource *sdkresource.Resource) map[string]any {
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
