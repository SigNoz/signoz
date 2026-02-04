package user

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	minRootUserPasswordLength = 12
)

type Config struct {
	Password       PasswordConfig `mapstructure:"password"`
	RootUserConfig RootUserConfig `mapstructure:"root"`
}
type PasswordConfig struct {
	Reset ResetConfig `mapstructure:"reset"`
}

type RootUserConfig struct {
	Email    string `mapstructure:"email"`
	Password string `mapstructure:"password"`
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
		Password: PasswordConfig{
			Reset: ResetConfig{
				AllowSelf:        false,
				MaxTokenLifetime: 6 * time.Hour,
			},
		},
		RootUserConfig: RootUserConfig{
			Email:    "",
			Password: "",
		},
	}
}

func (c Config) Validate() error {
	if c.Password.Reset.MaxTokenLifetime <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::password::reset::max_token_lifetime must be positive")
	}

	if c.RootUserConfig.Email != "" {
		_, err := valuer.NewEmail(c.RootUserConfig.Email)
		if err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to validate user::root::email %s", c.RootUserConfig.Email)
		}
	}

	if c.RootUserConfig.Password != "" {
		if len(c.RootUserConfig.Password) < minRootUserPasswordLength {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::root::password must be at least %d characters long", minRootUserPasswordLength)
		}
	}

	return nil
}

func (r RootUserConfig) IsConfigured() bool {
	return r.Email != "" && r.Password != ""
}
