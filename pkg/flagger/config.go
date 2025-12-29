package flagger

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	// Features are the features and there overrides which come directly from the config file.
	Config ConfigFeatures `mapstructure:"config"`
}

type ConfigFeatures struct {
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(
		factory.MustNewName("flagger"), newConfig,
	)
}

// newConfig creates a new config with the default values.
func newConfig() factory.Config {
	return &Config{
		Config: ConfigFeatures{},
	}
}

func (c Config) Validate() error {
	return nil
}
