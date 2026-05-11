package authz

import (
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Provider is the name of the authorization provider to use.
	Provider string `mapstructure:"provider"`

	// OpenFGA is the configuration specific to the OpenFGA authorization provider.
	OpenFGA OpenFGAConfig `mapstructure:"openfga"`
}

type OpenFGAConfig struct {
	// MaxTuplesPerWrite is the maximum number of tuples to include in a single write call.
	MaxTuplesPerWrite int `mapstructure:"max_tuples_per_write"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("authz"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "openfga",
		OpenFGA: OpenFGAConfig{
			MaxTuplesPerWrite: 300,
		},
	}
}

func (c Config) Validate() error {
	return nil
}
