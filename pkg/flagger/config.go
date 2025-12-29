package flagger

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	Config ConfigProvider `mapstructure:"config"`
}

type ConfigProvider struct {
	Boolean map[string]bool    `mapstructure:"boolean"`
	String  map[string]string  `mapstructure:"string"`
	Float   map[string]float64 `mapstructure:"float"`
	Integer map[string]int64   `mapstructure:"integer"`
	Object  map[string]any     `mapstructure:"object"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(
		factory.MustNewName("flagger"), newConfig,
	)
}

// newConfig creates a new config with the default values.
func newConfig() factory.Config {
	return &Config{
		Config: ConfigProvider{},
	}
}

func (c Config) Validate() error {
	return nil
}
