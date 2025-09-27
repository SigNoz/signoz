package authtypes

import (
	"context"
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

type AuthNStore interface {
	// Get user and factor password by email and orgID.
	GetUserAndFactorPasswordByEmailAndOrgID(ctx context.Context, email string, orgID valuer.UUID) (*types.User, *types.FactorPassword, error)

	// Get org domain from id.
	GetOrgDomainFromID(ctx context.Context, domainID valuer.UUID) (*OrgDomain, error)
}
