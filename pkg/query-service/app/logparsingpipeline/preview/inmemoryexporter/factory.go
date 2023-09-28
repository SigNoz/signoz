package inmemoryexporter

import (
	"context"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter"
)

func createDefaultConfig() component.Config {
	return &Config{}
}

func createTracesExporter(
	_ context.Context, _ exporter.CreateSettings, config component.Config,
) (exporter.Traces, error) {
	return &InMemoryExporter{
		id: config.(*Config).Id,
	}, nil
}

func createMetricsExporter(
	_ context.Context, _ exporter.CreateSettings, config component.Config,
) (exporter.Metrics, error) {
	return &InMemoryExporter{
		id: config.(*Config).Id,
	}, nil
}

func createLogsExporter(
	_ context.Context, _ exporter.CreateSettings, config component.Config,
) (exporter.Logs, error) {
	return &InMemoryExporter{
		id: config.(*Config).Id,
	}, nil
}

// NewFactory creates a new OTLP receiver factory.
func NewFactory() exporter.Factory {
	return exporter.NewFactory(
		"memory",
		createDefaultConfig,
		exporter.WithTraces(createTracesExporter, component.StabilityLevelStable),
		exporter.WithMetrics(createMetricsExporter, component.StabilityLevelStable),
		exporter.WithLogs(createLogsExporter, component.StabilityLevelBeta))
}
