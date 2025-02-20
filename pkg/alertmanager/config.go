package alertmanager

import (
	"errors"
	"fmt"
	"net/url"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerserver"
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
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

	// Config is the config for the alertmanager server.
	alertmanagerserver.Config `mapstructure:",squash"`
}

type Legacy struct {
	// URL is the URL of the legacy alertmanager.
	URL string `mapstructure:"url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: "legacy",
		Legacy: Legacy{
			URL: "http://alertmanager:9093/api",
		},
		Signoz: Signoz{
			PollInterval: 15 * time.Second,
			Config:       alertmanagerserver.NewConfig(),
		},
	}
}

func (c Config) Validate() error {
	if c.Provider == "legacy" {
		if c.Legacy.URL == "" {
			return errors.New("url is required")
		}

		_, err := url.Parse(c.Legacy.URL)
		if err != nil {
			return fmt.Errorf("url %q is invalid: %w", c.Legacy.URL, err)
		}
	}

	return nil
}
