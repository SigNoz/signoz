package web

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

// Config holds the configuration for web.
type Config struct {
	// Whether the web package is enabled.
	Enabled bool `mapstructure:"enabled"`

	// The name of the index file to serve.
	Index string `mapstructure:"index"`

	// The directory from which to serve the web files.
	Directory string `mapstructure:"directory"`

	Settings Settings `mapstructure:"settings"`
}

type Settings struct {
	Sentry Sentry `mapstructure:"sentry" json:"sentry"`

	Posthog Posthog `mapstructure:"posthog" json:"posthog"`

	Pylon Pylon `mapstructure:"pylon" json:"pylon"`

	Appcues Appcues `mapstructure:"appcues" json:"appcues"`
}

type Sentry struct {
	Enabled bool `mapstructure:"enabled" json:"enabled"`

	DSN string `mapstructure:"dsn" json:"dsn,omitempty"`

	TunnelURL string `mapstructure:"tunnel_url" json:"tunnelURL,omitempty"`
}

type Posthog struct {
	Enabled bool `mapstructure:"enabled" json:"enabled"`

	Key string `mapstructure:"key" json:"key,omitempty"`
}

type Pylon struct {
	Enabled bool `mapstructure:"enabled" json:"enabled"`

	AppID string `mapstructure:"app_id" json:"appID,omitempty"`

	IdentSecret string `mapstructure:"ident_secret" json:"identSecret,omitempty"`
}

type Appcues struct {
	Enabled bool `mapstructure:"enabled" json:"enabled"`

	AppID string `mapstructure:"app_id" json:"appID,omitempty"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("web"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled:   true,
		Index:     "index.html",
		Directory: "/etc/signoz/web",
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "router"
	}

	return "noop"
}
