package ruler

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Config struct {
	EvalDelay valuer.TextDuration `mapstructure:"eval_delay"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("ruler"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		EvalDelay: valuer.MustParseTextDuration("2m"),
	}
}

func (c Config) Validate() error {
	return nil
}
