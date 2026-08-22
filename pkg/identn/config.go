package identn

import (
	"net"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/valuer"
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

var (
	TrustModeJWT    = TrustMode{valuer.NewString("jwt")}
	TrustModeSecret = TrustMode{valuer.NewString("secret")}
)

// TrustMode selects how the provider establishes that a request genuinely came
// from the trusted proxy. There is deliberately no mode that trusts network
// placement alone.
type TrustMode struct{ valuer.String }

func (TrustMode) Enum() []any {
	return []any{TrustModeJWT, TrustModeSecret}
}

type TrustConfig struct {
	// Mode is required when the trusted-header resolver is enabled.
	Mode TrustMode `mapstructure:"mode"`

	JWT    JWTTrustConfig    `mapstructure:"jwt"`
	Secret SecretTrustConfig `mapstructure:"secret"`
}

type JWTTrustConfig struct {
	// AssertionHeader carries the signed assertion. Defaults to the header
	// Teleport injects and always overwrites.
	AssertionHeader string `mapstructure:"assertion_header"`

	// JWKSURL is the endpoint publishing the signing keys.
	JWKSURL string `mapstructure:"jwks_url"`

	Issuer   string `mapstructure:"issuer"`
	Audience string `mapstructure:"audience"`

	// IdentityClaim names the claim carrying the user's email.
	IdentityClaim string `mapstructure:"identity_claim"`
}

type SecretTrustConfig struct {
	// Header carries a secret only the proxy knows.
	Header string `mapstructure:"header"`

	// Value is compared in constant time. It appears in the debug-level config
	// dump at pkg/signoz/signoz.go:187, in common with the SMTP and Redis
	// passwords, so treat it as readable by anyone who can read those logs.
	// jwt mode needs no shared secret at all.
	Value string `mapstructure:"value"`
}

type TrustedHeaderConfig struct {
	// Toggles the identN resolver. Defaults to false. Only enable when SigNoz is
	// deployed behind a reverse proxy that strips client-supplied headers and injects
	// its own (e.g., Authentik forward-auth, oauth2-proxy). Otherwise any client can
	// forge identity by setting the header.
	Enabled bool `mapstructure:"enabled"`

	// Trust selects and configures how proxy provenance is established.
	Trust TrustConfig `mapstructure:"trust"`

	// EmailHeaders carry the authenticated user's email. Ignored in jwt mode,
	// where the email comes from a verified claim. Defaults to
	// "X-Forwarded-Email" (the de-facto convention for oauth2-proxy and similar).
	// Authentik users typically set this to "X-Authentik-Email".
	EmailHeaders []string `mapstructure:"email_headers"`

	// NameHeaders is optional; used during auto-provisioning to populate the user's
	// display name. Falls back to the email local-part when not set or empty.
	NameHeaders []string `mapstructure:"name_headers"`

	// AutoProvision controls whether unknown emails get a user record auto-created
	// with role Viewer in the request's organization. When false, requests with
	// unknown emails return 401. Default false (operators opt in explicitly).
	AutoProvision bool `mapstructure:"auto_provision"`

	// TrustedProxies optionally restricts the peer address. Defence in depth
	// only: in Kubernetes every pod shares the pod CIDR, so this cannot
	// distinguish the proxy from any other pod. It is never the only control.
	TrustedProxies []string `mapstructure:"trusted_proxies"`

	// LogoutRedirectURL, when set, is where the UI sends a user on logout so the
	// proxy session ends too.
	LogoutRedirectURL string `mapstructure:"logout_redirect_url"`
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
			Trust: TrustConfig{
				JWT: JWTTrustConfig{
					AssertionHeader: "Teleport-Jwt-Assertion",
					IdentityClaim:   "sub",
				},
			},
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

	if c.TrustedHeader.Enabled {
		if c.Impersonation.Enabled {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header cannot be enabled if identn::impersonation is enabled")
		}

		switch c.TrustedHeader.Trust.Mode {
		case TrustModeSecret:
			if c.TrustedHeader.Trust.Secret.Header == "" || c.TrustedHeader.Trust.Secret.Value == "" {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trust::secret requires both header and value")
			}

			if len(c.TrustedHeader.EmailHeaders) == 0 {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::email_headers is required in secret mode")
			}
		case TrustModeJWT:
			// An empty assertion_header is not merely incomplete config: the
			// trust check reads the header by name, and Header.Values("") never
			// matches, so every request would be refused with nothing to say why.
			if c.TrustedHeader.Trust.JWT.AssertionHeader == "" || c.TrustedHeader.Trust.JWT.JWKSURL == "" || c.TrustedHeader.Trust.JWT.Issuer == "" || c.TrustedHeader.Trust.JWT.Audience == "" {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trust::jwt requires assertion_header, jwks_url, issuer and audience")
			}

			parsedJWKSURL, err := url.Parse(c.TrustedHeader.Trust.JWT.JWKSURL)
			if err != nil || !parsedJWKSURL.IsAbs() || parsedJWKSURL.Host == "" {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trust::jwt::jwks_url is not a valid URL")
			}

			if c.TrustedHeader.Trust.JWT.IdentityClaim == "" {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trust::jwt::identity_claim is required")
			}
		default:
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trust::mode must be one of jwt, secret")
		}

		headers := append(append([]string{}, c.TrustedHeader.EmailHeaders...), c.TrustedHeader.NameHeaders...)
		switch c.TrustedHeader.Trust.Mode {
		case TrustModeSecret:
			headers = append(headers, c.TrustedHeader.Trust.Secret.Header)
		case TrustModeJWT:
			headers = append(headers, c.TrustedHeader.Trust.JWT.AssertionHeader)
		}

		for _, header := range headers {
			if strings.Contains(header, "_") {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "header name %q must not contain an underscore: common reverse proxies (e.g. nginx) silently drop such headers, so SigNoz refuses to boot rather than trust a header that may never arrive; choose a name using hyphens instead", header)
			}
		}

		for _, cidr := range c.TrustedHeader.TrustedProxies {
			addr, network, err := net.ParseCIDR(cidr)
			if err != nil {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trusted_proxies entry %q is not a valid CIDR", cidr)
			}

			if !addr.Equal(network.IP) {
				return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::trusted_proxies entry %q sets host bits, which would silently widen the range to %s; write the network address instead", cidr, network.String())
			}
		}

		if c.TrustedHeader.LogoutRedirectURL != "" {
			parsed, err := url.Parse(c.TrustedHeader.LogoutRedirectURL)
			if err != nil || !parsed.IsAbs() {
				return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "identn::trusted_header::logout_redirect_url must be an absolute URL")
			}
		}
	}

	return nil
}
