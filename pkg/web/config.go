package web

import (
	"go.signoz.io/signoz/pkg/confmap"
)

// Config satisfies the confmap.Config interface
var _ confmap.Config = (*Config)(nil)

// Config holds the configuration for web.
type Config struct {
	// The prefix to serve the files from
	Prefix string `mapstructure:"prefix"`
	// The directory containing the static build files. The root of this directory should
	// have an index.html file.
	Directory string `mapstructure:"directory"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Prefix:    "/",
		Directory: "/etc/signoz/web",
	}

}

func (c *Config) Validate() error {
	return nil
}
