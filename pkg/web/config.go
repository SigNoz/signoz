package web

import (
	"go.signoz.io/signoz/pkg/config"
)

// Config satisfies the confmap.Config interface
var _ config.Config = (*Config)(nil)

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

func NewConfigFactory() config.ConfigFactory {
	return config.NewConfigFactory(newConfig)
}

func newConfig() config.Config {
	return &Config{
		Enabled:   true,
		Prefix:    "/",
		Directory: "/etc/signoz/web",
	}

}

func (c *Config) Key() string {
	return "web"
}

func (c *Config) Validate() error {
	return nil
}
