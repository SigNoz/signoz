package types

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/ssotypes"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	saml2 "github.com/russellhaering/gosaml2"
	"github.com/uptrace/bun"
)

type StorableOrgDomain struct {
	bun.BaseModel `bun:"table:org_domains"`

	TimeAuditable
	ID    uuid.UUID `json:"id" bun:"id,pk,type:text"`
	OrgID string    `json:"orgId" bun:"org_id,type:text,notnull"`
	Name  string    `json:"name" bun:"name,type:varchar(50),notnull,unique"`
	Data  string    `json:"-" bun:"data,type:text,notnull"`
}

type SSOType string

const (
	SAML       SSOType = "SAML"
	GoogleAuth SSOType = "GOOGLE_AUTH"
)

// GettableOrgDomain identify org owned web domains for auth and other purposes
type GettableOrgDomain struct {
	StorableOrgDomain

	SsoEnabled bool    `json:"ssoEnabled"`
	SsoType    SSOType `json:"ssoType"`

	SamlConfig       *ssotypes.SamlConfig        `json:"samlConfig"`
	GoogleAuthConfig *ssotypes.GoogleOAuthConfig `json:"googleAuthConfig"`

	Org *Organization
}

func (od *GettableOrgDomain) String() string {
	return fmt.Sprintf("[%s]%s-%s ", od.Name, od.ID.String(), od.SsoType)
}

// Valid is used a pipeline function to check if org domain
// loaded from db is valid
func (od *GettableOrgDomain) Valid(err error) error {
	if err != nil {
		return err
	}

	if od.ID == uuid.Nil || od.OrgID == "" {
		return fmt.Errorf("both id and orgId are required")
	}

	return nil
}

// ValidNew cheks if the org domain is valid for insertion in db
func (od *GettableOrgDomain) ValidNew() error {

	if od.OrgID == "" {
		return fmt.Errorf("orgId is required")
	}

	if od.Name == "" {
		return fmt.Errorf("name is required")
	}

	return nil
}

// LoadConfig loads config params from json text
func (od *GettableOrgDomain) LoadConfig(jsondata string) error {
	d := *od
	err := json.Unmarshal([]byte(jsondata), &d)
	if err != nil {
		return errors.Wrap(err, "failed to marshal json to OrgDomain{}")
	}
	*od = d
	return nil
}

func (od *GettableOrgDomain) GetSAMLEntityID() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlEntity
	}
	return ""
}

func (od *GettableOrgDomain) GetSAMLIdpURL() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlIdp
	}
	return ""
}

func (od *GettableOrgDomain) GetSAMLCert() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlCert
	}
	return ""
}

// PrepareGoogleOAuthProvider creates GoogleProvider that is used in
// requesting OAuth and also used in processing response from google
func (od *GettableOrgDomain) PrepareGoogleOAuthProvider(siteUrl *url.URL) (ssotypes.OAuthCallbackProvider, error) {
	if od.GoogleAuthConfig == nil {
		return nil, fmt.Errorf("GOOGLE OAUTH is not setup correctly for this domain")
	}

	return od.GoogleAuthConfig.GetProvider(od.Name, siteUrl)
}

// PrepareSamlRequest creates a request accordingly gosaml2
func (od *GettableOrgDomain) PrepareSamlRequest(siteUrl *url.URL) (*saml2.SAMLServiceProvider, error) {

	// this is the url Idp will call after login completion
	acs := fmt.Sprintf("%s://%s/%s",
		siteUrl.Scheme,
		siteUrl.Host,
		"api/v1/complete/saml")

	// this is the address of the calling url, useful to redirect user
	sourceUrl := fmt.Sprintf("%s://%s%s",
		siteUrl.Scheme,
		siteUrl.Host,
		siteUrl.Path)

	// ideally this should be some unique ID for each installation
	// but since we dont have UI to support it, we default it to
	// host. this issuer is an identifier of service provider (signoz)
	// on id provider (e.g. azure, okta). Azure requires this id to be configured
	// in their system, while others seem to not care about it.
	// currently we default it to host from window.location (received from browser)
	issuer := siteUrl.Host

	return ssotypes.PrepareRequest(issuer, acs, sourceUrl, od.GetSAMLEntityID(), od.GetSAMLIdpURL(), od.GetSAMLCert())
}

func (od *GettableOrgDomain) BuildSsoUrl(siteUrl *url.URL) (ssoUrl string, err error) {

	fmtDomainId := strings.Replace(od.ID.String(), "-", ":", -1)

	// build redirect url from window.location sent by frontend
	redirectURL := fmt.Sprintf("%s://%s%s", siteUrl.Scheme, siteUrl.Host, siteUrl.Path)

	// prepare state that gets relayed back when the auth provider
	// calls back our url. here we pass the app url (where signoz runs)
	// and the domain Id. The domain Id helps in identifying sso config
	// when the call back occurs and the app url is useful in redirecting user
	// back to the right path.
	// why do we need to pass app url? the callback typically is handled by backend
	// and sometimes backend might right at a different port or is unaware of frontend
	// endpoint (unless SITE_URL param is set). hence, we receive this build sso request
	// along with frontend window.location and use it to relay the information through
	// auth provider to the backend (HandleCallback or HandleSSO method).
	relayState := fmt.Sprintf("%s?domainId=%s", redirectURL, fmtDomainId)

	switch od.SsoType {
	case SAML:

		sp, err := od.PrepareSamlRequest(siteUrl)
		if err != nil {
			return "", err
		}

		return sp.BuildAuthURL(relayState)

	case GoogleAuth:

		googleProvider, err := od.PrepareGoogleOAuthProvider(siteUrl)
		if err != nil {
			return "", err
		}
		return googleProvider.BuildAuthURL(relayState)

	default:
		return "", fmt.Errorf("unsupported SSO config for the domain")
	}

}
