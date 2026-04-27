package global

import (
	"net/url"
	"path"
	"strings"

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
	if c.ExternalURL != nil {
		if c.ExternalURL.Path != "" && c.ExternalURL.Path != "/" {
			if !strings.HasPrefix(c.ExternalURL.Path, "/") {
				return errors.NewInvalidInputf(ErrCodeInvalidGlobalConfig, "global::external_url path must start with '/', got %q", c.ExternalURL.Path)
			}
		}
	}

	return nil
}

func (c Config) ExternalPath() string {
	if c.ExternalURL == nil || c.ExternalURL.Path == "" || c.ExternalURL.Path == "/" {
		return ""
	}

	p := path.Clean("/" + c.ExternalURL.Path)
	if p == "/" {
		return ""
	}

	return p
}

func (c Config) ExternalPathTrailing() string {
	if p := c.ExternalPath(); p != "" {
		return p + "/"
	}

	return "/"
}
