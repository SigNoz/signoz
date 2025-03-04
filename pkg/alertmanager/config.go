package alertmanager

import (
	"net/url"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerserver"
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Config is the config for the alertmanager server.
	alertmanagerserver.Config `mapstructure:",squash"`

	// Provider is the provider for the alertmanager service.
	Provider string `mapstructure:"provider"`

	// Internal is the internal alertmanager configuration.
	Signoz Signoz `mapstructure:"signoz"`

	// Legacy is the legacy alertmanager configuration.
	Legacy Legacy `mapstructure:"legacy"`
}

type Signoz struct {
	// PollInterval is the interval at which the alertmanager is synced.
	PollInterval time.Duration `mapstructure:"poll_interval"`
}

type Legacy struct {
	// URL is the URL of the legacy alertmanager.
	URL *url.URL `mapstructure:"url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Config:   alertmanagerserver.NewConfig(),
		Provider: "signoz",
		Signoz: Signoz{
			PollInterval: 15 * time.Second,
		},
	}
}

func (c Config) Validate() error {
	return nil
}
