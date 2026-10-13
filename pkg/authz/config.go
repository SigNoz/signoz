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

	// Telemetry is the configuration for the telemetry query access check.
	Telemetry TelemetryConfig `mapstructure:"telemetry"`
}

type OpenFGAConfig struct {
	// MaxTuplesPerWrite is the maximum number of tuples to include in a single write call.
	MaxTuplesPerWrite int `mapstructure:"max_tuples_per_write"`
}

type TelemetryConfig struct {
	// MaxQueryDisjuncts is the maximum number of IN value combinations one builder query is split
	// into for the access check; beyond it the query is checked as one resource.
	MaxQueryDisjuncts int `mapstructure:"max_query_disjuncts"`
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
		Telemetry: TelemetryConfig{
			MaxQueryDisjuncts: 64,
		},
	}
}

func (c Config) Validate() error {
	if c.Telemetry.MaxQueryDisjuncts < 1 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "authz.telemetry.max_query_disjuncts must be at least 1, got %d", c.Telemetry.MaxQueryDisjuncts)
	}

	return nil
}
