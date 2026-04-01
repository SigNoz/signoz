package serviceaccount

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
)

type Config struct {
	// Email config for service accounts
	Email EmailConfig `mapstructure:"email"`

	// Analytics collection config for service accounts
	Analytics AnalyticsConfig `mapstructure:"analytics"`
}

type EmailConfig struct {
	Domain string `mapstructure:"domain"`
}

type AnalyticsConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("serviceaccount"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Email: EmailConfig{
			Domain: "signozserviceaccount.com",
		},
		Analytics: AnalyticsConfig{
			Enabled: true,
		},
	}
}

func (c Config) Validate() error {
	if c.Email.Domain == "" {
		return errors.New(errors.TypeInvalidInput, serviceaccounttypes.ErrCodeServiceAccountInvalidConfig, "email domain cannot be empty")
	}

	return nil
}
