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

	// Settings that are exposed to the web.
	Settings Settings `mapstructure:"settings"`
}

// Settings that are exposed to the web.
type Settings struct {
	Posthog Posthog `mapstructure:"posthog"`

	Appcues Appcues `mapstructure:"appcues"`
}

type Posthog struct {
	Enabled bool `mapstructure:"enabled"`
}

type Appcues struct {
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
		Settings: Settings{
			Posthog: Posthog{
				Enabled: true,
			},
			Appcues: Appcues{
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
