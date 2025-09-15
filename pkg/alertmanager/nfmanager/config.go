package nfmanager

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	Provider string `mapstructure:"provider"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("nfmanager"), newConfig)
}

// newConfig creates a new default configuration for notification grouping.
func newConfig() factory.Config {
	return Config{
		Provider: "rulebased",
	}
}

// Validate validates the configuration and returns an error if invalid.
func (c Config) Validate() error {
	// Add validation logic here if needed
	return nil
}
