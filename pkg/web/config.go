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
	Pylon   PylonConfig   `mapstructure:"sentry"`
}

type PosthogConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type AppcuesConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type SentryConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type PylonConfig struct {
	Enabled bool `mapstructure:"enabled"`
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
				Enabled: true,
			},
			Appcues: AppcuesConfig{
				Enabled: true,
			},
			Sentry: SentryConfig{
				Enabled: true,
			},
			Pylon: PylonConfig{
				Enabled: true,
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
