package meterreporter

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	// Interval is how often the reporter collects and ships meters.
	Interval time.Duration `mapstructure:"interval"`

	// Backfill enables sealed-day catch-up from the license creation day.
	Backfill bool `mapstructure:"backfill"`

	// MaxStartJitter caps the random delay before the first collect after
	// Start(). Actual delay is uniform in [0, MaxStartJitter). Negative
	// (the default) means "derive from Interval" — see ResolvedMaxStartJitter.
	// Set to 0 explicitly to collect immediately on startup (dev / testing).
	MaxStartJitter time.Duration `mapstructure:"max_start_jitter"`

	// MaxTickJitter is the maximum amount shaved off Interval for each
	// subsequent fire. Each cycle = uniform(Interval - MaxTickJitter, Interval].
	// Negative (the default) means "derive from Interval" — see
	// ResolvedMaxTickJitter. Must be < Interval so two consecutive fires
	// cannot collapse to the same instant.
	MaxTickJitter time.Duration `mapstructure:"max_tick_jitter"`
}

func newConfig() factory.Config {
	return Config{
		Interval:       6 * time.Hour,
		Backfill:       true,
		MaxStartJitter: -1, // Negative sentinels. Resolved at use time unless explicitly set.
		MaxTickJitter:  -1, // Negative sentinels. Resolved at use time unless explicitly set.
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("meterreporter"), newConfig)
}

func (c Config) Validate() error {
	if c.Interval < 5*time.Minute || c.Interval > 24*time.Hour {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::interval must be between 5m and 24h")
	}

	if c.MaxStartJitter > c.Interval {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::max_start_jitter must be between 0 and interval")
	}

	if c.MaxTickJitter >= c.Interval {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::max_tick_jitter must be in [0, interval)")
	}

	return nil
}

// ResolvedMaxStartJitter returns the configured MaxStartJitter or, if the
// sentinel default is still in place, falls back to Interval so that the
// jitter scales with whatever Interval the user picks.
func (c Config) ResolvedMaxStartJitter() time.Duration {
	if c.MaxStartJitter < 0 {
		return c.Interval
	}
	return c.MaxStartJitter
}

// ResolvedMaxTickJitter returns the configured MaxTickJitter or, if the
// sentinel default is still in place, falls back to Interval / 10.
func (c Config) ResolvedMaxTickJitter() time.Duration {
	if c.MaxTickJitter < 0 {
		return c.Interval / 10
	}
	return c.MaxTickJitter
}
