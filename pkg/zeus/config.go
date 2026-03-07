package zeus

import (
	"net/url"

	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	URL           *url.URL `mapstructure:"url"`
	DeprecatedURL *url.URL `mapstructure:"deprecated_url"`
}

func (c Config) Validate() error {
	return nil
}
