package statementbuilder

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

// SkipResourceFingerprint configures when the resource fingerprint subquery is skipped in favor of main-table filtering.
type SkipResourceFingerprint struct {
	Enabled bool `yaml:"enabled" mapstructure:"enabled"`
	// If count of fingerprint is above threshold, skip the fingerprint subquery and filter on main table instead.
	Threshold uint64 `yaml:"threshold" mapstructure:"threshold"`
}

// Config represents the configuration for the statement builders.
type Config struct {
	// SkipResourceFingerprint configures when the resource fingerprint subquery is skipped in favor of main-table filtering.
	SkipResourceFingerprint SkipResourceFingerprint `yaml:"skip_resource_fingerprint" mapstructure:"skip_resource_fingerprint"`
}

// NewConfigFactory creates a new config factory for the statement builders.
func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("statementbuilder"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		SkipResourceFingerprint: SkipResourceFingerprint{
			Enabled:   false,
			Threshold: 100000,
		},
	}
}

// Validate validates the configuration.
func (c Config) Validate() error {
	if c.SkipResourceFingerprint.Enabled && c.SkipResourceFingerprint.Threshold == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "skip_resource_fingerprint.threshold must be > 0 when enabled")
	}
	return nil
}
