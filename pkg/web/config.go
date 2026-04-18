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
