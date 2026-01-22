package user

import "github.com/SigNoz/signoz/pkg/factory"

type Config struct {
	AllowUserSelfPasswordReset bool `mapstructure:"allow_user_self_password_reset"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("user"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		AllowUserSelfPasswordReset: false,
	}
}

func (c *Config) Validate() error {
	return nil
}
