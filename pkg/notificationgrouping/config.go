package notificationgrouping

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use for notification grouping.
	Provider string `mapstructure:"provider"`
	// DefaultStrategy is the default grouping strategy to use when no rule-specific strategy is configured.
	DefaultStrategy string `mapstructure:"default_strategy"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("notificationgrouping"), newConfig)
}

// newConfig creates a new default configuration for notification grouping.
func newConfig() factory.Config {
	return Config{
		Provider:        "rulebased",
		DefaultStrategy: "standard",
	}
}

// Validate validates the configuration and returns an error if invalid.
func (c Config) Validate() error {
	// Add validation logic here if needed
	return nil
}
