package gateway

import (
	"errors"
	"net/url"

	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	URL *url.URL `mapstructure:"url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("gateway"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		URL: &url.URL{
			Scheme: "http",
			Host:   "localhost:8080",
			Path:   "/",
		},
	}
}

func (c Config) Validate() error {
	if c.URL == nil {
		return errors.New("url is required")
	}
	return nil
}
