package user

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	Auth AuthConfig `mapstructure:"auth"`
}

type AuthConfig struct {
	Password PasswordConfig `mapstructure:"password"`
}

type PasswordConfig struct {
	Reset ResetConfig `mapstructure:"reset"`
}

type ResetConfig struct {
	AllowSelf        bool          `mapstructure:"allow_self"`
	MaxTokenLifetime time.Duration `mapstructure:"max_token_lifetime"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("user"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Auth: AuthConfig{
			Password: PasswordConfig{
				Reset: ResetConfig{
					AllowSelf:        false,
					MaxTokenLifetime: 6 * time.Hour,
				},
			},
		},
	}
}

func (c Config) Validate() error {
	if c.Auth.Password.Reset.MaxTokenLifetime <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "auth::password::reset::max_token_lifetime must be positive")
	}

	return nil
}
