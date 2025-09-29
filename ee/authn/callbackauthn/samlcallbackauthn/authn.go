package samlcallbackauthn

import (
	"context"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"net/url"
	"strings"

	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	saml2 "github.com/russellhaering/gosaml2"
	dsig "github.com/russellhaering/goxmldsig"
)

const (
	redirectPath string = "/api/v1/complete/saml"
)

var _ authn.CallbackAuthN = (*AuthN)(nil)

type AuthN struct {
	store     authtypes.AuthNStore
	licensing licensing.Licensing
}

func New(ctx context.Context, store authtypes.AuthNStore, licensing licensing.Licensing) (*AuthN, error) {
	return &AuthN{
		store:     store,
		licensing: licensing,
	}, nil
}

func (a *AuthN) LoginURL(ctx context.Context, siteURL *url.URL, authDomain *authtypes.AuthDomain) (string, error) {
	if authDomain.AuthDomainConfig().AuthNProvider != authtypes.AuthNProviderSAML {
		return "", errors.Newf(errors.TypeInternal, authtypes.ErrCodeAuthDomainMismatch, "saml: domain type is not saml")
	}

	sp, err := a.serviceProvider(siteURL, authDomain)
	if err != nil {
		return "", err
	}

	url, err := sp.BuildAuthURL(authtypes.NewState(siteURL, authDomain.StorableAuthDomain().ID).URL.String())
	if err != nil {
		return "", err
	}

	return url, nil
}

func (a *AuthN) HandleCallback(ctx context.Context, formValues url.Values) (*authtypes.CallbackIdentity, error) {
	state, err := authtypes.NewStateFromString(formValues.Get("RelayState"))
	if err != nil {
		return nil, err
	}

	authDomain, err := a.store.GetAuthDomainFromID(ctx, state.DomainID)
	if err != nil {
		return nil, err
	}

	_, err = a.licensing.GetActive(ctx, authDomain.StorableAuthDomain().OrgID)
	if err != nil {
		return nil, err
	}

	sp, err := a.serviceProvider(state.URL, authDomain)
	if err != nil {
		return nil, err
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(formValues.Get("SAMLResponse"))
	if err != nil {
		return nil, err
	}

	if assertionInfo.WarningInfo.InvalidTime {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "saml: expired saml response")
	}

	email, err := valuer.NewEmail(assertionInfo.NameID)
	if err != nil {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "saml: invalid email in the SSO response")
	}

	return &authtypes.CallbackIdentity{
		Name:  "",
		Email: email,
		OrgID: authDomain.StorableAuthDomain().OrgID,
	}, nil
}

func (a *AuthN) serviceProvider(siteURL *url.URL, authDomain *authtypes.AuthDomain) (*saml2.SAMLServiceProvider, error) {
	certStore, err := a.getCertificateStore(authDomain)
	if err != nil {
		return nil, err
	}

	return &saml2.SAMLServiceProvider{
		IdentityProviderSSOURL: authDomain.AuthDomainConfig().SAML.SamlIdp,
		IdentityProviderIssuer: authDomain.AuthDomainConfig().SAML.SamlEntity,
		ServiceProviderIssuer:  siteURL.Host,
		AssertionConsumerServiceURL: (&url.URL{
			Scheme: siteURL.Scheme,
			Host:   siteURL.Host,
			Path:   redirectPath,
		}).String(),
		SignAuthnRequests:      true,
		AllowMissingAttributes: true,
		IDPCertificateStore:    certStore,
		SPKeyStore:             dsig.RandomKeyStoreForTest(),
	}, nil
}

func (a *AuthN) getCertificateStore(authDomain *authtypes.AuthDomain) (dsig.X509CertificateStore, error) {
	certStore := &dsig.MemoryX509CertificateStore{
		Roots: []*x509.Certificate{},
	}

	var certBytes []byte
	if strings.Contains(authDomain.AuthDomainConfig().SAML.SamlCert, "-----BEGIN CERTIFICATE-----") {
		block, _ := pem.Decode([]byte(authDomain.AuthDomainConfig().SAML.SamlCert))
		if block == nil {
			return certStore, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "no valid pem cert found")
		}

		certBytes = block.Bytes
	} else {
		certData, err := base64.StdEncoding.DecodeString(authDomain.AuthDomainConfig().SAML.SamlCert)
		if err != nil {
			return certStore, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to read certificate: %v", err)
		}

		certBytes = certData
	}

	idpCert, err := x509.ParseCertificate(certBytes)
	if err != nil {
		return certStore, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to prepare saml request, invalid cert: %s", err.Error())
	}

	certStore.Roots = append(certStore.Roots, idpCert)

	return certStore, nil
}
