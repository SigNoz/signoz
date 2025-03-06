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
	// ApiURL is the URL of the legacy signoz alertmanager.
	ApiURL string `mapstructure:"api_url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: "legacy",
		Legacy: Legacy{
			ApiURL: "http://alertmanager:9093/api",
		},
		Signoz: Signoz{
			PollInterval: 1 * time.Minute,
			Config:       alertmanagerserver.NewConfig(),
		},
	}
}

func (c Config) Validate() error {
	if c.Provider == "legacy" {
		if c.Legacy.ApiURL == "" {
			return errors.New("api_url is required")
		}

		_, err := url.Parse(c.Legacy.ApiURL)
		if err != nil {
			return fmt.Errorf("api_url %q is invalid: %w", c.Legacy.ApiURL, err)
		}
	}

	return nil
}
