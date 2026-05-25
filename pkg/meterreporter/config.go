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
	// Start(). Actual delay is uniform in [0, MaxStartJitter). Set to 0 to
	// collect immediately on startup. Spreads fleet-wide load to Zeus
	// across the interval after a rolling deploy.
	MaxStartJitter time.Duration `mapstructure:"max_start_jitter"`

	// MaxTickJitter is the maximum amount shaved off Interval for each
	// subsequent fire. Each cycle = uniform(Interval - MaxTickJitter, Interval].
	// Prevents fleet re-synchronization over time. Must be < Interval so
	// two consecutive fires cannot collapse to the same instant.
	MaxTickJitter time.Duration `mapstructure:"max_tick_jitter"`
}

func newConfig() factory.Config {
	return Config{
		Interval:       6 * time.Hour,
		Backfill:       true,
		MaxStartJitter: 6 * time.Hour,
		MaxTickJitter:  36 * time.Minute,
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("meterreporter"), newConfig)
}

func (c Config) Validate() error {
	if c.Interval < 5*time.Minute || c.Interval > 24*time.Hour {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::interval must be between 5m and 24h")
	}

	if c.MaxStartJitter < 0 || c.MaxStartJitter > c.Interval {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::max_start_jitter must be between 0 and interval")
	}

	if c.MaxTickJitter < 0 || c.MaxTickJitter >= c.Interval {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::max_tick_jitter must be in [0, interval)")
	}

	return nil
}
