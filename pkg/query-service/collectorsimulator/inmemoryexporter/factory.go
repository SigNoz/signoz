package inmemoryexporter

import (
	"context"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter"
)

func createDefaultConfig() component.Config {
	return &Config{
		Id: uuid.NewString(),
	}
}

func createLogsExporter(
	_ context.Context, _ exporter.Settings, config component.Config,
) (exporter.Logs, error) {
	if err := component.ValidateConfig(config); err != nil {
		return nil, errors.Wrap(err, "invalid inmemory exporter config")
	}
	return &InMemoryExporter{
		id: config.(*Config).Id,
	}, nil
}

func NewFactory() exporter.Factory {
	return exporter.NewFactory(
		component.MustNewType("memory"),
		createDefaultConfig,
		exporter.WithLogs(createLogsExporter, component.StabilityLevelBeta))
}
