package analytics

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/factory"
)

// This will be set via ldflags at build time.
var (
	key string = "<unset>"
)

type Config struct {
	Enabled bool   `mapstructure:"enabled"`
	Key     string `mapstructure:"key"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("analytics"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Enabled: false,
		Key:     key,
	}
}

func (c Config) Validate() error {
	if c.Key != key {
		return fmt.Errorf("cannot override key set at build time with key: %s", c.Key)
	}

	return nil
}
