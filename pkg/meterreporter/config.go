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

	// Jitter is the randomness applied to both the first collect after
	// Start() and to every subsequent cycle. The first fire happens at a
	// random time in [0, Jitter); each subsequent cycle takes
	// Interval - random(0, Jitter). Negative (the default) means "derive
	// from Interval" via ResolvedJitter, so the value scales with whatever
	// Interval the user picks.
	Jitter time.Duration `mapstructure:"jitter"`
}

func newConfig() factory.Config {
	return Config{
		Interval: 6 * time.Hour,
		Backfill: true,
		Jitter:   -1, // Negative sentinel. Resolved at use time unless explicitly set.
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("meterreporter"), newConfig)
}

func (c Config) Validate() error {
	if c.Interval < 10*time.Minute || c.Interval > 24*time.Hour {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::interval must be between 10m and 24h")
	}

	if c.Jitter >= 0 && (c.Jitter < 10*time.Minute || c.Jitter > c.Interval) {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::jitter must be between 10m and interval")
	}

	return nil
}

// ResolvedJitter returns the configured Jitter, or
// min(Interval, defaultJitter) when the sentinel default is still in place.
func (c Config) ResolvedJitter() time.Duration {
	defaultJitter := 2 * time.Hour

	if c.Jitter < 0 {
		if c.Interval < defaultJitter {
			return c.Interval
		}
		return defaultJitter
	}
	return c.Jitter
}
