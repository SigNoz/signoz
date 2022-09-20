package model

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	saml2 "github.com/russellhaering/gosaml2"
	"go.signoz.io/query-service/ee/saml"
	basemodel "go.signoz.io/query-service/model"
)

type SSOType string

const (
	SAML       SSOType = "SAML"
	GoogleAuth SSOType = "GOOGLE_AUTH"
)

type SamlConfig struct {
	SamlEntity string `json:"samlEntity"`
	SamlIdp    string `json:"samlIdp"`
	SamlCert   string `json:"samlCert"`
}

// OrgDomain identify org owned web domains for auth and other purposes
type OrgDomain struct {
	Id         uuid.UUID   `json:"id"`
	Name       string      `json:"name"`
	OrgId      string      `json:"orgId"`
	SsoEnabled bool        `json:"ssoEnabled"`
	SsoType    SSOType     `json:"ssoType"`
	SamlConfig *SamlConfig `json:"samlConfig"`
	Org        *basemodel.Organization
}

// Valid is used a pipeline function to check if org domain
// loaded from db is valid
func (od *OrgDomain) Valid(err error) error {
	if err != nil {
		return err
	}

	if od.Id == uuid.Nil || od.OrgId == "" {
		return fmt.Errorf("both id and orgId are required")
	}

	return nil
}

// ValidNew cheks if the org domain is valid for insertion in db
func (od *OrgDomain) ValidNew() error {

	if od.OrgId == "" {
		return fmt.Errorf("orgId is required")
	}

	if od.Name == "" {
		return fmt.Errorf("name is required")
	}

	return nil
}

// LoadConfig loads config params from json text
func (od *OrgDomain) LoadConfig(jsondata string) error {
	d := *od
	err := json.Unmarshal([]byte(jsondata), &d)
	if err != nil {
		return errors.Wrap(err, "failed to marshal json to OrgDomain{}")
	}
	*od = d
	return nil
}

func (od *OrgDomain) GetSAMLEntityID() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlEntity
	}
	return ""
}

func (od *OrgDomain) GetSAMLIdpURL() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlIdp
	}
	return ""
}

func (od *OrgDomain) GetSAMLCert() string {
	if od.SamlConfig != nil {
		return od.SamlConfig.SamlCert
	}
	return ""
}

func (od *OrgDomain) PrepareSamlRequest(siteUrl *url.URL) (*saml2.SAMLServiceProvider, error) {

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

	// we replace hyphen to colon so idp doesnt break it in the url encode
	issuer := strings.Replace(od.Id.String(), "-", ":", -1)

	return saml.PrepareRequest(issuer, acs, sourceUrl, od.GetSAMLEntityID(), od.GetSAMLIdpURL(), od.GetSAMLCert())
}

func (od *OrgDomain) BuildSsoUrl(siteUrl *url.URL) (ssoUrl string, err error) {

	sp, err := od.PrepareSamlRequest(siteUrl)
	if err != nil {
		return "", err
	}

	fmtDomainId := strings.Replace(od.Id.String(), "-", ":", -1)

	relayState := fmt.Sprintf("%s://%s%s?domainId=%s",
		siteUrl.Scheme,
		siteUrl.Host,
		siteUrl.Path,
		fmtDomainId)

	return sp.BuildAuthURL(relayState)
}
