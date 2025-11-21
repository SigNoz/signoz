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
		return nil, errors.New(errors.TypeInvalidInput, authtypes.ErrCodeInvalidState, "saml: invalid state").WithAdditional(err.Error())
	}

	authDomain, err := a.store.GetAuthDomainFromID(ctx, state.DomainID)
	if err != nil {
		return nil, err
	}

	_, err = a.licensing.GetActive(ctx, authDomain.StorableAuthDomain().OrgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	sp, err := a.serviceProvider(state.URL, authDomain)
	if err != nil {
		return nil, err
	}

	assertionInfo, err := sp.RetrieveAssertionInfo(formValues.Get("SAMLResponse"))
	if err != nil {
		if errors.As(err, &saml2.ErrVerification{}) {
			return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, err.Error())
		}

		if errors.As(err, &saml2.ErrMissingElement{}) {
			return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, err.Error())
		}

		return nil, err
	}

	if assertionInfo.WarningInfo.InvalidTime {
		return nil, errors.New(errors.TypeForbidden, errors.CodeForbidden, "saml: expired saml response")
	}

	email, err := valuer.NewEmail(assertionInfo.NameID)
	if err != nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "saml: invalid email").WithAdditional("The nameID assertion is used to retrieve the email address, please check your IDP configuration and try again.")
	}

	return authtypes.NewCallbackIdentity("", email, authDomain.StorableAuthDomain().OrgID, state), nil
}

func (a *AuthN) serviceProvider(siteURL *url.URL, authDomain *authtypes.AuthDomain) (*saml2.SAMLServiceProvider, error) {
	certStore, err := a.getCertificateStore(authDomain)
	if err != nil {
		return nil, err
	}

	acsURL := &url.URL{Scheme: siteURL.Scheme, Host: siteURL.Host, Path: redirectPath}

	// Note:
	// The ServiceProviderIssuer is the client id in case of keycloak. Since we set it to the host here, we need to set the client id == host in keycloak.
	// For AWSSSO, this is the value of Application SAML audience.
	return &saml2.SAMLServiceProvider{
		IdentityProviderSSOURL:      authDomain.AuthDomainConfig().SAML.SamlIdp,
		IdentityProviderIssuer:      authDomain.AuthDomainConfig().SAML.SamlEntity,
		ServiceProviderIssuer:       siteURL.Host,
		AssertionConsumerServiceURL: acsURL.String(),
		SignAuthnRequests:           !authDomain.AuthDomainConfig().SAML.InsecureSkipAuthNRequestsSigned,
		AllowMissingAttributes:      true,
		IDPCertificateStore:         certStore,
		SPKeyStore:                  dsig.RandomKeyStoreForTest(),
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
			return certStore, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to read certificate: %s", err.Error())
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
