package sqlmigrator

import (
	"errors"
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Lock is the lock configuration.
	Lock Lock `mapstructure:"lock"`
}

type Lock struct {
	// Timeout is the time to wait for the migration lock.
	Timeout time.Duration `mapstructure:"timeout"`
	// Interval is the interval to try to acquire the migration lock.
	Interval time.Duration `mapstructure:"interval"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlmigrator"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Lock: Lock{
			Timeout:  2 * time.Minute,
			Interval: 10 * time.Second,
		},
	}
}

func (c Config) Validate() error {
	if c.Lock.Timeout <= c.Lock.Interval {
		return errors.New("lock::timeout must be greater than lock::interval")
	}

	return nil
}
