package trustedheaderidentn

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"log/slog"
	"math"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/identn"
)

var (
	ErrCodeTrustedHeaderUntrusted        = errors.MustNewCode("trusted_header_untrusted_request")
	ErrCodeTrustedHeaderInvalidAssertion = errors.MustNewCode("trusted_header_invalid_assertion")
	ErrCodeTrustedHeaderSecretNoIdentity = errors.MustNewCode("trusted_header_secret_no_identity")
)

// trust establishes that a request genuinely came from the trusted proxy.
type trust interface {
	// Check returns nil when the request carries acceptable proof of provenance.
	// It must be free of I/O, because it is called from Test, and GetIdentity
	// also calls it directly, on the request's own goroutine, before doing any
	// of its own I/O.
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

// jwksFetchTimeout bounds a single JWKS fetch. go-oidc's RemoteKeySet fetches
// with http.DefaultClient when no client is attached to its context, and
// http.DefaultClient has no timeout; RemoteKeySet also stores
// context.WithoutCancel(ctx) internally, so the fetch cannot be cancelled
// from outside either. The request context reaching Email carries no
// deadline of its own: middleware.NewIdentN is registered before
// middleware.NewTimeout in pkg/query-service/app/server.go, and gorilla/mux
// wraps middleware in reverse registration order, which makes IdentN the
// outer handler, running before the timeout middleware ever attaches a
// deadline. Without an explicit client timeout, a JWKS endpoint that accepts
// a connection and then stops responding would pin a goroutine and a
// connection per request, with no self-healing.
const jwksFetchTimeout = 10 * time.Second

// jwtTrust verifies a signed assertion against a remote key set. Unlike
// secret mode, nothing an attacker can read from inside the cluster lets
// them forge one.
type jwtTrust struct {
	config identn.JWTTrustConfig
	logger *slog.Logger
	keySet *oidc.RemoteKeySet
}

// newJWTTrust takes ctx from the provider factory, which is process-lifetime
// rather than startup-scoped. That matters here only as a source of values,
// not for cancellation: go-oidc v3.17.0 stores context.WithoutCancel(ctx)
// internally (oidc/jwks.go), so a cancellable or deadlined ctx passed in
// would neither cancel background refreshes early nor leak them anyway.
// What ctx does carry, through oidc.ClientContext, is the HTTP client used
// for every fetch; that client has jwksFetchTimeout set precisely because
// the context mechanism cannot bound the fetch itself.
func newJWTTrust(ctx context.Context, logger *slog.Logger, config identn.JWTTrustConfig) *jwtTrust {
	client := &http.Client{Timeout: jwksFetchTimeout}

	return &jwtTrust{
		config: config,
		logger: logger,
		// JWKS refetch amplification: a kid miss or a signature that fails to
		// verify against the cached keys makes RemoteKeySet refetch the whole
		// set with no negative caching. In practice this is bounded to about
		// one fetch per round trip by RemoteKeySet's own inflight
		// singleflight, is inherent to every consumer of go-oidc's
		// RemoteKeySet (not specific to this provider), and the endpoint is
		// the operator's own proxy rather than attacker-controlled
		// infrastructure, so a negative cache is not worth building here.
		keySet: oidc.NewRemoteKeySet(oidc.ClientContext(ctx, client), config.JWKSURL),
	}
}

// Check verifies presence only, so it stays free of I/O as the IdentN
// contract requires. Signature verification happens in Email, which runs
// inside GetIdentity where I/O is allowed. A garbage assertion therefore
// still satisfies Check, and Test along with it; Email is where it is
// actually rejected.
func (t *jwtTrust) Check(req *http.Request) error {
	if len(req.Header.Values(t.config.AssertionHeader)) != 1 {
		return errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUntrusted, "request did not carry exactly one assertion header")
	}

	return nil
}

// CarriesIdentity reports that jwt mode carries its own verified identity
// claim; the configured email headers are not consulted. NameHeaders is a
// separate list from EmailHeaders, and extractDisplayName still reads it
// during auto-provisioning, so an authenticated caller can still choose
// their own display name. That is cosmetic, since they are authenticated as
// themselves either way, but it is not the same claim as "the configured
// headers are not consulted".
func (t *jwtTrust) CarriesIdentity() bool {
	return true
}

// Email verifies the assertion signature against the remote key set, checks
// issuer, audience, expiry and not-before, and returns the configured
// identity claim.
func (t *jwtTrust) Email(req *http.Request) (string, error) {
	values := req.Header.Values(t.config.AssertionHeader)
	if len(values) != 1 {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUntrusted, "request did not carry exactly one assertion header")
	}

	// VerifySignature parses with jose.ParseSigned(jwt, allAlgs), and allAlgs in
	// go-oidc v3.17.0 lists only asymmetric algorithms (RS/ES/PS/EdDSA); there is
	// no HMAC family and no "none". An HS256 token forged using the RSA public
	// key as an HMAC secret is rejected here, before any key is ever tried.
	payload, err := t.keySet.VerifySignature(req.Context(), values[0])
	if err != nil {
		// err.Error() is logged rather than attached to the returned error. It
		// can echo the caller's own "alg" header value, and on a JWKS fetch
		// failure go-oidc formats the endpoint's raw response body into it with
		// %s (oidc/jwks.go), which could carry an internal error page or a
		// stack trace. None of that belongs in a client-facing authentication
		// error. It does belong in the operator's log: a typo'd jwks_url, a
		// firewalled endpoint, a rotated key and a forged assertion all reach
		// the caller as this one error code, and this line is the only thing
		// that tells them apart.
		t.logger.WarnContext(req.Context(), "trusted-header assertion did not verify",
			slog.String("error", err.Error()),
		)

		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUntrusted, "assertion signature is not valid")
	}

	var claims struct {
		Issuer    string      `json:"iss"`
		Audience  jwtAudience `json:"aud"`
		Expiry    *float64    `json:"exp"`
		NotBefore *float64    `json:"nbf"`
	}

	// iss, aud and exp/nbf above are matched by encoding/json's own
	// case-insensitive fallback (a claim named "ISS" would still populate
	// Issuer), while the identity claim below is matched case-sensitively
	// through a map lookup. This is not exploitable: an exact-case match
	// always wins over a case-insensitive one when both are present in the
	// same JSON object, so a claim named exactly "iss" is never shadowed by
	// one named "Iss". It is still an asymmetry worth knowing about.
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion claims are not valid JSON")
	}

	if claims.Issuer != t.config.Issuer {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion issuer does not match")
	}

	if !claims.Audience.contains(t.config.Audience) {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion audience does not match")
	}

	// exp is decoded as *float64, not int64: RFC 7519 permits a NumericDate
	// with a fractional part, and a pointer distinguishes "claim absent" from
	// "claim present and zero", which a bare int64 cannot. exp stays
	// mandatory; nbf below does not, since RFC 7519 makes nbf optional.
	if claims.Expiry == nil || time.Now().After(numericDateToTime(*claims.Expiry)) {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion has expired or carries no expiry")
	}

	if claims.NotBefore != nil && time.Now().Before(numericDateToTime(*claims.NotBefore)) {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion is not yet valid")
	}

	// A second pass reads the identity claim from an untyped map. The standard
	// claims above need typed extraction anyway (jwtAudience's custom
	// UnmarshalJSON handles the string-or-array form from RFC 7519, and exp/nbf
	// need to be numbers), so decoding the identity claim from a map avoids
	// hard-coding every possible identity_claim name into the struct. Both
	// unmarshals run against the same in-memory payload already returned by
	// VerifySignature, so this is not a second round of I/O, only a second,
	// cheap decode of a small byte slice.
	var raw map[string]any
	if err := json.Unmarshal(payload, &raw); err != nil {
		return "", errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion claims are not valid JSON")
	}

	value, ok := raw[t.config.IdentityClaim].(string)
	if !ok || strings.TrimSpace(value) == "" {
		return "", errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderInvalidAssertion, "assertion does not carry a usable %q claim", t.config.IdentityClaim)
	}

	return strings.TrimSpace(value), nil
}

var _ trust = (*jwtTrust)(nil)

// numericDateToTime converts a JSON Numeric Date (RFC 7519 section 2), which
// may carry a fractional part, to a time.Time without losing that fraction.
func numericDateToTime(seconds float64) time.Time {
	whole := math.Trunc(seconds)
	frac := seconds - whole
	return time.Unix(int64(whole), int64(frac*float64(time.Second)))
}

// jwtAudience decodes the aud claim, which is either a string or an array of
// strings per RFC 7519.
type jwtAudience []string

func (a *jwtAudience) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		*a = jwtAudience{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return err
	}

	*a = jwtAudience(many)
	return nil
}

func (a jwtAudience) contains(want string) bool {
	return slices.Contains(a, want)
}
