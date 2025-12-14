package authtypes

import (
	"context"
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

var (
	AuthNProviderGoogleAuth    = AuthNProvider{valuer.NewString("google_auth")}
	AuthNProviderSAML          = AuthNProvider{valuer.NewString("saml")}
	AuthNProviderEmailPassword = AuthNProvider{valuer.NewString("email_password")}
	AuthNProviderOIDC          = AuthNProvider{valuer.NewString("oidc")}
)

type AuthNProvider struct{ valuer.String }

type Identity struct {
	UserID valuer.UUID  `json:"userId"`
	OrgID  valuer.UUID  `json:"orgId"`
	Email  valuer.Email `json:"email"`
	Role   types.Role   `json:"role"`
}

type CallbackIdentity struct {
	Name  string       `json:"name"`
	Email valuer.Email `json:"email"`
	OrgID valuer.UUID  `json:"orgId"`
	State State        `json:"state"`
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

func NewIdentity(userID valuer.UUID, orgID valuer.UUID, email valuer.Email, role types.Role) *Identity {
	return &Identity{
		UserID: userID,
		OrgID:  orgID,
		Email:  email,
		Role:   role,
	}
}

func NewCallbackIdentity(name string, email valuer.Email, orgID valuer.UUID, state State) *CallbackIdentity {
	return &CallbackIdentity{
		Name:  name,
		Email: email,
		OrgID: orgID,
		State: state,
	}
}

func newDomainIDForState(domainID valuer.UUID) string {
	return strings.Replace(domainID.String(), "-", ":", -1)
}

func newDomainIDFromState(state string) (valuer.UUID, error) {
	return valuer.NewUUID(strings.Replace(state, ":", "-", -1))
}

func (typ Identity) MarshalBinary() ([]byte, error) {
	return json.Marshal(typ)
}

func (typ *Identity) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, typ)
}

func (typ *Identity) ToClaims() Claims {
	return Claims{
		UserID: typ.UserID.String(),
		Email:  typ.Email.String(),
		Role:   typ.Role,
		OrgID:  typ.OrgID.String(),
	}
}

type AuthNStore interface {
	// Get user and factor password by email and orgID.
	GetUserAndFactorPasswordByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*types.User, *types.FactorPassword, error)

	// Get org domain from id.
	GetAuthDomainFromID(ctx context.Context, domainID valuer.UUID) (*AuthDomain, error)
}
