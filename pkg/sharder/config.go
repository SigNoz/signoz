package sharder

import (
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Config struct {
	Provider string `mapstructure:"provider"`
	Single   Single `mapstructure:"single"`
}

type Single struct {
	OrgID valuer.UUID `mapstructure:"org_id"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sharder"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "noop",
		Single: Single{
			OrgID: valuer.UUID{},
		},
	}
}

func (c Config) Validate() error {
	return nil
}
