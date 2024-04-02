package saml

import (
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"strings"

	saml2 "github.com/russellhaering/gosaml2"
	dsig "github.com/russellhaering/goxmldsig"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.uber.org/zap"
)

func LoadCertificateStore(certString string) (dsig.X509CertificateStore, error) {
	certStore := &dsig.MemoryX509CertificateStore{
		Roots: []*x509.Certificate{},
	}

	certData, err := base64.StdEncoding.DecodeString(certString)
	if err != nil {
		return certStore, fmt.Errorf(fmt.Sprintf("failed to read certificate: %v", err))
	}

	idpCert, err := x509.ParseCertificate(certData)
	if err != nil {
		return certStore, fmt.Errorf(fmt.Sprintf("failed to prepare saml request, invalid cert: %s", err.Error()))
	}

	certStore.Roots = append(certStore.Roots, idpCert)

	return certStore, nil
}

func LoadCertFromPem(certString string) (dsig.X509CertificateStore, error) {
	certStore := &dsig.MemoryX509CertificateStore{
		Roots: []*x509.Certificate{},
	}

	block, _ := pem.Decode([]byte(certString))
	if block == nil {
		return certStore, fmt.Errorf("no valid pem cert found")
	}

	idpCert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return certStore, fmt.Errorf(fmt.Sprintf("failed to parse pem cert: %s", err.Error()))
	}

	certStore.Roots = append(certStore.Roots, idpCert)

	return certStore, nil
}

// PrepareRequest prepares authorization URL (Idp Provider URL)
func PrepareRequest(issuer, acsUrl, audience, entity, idp, certString string) (*saml2.SAMLServiceProvider, error) {
	var certStore dsig.X509CertificateStore
	if certString == "" {
		return nil, fmt.Errorf("invalid certificate data")
	}

	var err error
	if strings.Contains(certString, "-----BEGIN CERTIFICATE-----") {
		certStore, err = LoadCertFromPem(certString)
	} else {
		certStore, err = LoadCertificateStore(certString)
	}
	// certificate store can not be created, throw error
	if err != nil {
		return nil, err
	}

	randomKeyStore := dsig.RandomKeyStoreForTest()

	// SIGNOZ_SAML_RETURN_URL env var would support overriding window.location
	// as return destination after saml request is complete from IdP side.
	// this var is also useful for development, as it is easy to override with backend endpoint
	// e.g. http://localhost:8080/api/v1/complete/saml
	acsUrl = constants.GetOrDefaultEnv("SIGNOZ_SAML_RETURN_URL", acsUrl)

	sp := &saml2.SAMLServiceProvider{
		IdentityProviderSSOURL:      idp,
		IdentityProviderIssuer:      entity,
		ServiceProviderIssuer:       issuer,
		AssertionConsumerServiceURL: acsUrl,
		SignAuthnRequests:           true,
		AllowMissingAttributes:      true,

		// about cert stores -sender(signoz app) and receiver (idp)
		// The random key (random key store) is sender cert. The public cert store(IDPCertificateStore) that you see on org domain is receiver cert (idp provided).
		// At the moment, the library we use doesn't bother about sender cert and IdP too. It just adds additional layer of security, which we can explore in future versions
		// The receiver (Idp) cert will be different for each org domain. Imagine cloud setup where each company setups their domain that integrates with their Idp.
		// @signoz.io
		// @next.io
		// Each of above will have their own Idp setup and hence separate public cert to decrypt the response.
		// The way SAML request travels is -
		// SigNoz Backend -> IdP Login Screen -> SigNoz Backend -> SigNoz Frontend
		// ---------------- | -------------------| -------------------------------------
		// The dotted lines indicate request boundries. So if you notice, the response from Idp starts a new request. hence we need relay state to pass the context around.

		IDPCertificateStore: certStore,
		SPKeyStore:          randomKeyStore,
	}
	zap.L().Debug("SAML request", zap.Any("sp", sp))
	return sp, nil
}
