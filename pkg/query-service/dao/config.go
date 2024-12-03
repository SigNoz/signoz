package dao

import "go.signoz.io/signoz/pkg/confmap"

type Config struct {
	Provider string `mapstructure:"provider"`
	Path     string `mapstructure:"path"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Provider: "sqlite",
		Path:     "/var/lib/signoz.db",
	}
}

func (c *Config) Validate() error {
	return nil
}
