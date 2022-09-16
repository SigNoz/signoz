package saml

import (
	"crypto/x509"
	"encoding/base64"
	"fmt"

	saml2 "github.com/russellhaering/gosaml2"
	dsig "github.com/russellhaering/goxmldsig"
)

// PrepareRequest prepares authorization URL (Idp Provider URL)
func PrepareRequest(issuer, acsUrl, audience, entity, idp, cert string) (*saml2.SAMLServiceProvider, error) {

	certStore := dsig.MemoryX509CertificateStore{
		Roots: []*x509.Certificate{},
	}

	certData, err := base64.StdEncoding.DecodeString(cert)
	if err != nil {
		return nil, fmt.Errorf(fmt.Sprintf("failed to prepare saml login request: %v", err))
	}

	idpCert, err := x509.ParseCertificate(certData)
	if err != nil {
		return nil, fmt.Errorf(fmt.Sprintf("failed to prepare saml request, invalid cert: %s", err.Error()))
	}

	certStore.Roots = append(certStore.Roots, idpCert)

	randomKeyStore := dsig.RandomKeyStoreForTest()

	sp := &saml2.SAMLServiceProvider{
		IdentityProviderSSOURL:      idp,
		IdentityProviderIssuer:      entity,
		ServiceProviderIssuer:       issuer,
		AssertionConsumerServiceURL: acsUrl,
		SignAuthnRequests:           true,
		AudienceURI:                 issuer,
		IDPCertificateStore:         &certStore,
		SPKeyStore:                  randomKeyStore,
	}
	fmt.Println("request:", sp)
	return sp, nil
}
