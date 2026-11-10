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
	ErrCodeOriginNotAllowed    = errors.MustNewCode("origin_not_allowed")
)

type Config struct {
	ExternalURL    *url.URL   `mapstructure:"external_url"`
	AllowedOrigins []*url.URL `mapstructure:"allowed_origins"`
	IngestionURL   *url.URL   `mapstructure:"ingestion_url"`
	MCPURL         *url.URL   `mapstructure:"mcp_url"`
	AIAssistantURL *url.URL   `mapstructure:"ai_assistant_url"`
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

	for _, origin := range c.AllowedOrigins {
		if origin == nil || origin.Scheme == "" || origin.Host == "" {
			return errors.NewInvalidInputf(ErrCodeInvalidGlobalConfig, "global::allowed_origins entries must be of the form scheme://host[:port], got %q", origin)
		}

		if origin.Path != "" && origin.Path != "/" {
			return errors.NewInvalidInputf(ErrCodeInvalidGlobalConfig, "global::allowed_origins entries must not contain a path, got %q", origin)
		}
	}

	return nil
}

func (c Config) IsOriginAllowed(u *url.URL) bool {
	if len(c.AllowedOrigins) == 0 {
		return true
	}

	for _, origin := range c.AllowedOrigins {
		if strings.EqualFold(origin.Scheme, u.Scheme) && strings.EqualFold(origin.Host, u.Host) {
			return true
		}
	}

	return false
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
