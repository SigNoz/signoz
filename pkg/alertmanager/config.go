package alertmanager

import (
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider for the alertmanager service.
	Provider string `mapstructure:"provider"`

	// Internal is the internal alertmanager configuration.
	Signoz Signoz `mapstructure:"signoz" yaml:"signoz"`

	// Legacy is the legacy alertmanager configuration.
	Legacy Legacy `mapstructure:"legacy"`
}

type Signoz struct {
	// PollInterval is the interval at which the alertmanager is synced.
	PollInterval time.Duration `mapstructure:"poll_interval"`

	// Config is the config for the alertmanager server.
	alertmanagerserver.Config `mapstructure:",squash" yaml:",squash"`
}

type Legacy struct {
	// ApiURL is the URL of the legacy signoz alertmanager.
	ApiURL *url.URL `mapstructure:"api_url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("alertmanager"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: "legacy",
		Legacy: Legacy{
			ApiURL: &url.URL{
				Scheme: "http",
				Host:   "alertmanager:9093",
				Path:   "/api",
			},
		},
		Signoz: Signoz{
			PollInterval: 1 * time.Minute,
			Config:       alertmanagerserver.NewConfig(),
		},
	}
}

func (c Config) Validate() error {
	return nil
}
