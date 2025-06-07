package statsreporter

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Enabled is a flag to enable or disable the stats reporter.
	Enabled bool `mapstructure:"enabled"`

	// Interval is the interval at which the stats are collected.
	Interval time.Duration `mapstructure:"interval"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("statsreporter"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Enabled:  true,
		Interval: 6 * time.Hour,
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "analytics"
	}

	return "noop"
}
