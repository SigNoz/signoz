package sharder

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Config struct {
	Enabled bool   `mapstructure:"enabled"`
	Single  Single `mapstructure:"single"`
}

type Single struct {
	OrgID valuer.UUID `mapstructure:"org_id"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sharder"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Enabled: false,
	}
}

func (c Config) Validate() error {
	return nil
}

func (c Config) Provider() string {
	if c.Enabled {
		return "single"
	}

	return "noop"
}
