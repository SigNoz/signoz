package global

import (
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/factory"
)

var (
	ErrCodeInvalidGlobalConfig = errors.MustNewCode("invalid_global_config")
)

type Config struct {
	ExternalURL  *url.URL `mapstructure:"external_url"`
	IngestionURL *url.URL `mapstructure:"ingestion_url"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("global"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		ExternalURL: &url.URL{
			Scheme: "http",
			Host:   "localhost:8080",
			Path:   "/",
		},
		IngestionURL: &url.URL{
			Scheme: "http",
			Host:   "localhost:8000",
			Path:   "/",
		},
	}
}

func (c Config) Validate() error {
	if c.ExternalURL == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidGlobalConfig, "external_url is required")
	}

	if c.IngestionURL == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidGlobalConfig, "ingestion_url is required")
	}

	return nil
}
