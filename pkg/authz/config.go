package authz

import (
	"github.com/SigNoz/signoz/pkg/errors"
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

	MaxChecksPerBatchCheck int `mapstructure:"max_checks_per_batch_check"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("authz"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "openfga",
		OpenFGA: OpenFGAConfig{
			MaxTuplesPerWrite:      300,
			MaxChecksPerBatchCheck: 50,
		},
	}
}

func (c Config) Validate() error {
	if c.OpenFGA.MaxChecksPerBatchCheck <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "authz::openfga::max_checks_per_batch_check must be greater than 0, got %d", c.OpenFGA.MaxChecksPerBatchCheck)
	}

	return nil
}
