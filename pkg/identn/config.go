package identn

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Config for tokenizer identN resolver
	Tokenizer TokenizerConfig `mapstructure:"tokenizer"`

	// Config for apikey identN resolver
	APIKeyConfig APIKeyConfig `mapstructure:"apikey"`

	// Config for impersonation identN resolver
	Impersonation ImpersonationConfig `mapstructure:"impersonation"`

	// Config for trusted-header identN resolver
	TrustedHeader TrustedHeaderConfig `mapstructure:"trusted_header"`
}

type ImpersonationConfig struct {
	// Toggles the identN resolver
	Enabled bool `mapstructure:"enabled"`
}

type TokenizerConfig struct {
	// Toggles the identN resolver
	Enabled bool `mapstructure:"enabled"`

	// Headers to extract from incoming requests
	Headers []string `mapstructure:"headers"`
}

type APIKeyConfig struct {
	// Toggles the identN resolver
	Enabled bool `mapstructure:"enabled"`

	// Headers to extract from incoming requests
	Headers []string `mapstructure:"headers"`
}

type TrustedHeaderConfig struct {
	// Toggles the identN resolver. Defaults to false. Only enable when SigNoz is
	// deployed behind a reverse proxy that strips client-supplied headers and injects
	// its own (e.g., Authentik forward-auth, oauth2-proxy). Otherwise any client can
	// forge identity by setting the header.
	Enabled bool `mapstructure:"enabled"`

	// EmailHeaders is the request header that carries the authenticated user's email.
	// Defaults to "X-Forwarded-Email" (the de-facto convention for oauth2-proxy and
	// similar). Authentik users typically set this to "X-Authentik-Email".
	EmailHeaders []string `mapstructure:"email_headers"`

	// NameHeaders is optional; used during auto-provisioning to populate the user's
	// display name. Falls back to the email local-part when not set or empty.
	NameHeaders []string `mapstructure:"name_headers"`

	// AutoProvision controls whether unknown emails get a user record auto-created
	// with role Viewer in the request's organization. When false, requests with
	// unknown emails return 401. Default false (operators opt in explicitly).
	AutoProvision bool `mapstructure:"auto_provision"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("identn"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Tokenizer: TokenizerConfig{
			Enabled: true,
			Headers: []string{"Authorization", "Sec-WebSocket-Protocol"},
		},
		APIKeyConfig: APIKeyConfig{
			Enabled: true,
			Headers: []string{"SIGNOZ-API-KEY"},
		},
		Impersonation: ImpersonationConfig{
			Enabled: false,
		},
		TrustedHeader: TrustedHeaderConfig{
			Enabled:      false,
			EmailHeaders: []string{"X-Forwarded-Email"},
		},
	}
}

func (c Config) Validate() error {
	if c.Impersonation.Enabled {
		if c.Tokenizer.Enabled {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::impersonation cannot be enabled if identn::tokenizer is enabled")
		}

		if c.APIKeyConfig.Enabled {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::impersonation cannot be enabled if identn::apikey is enabled")
		}
	}

	if c.TrustedHeader.Enabled && len(c.TrustedHeader.EmailHeaders) == 0 {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::email_headers is required when identn::trusted_header is enabled")
	}

	return nil
}
