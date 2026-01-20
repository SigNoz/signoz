package analytics

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

// This will be set via ldflags at build time.
var (
	key string = "<unset>"
)

type Config struct {
	Enabled bool    `mapstructure:"enabled"`
	Segment Segment `mapstructure:"segment"`
}

type Segment struct {
	Key string `mapstructure:"key"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("analytics"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Enabled: false,
		Segment: Segment{
			Key: key,
		},
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "segment"
	}

	return "noop"
}
