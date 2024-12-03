package version

import "go.signoz.io/signoz/pkg/confmap"

// Config satisfies the confmap.Config interface
var _ confmap.Config = (*Config)(nil)

// Config holds the configuration for all instrumentation components.
type Config struct {
	Banner Banner `mapstructure:"banner"`
}

type Banner struct {
	Enabled bool `mapstructure:"enabled"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Banner: Banner{
			Enabled: true,
		},
	}
}

func (c *Config) Validate() error {
	return nil
}
