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

	// MaxBackfillDays caps sealed-day backfill work per tick.
	MaxBackfillDays int `mapstructure:"max_backfill_days"`
}

func newConfig() factory.Config {
	return Config{
		Interval:        6 * time.Hour,
		MaxBackfillDays: 180,
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("meterreporter"), newConfig)
}

func (c Config) Validate() error {
	if c.Interval < 5*time.Minute || c.Interval > 24*time.Hour {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::interval must be between 5m and 24h")
	}

	if c.MaxBackfillDays < 1 || c.MaxBackfillDays > 180 {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "meterreporter::max_backfill_days must be between 1 and 180")
	}

	return nil
}
