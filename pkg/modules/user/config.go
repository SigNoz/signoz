package user

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	AllowSelfPasswordReset     bool          `mapstructure:"allow_self_password_reset"`
	PasswordResetTokenValidity time.Duration `mapstructure:"password_reset_token_validity"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("user"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		AllowSelfPasswordReset:     false,
		PasswordResetTokenValidity: 6 * time.Hour,
	}
}

func (c Config) Validate() error {
	if c.PasswordResetTokenValidity <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "password_reset_token_validity must be positive")
	}

	return nil
}
