package ruler

import (
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	EvalDelay time.Duration `mapstructure:"eval_delay"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("ruler"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		EvalDelay: 2 * time.Minute,
	}
}

func (c Config) Validate() error {
	return nil
}
