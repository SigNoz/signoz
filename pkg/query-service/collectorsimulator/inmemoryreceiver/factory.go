package inmemoryreceiver

import (
	"context"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/receiver"
)

func createDefaultConfig() component.Config {
	return &Config{
		Id: uuid.NewString(),
	}
}

func createLogsReceiver(
	_ context.Context,
	_ receiver.CreateSettings,
	config component.Config,
	consumer consumer.Logs,
) (receiver.Logs, error) {
	if err := component.ValidateConfig(config); err != nil {
		return nil, errors.Wrap(err, "invalid inmemory receiver config")
	}
	return &InMemoryReceiver{
		id:           config.(*Config).Id,
		nextConsumer: consumer,
	}, nil

}

// NewFactory creates a new OTLP receiver factory.
func NewFactory() receiver.Factory {
	return receiver.NewFactory(
		component.MustNewType("memory"),
		createDefaultConfig,
		receiver.WithLogs(createLogsReceiver, component.StabilityLevelBeta))
}
