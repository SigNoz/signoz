package alertmanager

import (
	"time"

	"go.signoz.io/signoz/pkg/alertmanager/server"
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Config is the config for the alertmanager server.
	server.Config `mapstructure:",squash"`

	// Provider is the provider for the alertmanager service.
	Provider string `mapstructure:"provider"`

	// Internal is the internal alertmanager configuration.
	Internal Internal `mapstructure:"internal"`
}

type Internal struct {
	// PollInterval is the interval at which the alertmanager is synced.
	PollInterval time.Duration `mapstructure:"poll_interval"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Config:   server.NewConfig(),
		Provider: "internal",
		Internal: Internal{
			PollInterval: 15 * time.Second,
		},
	}
}

func (c Config) Validate() error {
	return nil
}
