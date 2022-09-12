package saml

import (
	"crypto/x509"
	"encoding/base64"
	"fmt"

	"go.signoz.io/query-service/ee/constants"
	"go.signoz.io/query-service/ee/model"

	saml2 "github.com/russellhaering/gosaml2"
	dsig "github.com/russellhaering/goxmldsig"
)

func BuildLoginURLWithOrg(domain *model.OrgDomain, pathToVisit string) (loginURL string, err error) {
	sp, err := PrepRequestWithOrg(domain, pathToVisit)
	if err != nil {
		return "", err
	}
	return sp.BuildAuthURL(pathToVisit)
}

// PrepareAcsURL is the api endpoint that saml provider redirects response to
func PrepareAcsURL(domainId string) string {
	return fmt.Sprintf("%s/%s/sso-domain/%s/%s", constants.GetSAMLHost(), "api/v1", domainId, "complete/saml")
}

// PrepRequestWithOrg prepares authorization URL (Idp Provider URL) using
// org setup
func PrepRequestWithOrg(domain *model.OrgDomain, pathToVisit string) (*saml2.SAMLServiceProvider, error) {

	certStore := dsig.MemoryX509CertificateStore{
		Roots: []*x509.Certificate{},
	}
	certData, err := base64.StdEncoding.DecodeString(domain.GetSAMLCert())
	if err != nil {
		return nil, fmt.Errorf(fmt.Sprintf("failed to prepare saml login request: %v", err))
	}

	idpCert, err := x509.ParseCertificate(certData)
	if err != nil {
		return nil, fmt.Errorf(fmt.Sprintf("failed to prepare saml login request, invalid cert: %s", err.Error()))
	}

	certStore.Roots = append(certStore.Roots, idpCert)
	acsURL := PrepareAcsURL(domain.Id.String())

	// We sign the AuthnRequest with a random key because Okta doesn't seem
	// to verify these.
	randomKeyStore := dsig.RandomKeyStoreForTest()

	sp := &saml2.SAMLServiceProvider{
		IdentityProviderSSOURL:      domain.GetSAMLIdpURL(),
		IdentityProviderIssuer:      domain.GetSAMLEntityID(),
		ServiceProviderIssuer:       "urn:example:idp",
		AssertionConsumerServiceURL: acsURL,
		SignAuthnRequests:           true,
		AudienceURI:                 constants.GetSAMLHost(),
		IDPCertificateStore:         &certStore,
		SPKeyStore:                  randomKeyStore,
	}

	return sp, nil
}
