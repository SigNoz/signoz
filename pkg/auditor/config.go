package auditor

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

type Config struct {
	Provider      string        `mapstructure:"provider"`
	Endpoint      string        `mapstructure:"endpoint"`
	BufferSize    int           `mapstructure:"buffer_size"`
	BatchSize     int           `mapstructure:"batch_size"`
	FlushInterval time.Duration `mapstructure:"flush_interval"`
}

func newConfig() factory.Config {
	return Config{
		BufferSize:    1000,
		BatchSize:     100,
		FlushInterval: time.Second,
	}
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("auditor"), newConfig)
}

func (c Config) Validate() error {
	if c.BufferSize <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor buffer_size must be greater than 0")
	}
	if c.BatchSize <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor batch_size must be greater than 0")
	}
	if c.FlushInterval <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor flush_interval must be greater than 0")
	}
	if c.BatchSize > c.BufferSize {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auditor batch_size must not exceed buffer_size")
	}
	return nil
}
