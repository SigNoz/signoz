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

	// Web settings configuration.
	Settings SettingsConfig `mapstructure:"settings"`
}

// SettingsConfig holds the configuration for web settings.
type SettingsConfig struct {
	Posthog PosthogConfig `mapstructure:"posthog"`
	Appcues AppcuesConfig `mapstructure:"appcues"`
	Sentry  SentryConfig  `mapstructure:"sentry"`
	Pylon   PylonConfig   `mapstructure:"pylon"`
}

type PosthogConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Key     string `mapstructure:"key"`
	APIHost string `mapstructure:"api_host"`
	UIHost  string `mapstructure:"ui_host"`
}

type AppcuesConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	AppID   string `mapstructure:"app_id"`
}

type SentryConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	DSN     string `mapstructure:"dsn"`
	Tunnel  string `mapstructure:"tunnel"`
}

type PylonConfig struct {
	Enabled        bool   `mapstructure:"enabled"`
	AppID          string `mapstructure:"app_id"`
	IdentitySecret string `mapstructure:"identity_secret"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("web"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled:   true,
		Index:     "index.html",
		Directory: "/etc/signoz/web",
		Settings: SettingsConfig{
			Posthog: PosthogConfig{
				Enabled: false,
			},
			Appcues: AppcuesConfig{
				Enabled: false,
			},
			Sentry: SentryConfig{
				Enabled: false,
			},
			Pylon: PylonConfig{
				Enabled: false,
			},
		},
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
