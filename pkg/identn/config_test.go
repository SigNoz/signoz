package identn

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateRequiresTrustModeWhenEnabled(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true

	require.Error(t, c.Validate())
}

func TestValidateRejectsSecretModeWithoutSecret(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret

	require.Error(t, c.Validate())

	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	require.Error(t, c.Validate())

	c.TrustedHeader.Trust.Secret.Value = "s3cret"
	require.NoError(t, c.Validate())
}

func TestValidateRejectsImpersonationAlongsideTrustedHeader(t *testing.T) {
	c := newTestConfig()
	c.Impersonation.Enabled = true
	c.Tokenizer.Enabled = false
	c.APIKeyConfig.Enabled = false
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret
	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	c.TrustedHeader.Trust.Secret.Value = "s3cret"

	err := c.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "impersonation")
}

func TestValidateRejectsUnderscoreHeaderNames(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret
	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	c.TrustedHeader.Trust.Secret.Value = "s3cret"
	c.TrustedHeader.EmailHeaders = []string{"X_Forwarded_Email"}

	require.Error(t, c.Validate())
}

func TestValidateRejectsBadTrustedProxyCIDR(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret
	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	c.TrustedHeader.Trust.Secret.Value = "s3cret"
	c.TrustedHeader.TrustedProxies = []string{"not-a-cidr"}

	require.Error(t, c.Validate())
}

// net.ParseCIDR("10.0.0.5/24") silently discards the host bits and returns
// the network 10.0.0.0/24, so an operator intending to pin one address would
// otherwise get a 256-address allowlist without any error.
func TestValidateRejectsTrustedProxyCIDRWithHostBits(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret
	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	c.TrustedHeader.Trust.Secret.Value = "s3cret"
	c.TrustedHeader.TrustedProxies = []string{"10.0.0.5/24"}

	require.Error(t, c.Validate())
}

// A /32 sets no host bits, so pinning a single proxy address this way must
// keep working.
func TestValidateAcceptsSingleAddressTrustedProxyCIDR(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeSecret
	c.TrustedHeader.Trust.Secret.Header = "X-Proxy-Auth"
	c.TrustedHeader.Trust.Secret.Value = "s3cret"
	c.TrustedHeader.TrustedProxies = []string{"10.0.0.5/32"}

	require.NoError(t, c.Validate())
}

// The assertion header is the jwt-mode equivalent of the secret header: it
// must be checked for underscores too, not just the email and name headers.
func TestValidateRejectsJWTAssertionHeaderWithUnderscore(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeJWT
	c.TrustedHeader.Trust.JWT.JWKSURL = "https://idp.internal/keys"
	c.TrustedHeader.Trust.JWT.Issuer = "issuer"
	c.TrustedHeader.Trust.JWT.Audience = "audience"
	c.TrustedHeader.Trust.JWT.AssertionHeader = "Teleport_Jwt_Assertion"

	require.Error(t, c.Validate())
}

// An empty assertion header used to pass validation and then refuse every
// request at the trust check, since Header.Values("") matches nothing, with no
// error anywhere that named the cause.
func TestValidateRejectsEmptyJWTAssertionHeader(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeJWT
	c.TrustedHeader.Trust.JWT.JWKSURL = "https://idp.internal/keys"
	c.TrustedHeader.Trust.JWT.Issuer = "issuer"
	c.TrustedHeader.Trust.JWT.Audience = "audience"
	c.TrustedHeader.Trust.JWT.AssertionHeader = ""

	require.Error(t, c.Validate())
}

// url.Parse accepts almost anything, including a bare host-and-path string
// with no scheme, so the check must additionally require an absolute URL
// with a host rather than trusting url.Parse to fail on its own.
func TestValidateRejectsRelativeJWKSURL(t *testing.T) {
	c := newTestConfig()
	c.TrustedHeader.Enabled = true
	c.TrustedHeader.Trust.Mode = TrustModeJWT
	c.TrustedHeader.Trust.JWT.JWKSURL = "jwks.internal/keys"
	c.TrustedHeader.Trust.JWT.Issuer = "issuer"
	c.TrustedHeader.Trust.JWT.Audience = "audience"

	require.Error(t, c.Validate())
}

func newTestConfig() Config {
	return *newConfig().(*Config)
}
