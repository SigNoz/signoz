package trustedheaderidentn

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"log/slog"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
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

// newJWKSFixture generates an RSA key, serves its public half from an
// httptest server in JWKS form, and returns the private key plus that
// server's URL and key ID so tests can both sign assertions and configure a
// jwtTrust to verify them.
func newJWKSFixture(t *testing.T) (*rsa.PrivateKey, string, string) {
	t.Helper()

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	jwk := map[string]any{
		"kty": "RSA",
		"kid": "test-key",
		"alg": "RS256",
		"use": "sig",
		"n":   base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
		"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(map[string]any{"keys": []any{jwk}}))
	}))
	t.Cleanup(server.Close)

	return key, server.URL, "test-key"
}

func signAssertion(t *testing.T, key *rsa.PrivateKey, kid string, claims jwt.MapClaims) string {
	t.Helper()

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = kid

	signed, err := token.SignedString(key)
	require.NoError(t, err)

	return signed
}

func newTestJWTTrust(t *testing.T, jwksURL string) *jwtTrust {
	t.Helper()

	checker, _ := newTestJWTTrustWithLogs(t, jwksURL)

	return checker
}

// newTestJWTTrustWithLogs also returns the checker's log output, so a test can
// assert on what an operator would actually see.
func newTestJWTTrustWithLogs(t *testing.T, jwksURL string) (*jwtTrust, *bytes.Buffer) {
	t.Helper()

	logs := &bytes.Buffer{}

	checker := newJWTTrust(context.Background(), slog.New(slog.NewTextHandler(logs, nil)), identn.JWTTrustConfig{
		AssertionHeader: "Teleport-Jwt-Assertion",
		JWKSURL:         jwksURL,
		Issuer:          "https://teleport.example",
		Audience:        "signoz",
		IdentityClaim:   "sub",
	})

	return checker, logs
}

// Every verification failure reaches the caller as the same opaque code, so
// this log line is the only thing that separates a forged assertion from a
// JWKS endpoint the operator cannot reach. It has to carry the reason, not
// just the fact.
func TestJWTTrustLogsWhyVerificationFailed(t *testing.T) {
	checker, logs := newTestJWTTrustWithLogs(t, "http://127.0.0.1:1/jwks.json")

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", "not.a.jwt")

	_, err := checker.Email(req)
	require.Error(t, err)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUntrusted))

	assert.Contains(t, logs.String(), "trusted-header assertion did not verify")
	assert.Contains(t, logs.String(), "error=")
}

func TestJWTTrustAcceptsValidAssertion(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	assertion := signAssertion(t, key, kid, jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": "signoz",
		"sub": "alice@example.com",
		"exp": time.Now().Add(time.Minute).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", assertion)

	require.NoError(t, checker.Check(req))

	email, err := checker.Email(req)
	require.NoError(t, err)
	assert.Equal(t, "alice@example.com", email)
}

// TestJWTTrustAcceptsAudienceArrayClaim pins RFC 7519's allowance of aud as
// either a single string or an array of strings: a proxy that lists more than
// one intended audience must not be refused just because signoz is not the
// first entry.
func TestJWTTrustAcceptsAudienceArrayClaim(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	assertion := signAssertion(t, key, kid, jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": []string{"other", "signoz"},
		"sub": "alice@example.com",
		"exp": time.Now().Add(time.Minute).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", assertion)

	require.NoError(t, checker.Check(req))

	email, err := checker.Email(req)
	require.NoError(t, err)
	assert.Equal(t, "alice@example.com", email)
}

// TestJWTTrustRejectsBadAssertions asserts, per case, the specific error code
// the failing validation step is expected to produce: ErrCodeTrustedHeaderUntrusted
// for a proof-of-provenance failure (bad or unverifiable signature), and
// ErrCodeTrustedHeaderInvalidAssertion for a claim-level failure once the
// signature itself checked out (issuer, audience, expiry, not-before, or the
// identity claim). Asserting a single shared code for every case would let a
// bug that swapped, say, the issuer and audience branches pass unnoticed.
func TestJWTTrustRejectsBadAssertions(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)
	otherKey, _, _ := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	valid := jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": "signoz",
		"sub": "alice@example.com",
		"exp": time.Now().Add(time.Minute).Unix(),
	}

	cases := []struct {
		name      string
		assertion string
		wantCode  errors.Code
	}{
		{"wrong issuer", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://evil.example", "aud": "signoz", "sub": "alice@example.com", "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"wrong audience", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "other", "sub": "alice@example.com", "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"expired", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": "alice@example.com", "exp": time.Now().Add(-time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"missing exp", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": "alice@example.com"}), ErrCodeTrustedHeaderInvalidAssertion},
		{"future nbf", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": "alice@example.com", "nbf": time.Now().Add(time.Minute).Unix(), "exp": time.Now().Add(time.Hour).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"missing claim", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"non-string claim", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": 12345, "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"empty string claim", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": "", "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"object claim", signAssertion(t, key, kid, jwt.MapClaims{"iss": "https://teleport.example", "aud": "signoz", "sub": map[string]any{"id": "alice"}, "exp": time.Now().Add(time.Minute).Unix()}), ErrCodeTrustedHeaderInvalidAssertion},
		{"unknown key", signAssertion(t, otherKey, kid, valid), ErrCodeTrustedHeaderUntrusted},
		{"not a jwt", "garbage", ErrCodeTrustedHeaderUntrusted},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set("Teleport-Jwt-Assertion", tc.assertion)

			// Check only counts assertion headers, so it must pass for every
			// case here: if it ever started rejecting one of these inputs,
			// the subtest below would pass having exercised nothing. Assert
			// this loudly rather than silently skipping past it.
			require.NoError(t, checker.Check(req))

			_, err := checker.Email(req)
			require.Error(t, err)
			assert.True(t, errors.Asc(err, tc.wantCode), "expected code %v, got %v", tc.wantCode, err)
		})
	}
}

// TestJWTTrustAcceptsFractionalExpiry pins RFC 7519's NumericDate, which
// permits a fractional number of seconds. exp is decoded as *float64 rather
// than int64 precisely so a proxy that emits "1700000000.5" is not rejected
// with a confusing "claims are not valid JSON" error.
func TestJWTTrustAcceptsFractionalExpiry(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	expiry := float64(time.Now().Add(time.Minute).Unix()) + 0.5

	assertion := signAssertion(t, key, kid, jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": "signoz",
		"sub": "alice@example.com",
		"exp": expiry,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", assertion)

	require.NoError(t, checker.Check(req))

	email, err := checker.Email(req)
	require.NoError(t, err)
	assert.Equal(t, "alice@example.com", email)
}

// TestJWTTrustRejectsHS256AlgorithmConfusion constructs the classic
// algorithm-confusion attack: a token signed HS256 using the RSA public key's
// PEM encoding as the HMAC secret, which is exactly what an attacker inside
// the cluster could compute since the public key is, by definition, public.
// coreos/go-oidc's RemoteKeySet.VerifySignature parses with go-jose's
// jose.ParseSigned(jwt, allAlgs), and allAlgs in go-oidc v3.17.0 lists only
// asymmetric algorithms, so this must be rejected before any key is ever
// tried. If this test does not fail to verify, the whole premise of jwt mode
// (that header forgery becomes irrelevant, not merely blocked) is unsound.
func TestJWTTrustRejectsHS256AlgorithmConfusion(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	pubDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	require.NoError(t, err)
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubDER})

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": "signoz",
		"sub": "alice@example.com",
		"exp": time.Now().Add(time.Minute).Unix(),
	})
	token.Header["kid"] = kid

	forged, err := token.SignedString(pubPEM)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", forged)

	require.NoError(t, checker.Check(req))

	_, err = checker.Email(req)
	require.Error(t, err)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUntrusted))
}

func TestJWTTrustRejectsAbsentAssertion(t *testing.T) {
	_, jwksURL, _ := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	assert.Error(t, checker.Check(httptest.NewRequest(http.MethodGet, "/", nil)))
}

// TestJWTTrustEmailFailsOnGarbageEvenWhenCheckPasses pins the deliberate
// asymmetry between Check and Email: Check only counts assertion headers, so
// a garbage assertion still satisfies it, and Email is where the assertion is
// actually verified. That is correct behaviour, not a bug: Check must stay
// free of I/O because it is called from Test, so it cannot verify a
// signature. Nobody should "fix" this by moving verification into Check.
func TestJWTTrustEmailFailsOnGarbageEvenWhenCheckPasses(t *testing.T) {
	_, jwksURL, _ := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", "garbage")

	require.NoError(t, checker.Check(req))

	_, err := checker.Email(req)
	assert.Error(t, err)
}

func TestJWTTrustCarriesIdentityIsTrue(t *testing.T) {
	_, jwksURL, _ := newJWKSFixture(t)
	checker := newTestJWTTrust(t, jwksURL)

	assert.True(t, checker.CarriesIdentity())
}
