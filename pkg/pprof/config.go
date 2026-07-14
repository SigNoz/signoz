package pprof

import "github.com/SigNoz/signoz/pkg/factory"

// Config holds the configuration for the pprof server.
type Config struct {
	Enabled bool   `mapstructure:"enabled"`
	Address string `mapstructure:"address"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("pprof"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Enabled: true,
		Address: "0.0.0.0:6060",
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "http"
	}

	return "noop"
}
