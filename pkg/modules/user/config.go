package user

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Config struct {
	Password PasswordConfig `mapstructure:"password"`
	Root     RootConfig     `mapstructure:"root"`
}

type RootConfig struct {
	Enabled  bool         `mapstructure:"enabled"`
	Email    valuer.Email `mapstructure:"email"`
	Password string       `mapstructure:"password"`
	Org      OrgConfig    `mapstructure:"org"`
}

type OrgConfig struct {
	Name string `mapstructure:"name"`
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
		Password: PasswordConfig{
			Reset: ResetConfig{
				AllowSelf:        false,
				MaxTokenLifetime: 6 * time.Hour,
			},
		},
		Root: RootConfig{
			Enabled: false,
			Org: OrgConfig{
				Name: "default",
			},
		},
	}
}

func (c Config) Validate() error {
	if c.Password.Reset.MaxTokenLifetime <= 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::password::reset::max_token_lifetime must be positive")
	}

	if c.Root.Enabled {
		if c.Root.Email.IsZero() {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::root::email is required when root user is enabled")
		}
		if c.Root.Password == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::root::password is required when root user is enabled")
		}
		if !types.IsPasswordValid(c.Root.Password) {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user::root::password does not meet password requirements")
		}
	}

	return nil
}
