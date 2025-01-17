package web

import (
	"go.signoz.io/signoz/pkg/factory"
)

// Config holds the configuration for web.
type Config struct {
	// Whether the web package is enabled.
	Enabled bool `mapstructure:"enabled"`
	// The prefix to serve the files from
	Prefix string `mapstructure:"prefix"`
	// The directory containing the static build files. The root of this directory should
	// have an index.html file.
	Directory string `mapstructure:"directory"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("web"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled:   true,
		Prefix:    "/",
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
