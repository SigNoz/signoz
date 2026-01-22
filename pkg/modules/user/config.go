package user

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	AllowSelfPasswordReset bool `mapstructure:"allow_self_password_reset"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("user"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		AllowSelfPasswordReset: false,
	}
}

func (c *Config) Validate() error {
	return nil
}
