package querier

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type SkipResourceFingerprint struct {
	Enabled bool `yaml:"enabled" mapstructure:"enabled"`
	// If count of fingerprint is above threshold, skip the fingerprint subquery and filter on main table instead.
	Threshold uint64 `yaml:"threshold" mapstructure:"threshold"`
}

// Config represents the configuration for the querier.
type Config struct {
	// CacheTTL is the TTL for cached query results
	CacheTTL time.Duration `yaml:"cache_ttl" mapstructure:"cache_ttl"`
	// FluxInterval is the interval for recent data that should not be cached
	FluxInterval time.Duration `yaml:"flux_interval" mapstructure:"flux_interval"`
	// MaxConcurrentQueries is the maximum number of concurrent queries for missing ranges
	MaxConcurrentQueries int `yaml:"max_concurrent_queries" mapstructure:"max_concurrent_queries"`
	// SkipResourceFingerprint configures when the resource fingerprint subquery is skipped in favor of main-table filtering.
	SkipResourceFingerprint SkipResourceFingerprint `yaml:"skip_resource_fingerprint" mapstructure:"skip_resource_fingerprint"`
}

// NewConfigFactory creates a new config factory for querier.
func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("querier"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		// Default values
		CacheTTL:             168 * time.Hour,
		FluxInterval:         5 * time.Minute,
		MaxConcurrentQueries: 4,
		SkipResourceFingerprint: SkipResourceFingerprint{
			Enabled:   false,
			Threshold: 100000,
		},
	}
}

// Validate validates the configuration.
func (c Config) Validate() error {
	if c.CacheTTL <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "cache_ttl must be positive, got %v", c.CacheTTL)
	}
	if c.FluxInterval <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "flux_interval must be positive, got %v", c.FluxInterval)
	}
	if c.MaxConcurrentQueries <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "max_concurrent_queries must be positive, got %v", c.MaxConcurrentQueries)
	}
	if c.SkipResourceFingerprint.Enabled && c.SkipResourceFingerprint.Threshold == 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "skip_resource_fingerprint.threshold must be > 0 when enabled")
	}
	return nil
}

func (c Config) Provider() string {
	return "signoz"
}
