package metricsexplorer

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// TelemetryStore is the telemetrystore configuration
	TelemetryStore TelemetryStoreConfig `mapstructure:"telemetrystore"`
}

type TelemetryStoreConfig struct {
	// Threads is the number of threads to use for ClickHouse queries
	Threads int `mapstructure:"threads"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("metricsexplorer"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		TelemetryStore: TelemetryStoreConfig{
			Threads: 8, // Default value
		},
	}
}

func (c Config) Validate() error {
	if c.TelemetryStore.Threads <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "metricsexplorer.telemetrystore.threads must be positive, got %d", c.TelemetryStore.Threads)
	}
	return nil
}
