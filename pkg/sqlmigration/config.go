package sqlmigration

import (
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct{}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlmigration"), newConfig)
}

func newConfig() factory.Config {
	return Config{}
}

func (c Config) Validate() error {
	return nil
}
