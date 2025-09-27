package authtypes

import (
	"context"
	"encoding/json"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AuthNProviderGoogle        = AuthNProvider{valuer.NewString("google")}
	AuthNProviderGoogleAuth    = AuthNProvider{valuer.NewString("google_auth")} // Same as Google, to be removed after users are migrated to google
	AuthNProviderSAML          = AuthNProvider{valuer.NewString("saml")}
	AuthNProviderEmailPassword = AuthNProvider{valuer.NewString("email_password")}
)

type AuthNProvider struct{ valuer.String }

type Identity struct {
	UserID valuer.UUID `json:"userId"`
	OrgID  valuer.UUID `json:"orgId"`
	Email  string      `json:"email"`
	Role   types.Role  `json:"role"`
}

type CallbackIdentity struct {
	Name  string      `json:"name"`
	Email string      `json:"email"`
	OrgID valuer.UUID `json:"orgId"`
	State State       `json:"state"`
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
			"domain_id": {strings.Replace(domainID.String(), "-", ":", -1)},
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

	domainID, err := valuer.NewUUID(u.Query().Get("domain_id"))
	if err != nil {
		return State{}, err
	}

	return State{
		DomainID: domainID,
		URL:      u,
	}, nil
}

func NewIdentity(userID valuer.UUID, orgID valuer.UUID, email string, role types.Role) *Identity {
	return &Identity{
		UserID: userID,
		OrgID:  orgID,
		Email:  email,
		Role:   role,
	}
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
		Email:  typ.Email,
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
