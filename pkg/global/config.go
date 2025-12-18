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
			Scheme: "",
			Host:   "<unset>",
			Path:   "",
		},
		IngestionURL: &url.URL{
			Scheme: "",
			Host:   "<unset>",
			Path:   "",
		},
	}
}

func (c Config) Validate() error {
	return nil
}
