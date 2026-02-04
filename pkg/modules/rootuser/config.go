package rootuser

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	minRootUserPasswordLength int = 12
)

type Config struct {
	Email    string `mapstructure:"email"`
	Password string `mapstructure:"password"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("rootuser"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Email:    "",
		Password: "",
	}
}

func (c Config) Validate() error {
	if c.Email != "" {
		_, err := valuer.NewEmail(c.Email)
		if err != nil {
			return errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed to validate rootuser::email %s", c.Email)
		}
	}

	if c.Password != "" {
		if len(c.Password) < minRootUserPasswordLength {
			return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "rootuser::password must be at least %d characters long", minRootUserPasswordLength)
		}
	}

	return nil
}

func (c Config) IsConfigured() bool {
	return c.Email != "" && c.Password != ""
}
