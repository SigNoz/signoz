package trustedheaderidentn

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/identn"
)

func TestSecretTrustAcceptsMatchingSecret(t *testing.T) {
	checker := newSecretTrust(identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Proxy-Auth", "s3cret")

	require.NoError(t, checker.Check(req))
}

func TestSecretTrustRejectsWrongAbsentAndShortSecret(t *testing.T) {
	checker := newSecretTrust(identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"})

	for name, value := range map[string]string{
		"wrong":   "wrong",
		"absent":  "",
		"shorter": "s3cre",
		"longer":  "s3cret-extra",
	} {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if value != "" {
				req.Header.Set("X-Proxy-Auth", value)
			}

			assert.Error(t, checker.Check(req))
		})
	}
}

func TestSecretTrustRejectsDuplicateSecretHeaderValues(t *testing.T) {
	checker := newSecretTrust(identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Add("X-Proxy-Auth", "s3cret")
	req.Header.Add("X-Proxy-Auth", "s3cret")

	assert.Error(t, checker.Check(req))
}

// secret mode never carries the identity itself: the configured email
// headers stay authoritative, and GetIdentity must keep consulting them.
func TestSecretTrustCarriesIdentityIsFalse(t *testing.T) {
	checker := newSecretTrust(identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"})

	assert.False(t, checker.CarriesIdentity())
}

// Email is never expected to be called in secret mode, since CarriesIdentity
// reports false, but it must still fail safe rather than silently return an
// identity if it ever is.
func TestSecretTrustEmailReturnsError(t *testing.T) {
	checker := newSecretTrust(identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	email, err := checker.Email(req)

	assert.Error(t, err)
	assert.Empty(t, email)
}
