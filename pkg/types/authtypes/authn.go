package authtypes

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeInvalidState = errors.MustNewCode("invalid_state")
)

type contextKey string

const StateSecretContextKey contextKey = "state_secret"

var (
	AuthNProviderGoogleAuth    = AuthNProvider{valuer.NewString("google_auth")}
	AuthNProviderSAML          = AuthNProvider{valuer.NewString("saml")}
	AuthNProviderEmailPassword = AuthNProvider{valuer.NewString("email_password")}
	AuthNProviderOIDC          = AuthNProvider{valuer.NewString("oidc")}
)

var (
	PrincipalUser           = Principal{valuer.NewString("user")}
	PrincipalServiceAccount = Principal{valuer.NewString("service_account")}
)

type AuthNProvider struct{ valuer.String }

type Principal struct{ valuer.String }

type Identity struct {
	UserID           valuer.UUID    `json:"userId"`
	ServiceAccountID valuer.UUID    `json:"serviceAccountId"`
	Principal        Principal      `json:"principal"`
	OrgID            valuer.UUID    `json:"orgId"`
	IdenNProvider    IdentNProvider `json:"identNProvider"`
	Email            valuer.Email   `json:"email"`
}

type CallbackIdentity struct {
	Name   string       `json:"name"`
	Email  valuer.Email `json:"email"`
	OrgID  valuer.UUID  `json:"orgId"`
	State  State        `json:"state"`
	Groups []string     `json:"groups,omitempty"`
	Role   string       `json:"role,omitempty"`
}

type State struct {
	DomainID valuer.UUID
	URL      *url.URL
}

func NewState(siteURL *url.URL, domainID valuer.UUID) State {
	u := &url.URL{
		Scheme: siteURL.Scheme,
		Host:   siteURL.Host,
		Path:   siteURL.Path,
		RawQuery: url.Values{
			"domain_id": {newDomainIDForState(domainID)},
		}.Encode(),
	}

	return State{
		DomainID: domainID,
		URL:      u,
	}
}

func NewStateWithSignature(siteURL *url.URL, domainID valuer.UUID, secret string) State {
	u := &url.URL{
		Scheme: siteURL.Scheme,
		Host:   siteURL.Host,
		Path:   siteURL.Path,
		RawQuery: url.Values{
			"domain_id": {newDomainIDForState(domainID)},
			"signature": {signState(siteURL, domainID, secret)},
		}.Encode(),
	}

	return State{
		DomainID: domainID,
		URL:      u,
	}
}

func NewStateFromString(state string) (State, error) {
	u, err := url.Parse(state)
	if err != nil {
		return State{}, err
	}

	domainID, err := newDomainIDFromState(u.Query().Get("domain_id"))
	if err != nil {
		return State{}, err
	}

	return State{
		DomainID: domainID,
		URL:      u,
	}, nil
}

func NewStateFromStringWithVerification(state string, secret string) (State, error) {
	u, err := url.Parse(state)
	if err != nil {
		return State{}, err
	}

	domainID, err := newDomainIDFromState(u.Query().Get("domain_id"))
	if err != nil {
		return State{}, err
	}

	signature := u.Query().Get("signature")
	if signature == "" {
		return State{}, errors.New(errors.TypeInvalidInput, ErrCodeInvalidState, "missing state signature")
	}

	if !verifyStateSignature(u.Scheme+"://"+u.Host+u.Path, domainID, secret, signature) {
		return State{}, errors.New(errors.TypeInvalidInput, ErrCodeInvalidState, "invalid state signature")
	}

	return State{
		DomainID: domainID,
		URL:      u,
	}, nil
}

func NewIdentity(userID valuer.UUID, serviceAccountID valuer.UUID, principal Principal, orgID valuer.UUID, email valuer.Email, identNProvider IdentNProvider) *Identity {
	return &Identity{
		UserID:           userID,
		ServiceAccountID: serviceAccountID,
		Principal:        principal,
		OrgID:            orgID,
		Email:            email,
		IdenNProvider:    identNProvider,
	}
}

func NewPrincipalUserIdentity(userID valuer.UUID, orgID valuer.UUID, email valuer.Email, identNProvider IdentNProvider) *Identity {
	return &Identity{
		UserID:        userID,
		Principal:     PrincipalUser,
		OrgID:         orgID,
		Email:         email,
		IdenNProvider: identNProvider,
	}
}

func NewPrincipalServiceAccountIdentity(serviceAccountID valuer.UUID, orgID valuer.UUID, email valuer.Email, identNProvider IdentNProvider) *Identity {
	return &Identity{
		ServiceAccountID: serviceAccountID,
		Principal:        PrincipalServiceAccount,
		OrgID:            orgID,
		Email:            email,
		IdenNProvider:    identNProvider,
	}
}

func NewCallbackIdentity(name string, email valuer.Email, orgID valuer.UUID, state State, groups []string, role string) *CallbackIdentity {
	return &CallbackIdentity{
		Name:   name,
		Email:  email,
		OrgID:  orgID,
		State:  state,
		Groups: groups,
		Role:   role,
	}
}

func newDomainIDForState(domainID valuer.UUID) string {
	return strings.ReplaceAll(domainID.String(), "-", ":")
}

func newDomainIDFromState(state string) (valuer.UUID, error) {
	return valuer.NewUUID(strings.ReplaceAll(state, ":", "-"))
}

func (typ Identity) MarshalBinary() ([]byte, error) {
	return json.Marshal(typ)
}

func (typ *Identity) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, typ)
}

func (typ *Identity) ToClaims() Claims {
	return Claims{
		UserID:           typ.UserID.String(),
		ServiceAccountID: typ.ServiceAccountID.String(),
		Principal:        typ.Principal,
		Email:            typ.Email.String(),
		OrgID:            typ.OrgID.String(),
		IdentNProvider:   typ.IdenNProvider,
	}
}

func (AuthNProvider) Enum() []any {
	return []any{
		AuthNProviderGoogleAuth,
		AuthNProviderSAML,
		AuthNProviderEmailPassword,
		AuthNProviderOIDC,
	}
}

type AuthNStore interface {
	// Get user and factor password by email and orgID.
	GetActiveUserAndFactorPasswordByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*types.User, *types.FactorPassword, []*UserRole, error)

	// Get org domain from id.
	GetAuthDomainFromID(ctx context.Context, domainID valuer.UUID) (*AuthDomain, error)
}

func signState(siteURL *url.URL, domainID valuer.UUID, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(siteURL.Scheme + "://" + siteURL.Host + siteURL.Path))
	h.Write([]byte(domainID.String()))
	return hex.EncodeToString(h.Sum(nil))
}

func verifyStateSignature(urlStr string, domainID valuer.UUID, secret string, signature string) bool {
	expected := signState(&url.URL{Scheme: "https", Host: "localhost"}, domainID, secret)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(urlStr))
	h.Write([]byte(domainID.String()))
	expected = hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}
