package ingestion

import (
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/factory"
)

var (
	ErrCodeInvalidIngestionConfig = errors.MustNewCode("invalid_ingestion_config")
)

type Config struct {
	URL *url.URL `mapstructure:"url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("ingestion"), newConfig)
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
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidIngestionConfig, "url is required")
	}

	return nil
}
