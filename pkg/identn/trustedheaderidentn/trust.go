package trustedheaderidentn

import (
	"crypto/sha256"
	"crypto/subtle"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/identn"
)

var (
	ErrCodeTrustedHeaderUntrusted        = errors.MustNewCode("trusted_header_untrusted_request")
	ErrCodeTrustedHeaderSecretNoIdentity = errors.MustNewCode("trusted_header_secret_no_identity")
)

// trust establishes that a request genuinely came from the trusted proxy.
type trust interface {
	// Check returns nil when the request carries acceptable proof of provenance.
	// It must be free of I/O, because it is called from Test.
	Check(req *http.Request) error

	// CarriesIdentity reports whether the proof itself carries the user's
	// identity, in which case the configured email headers are not consulted. It
	// is a property of the mode, so it needs no request and performs no I/O.
	CarriesIdentity() bool

	// Email returns the identity the proof carries. It is only called when
	// CarriesIdentity reports true, and only from GetIdentity, so it may perform
	// I/O such as fetching a key set.
	Email(req *http.Request) (string, error)
}

type secretTrust struct {
	config identn.SecretTrustConfig
}

func newSecretTrust(config identn.SecretTrustConfig) *secretTrust {
	return &secretTrust{config: config}
}

// Check compares the secret in constant time so a failure reveals nothing about
// how much of the secret matched. Comparing fixed-width SHA-256 digests rather
// than the raw values keeps the comparison constant time in the secret's
// length as well as its contents: ConstantTimeCompare itself short-circuits
// on unequal-length inputs, so comparing the raw values directly would leak
// the secret's length through timing.
func (t *secretTrust) Check(req *http.Request) error {
	values := req.Header.Values(t.config.Header)
	if len(values) != 1 {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUntrusted, "request did not carry exactly one proxy secret header")
	}

	got := sha256.Sum256([]byte(values[0]))
	want := sha256.Sum256([]byte(t.config.Value))

	if subtle.ConstantTimeCompare(got[:], want[:]) != 1 {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUntrusted, "proxy secret did not match")
	}

	return nil
}

// CarriesIdentity reports that secret mode carries no identity of its own; the
// configured email headers remain authoritative.
func (t *secretTrust) CarriesIdentity() bool {
	return false
}

// Email is never called for secret mode: CarriesIdentity reports false, and
// GetIdentity only calls Email when CarriesIdentity is true.
func (t *secretTrust) Email(_ *http.Request) (string, error) {
	return "", errors.New(errors.TypeInternal, ErrCodeTrustedHeaderSecretNoIdentity, "secret mode carries no identity of its own")
}

var _ trust = (*secretTrust)(nil)
