package flagger

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	// Config are the overrides for the feature flags which come directly from the config file.
	Config map[string]any `mapstructure:"config"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(
		factory.MustNewName("flagger"), newConfig,
	)
}

// newConfig creates a new config with the default values.
func newConfig() factory.Config {
	return &Config{
		Config: make(map[string]any),
	}
}

func (c Config) Validate() error {
	return nil
}
