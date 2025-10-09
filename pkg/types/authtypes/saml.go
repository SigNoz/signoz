package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type SamlConfig struct {
	// The entityID of the SAML identity provider. It can typically be found in the EntityID attribute of the EntityDescriptor element in the SAML metadata of the identity provider. Example: <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="{samlEntity}">
	SamlEntity string `json:"samlEntity"`

	// The SSO endpoint of the SAML identity provider. It can typically be found in the SingleSignOnService element in the SAML metadata of the identity provider. Example: <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{samlIdp}"/>
	SamlIdp string `json:"samlIdp"`

	// The certificate of the SAML identity provider. It can typically be found in the X509Certificate element in the SAML metadata of the identity provider. Example: <ds:X509Certificate><ds:X509Certificate>{samlCert}</ds:X509Certificate></ds:X509Certificate>
	SamlCert string `json:"samlCert"`

	// Whether to skip signing the SAML requests. It can typically be found in the WantAuthnRequestsSigned attribute of the IDPSSODescriptor element in the SAML metadata of the identity provider. Example: <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
	// For providers like jumpcloud, this should be set to true.
	// Note: This is the reverse of WantAuthnRequestsSigned. If WantAuthnRequestsSigned is false, then InsecureSkipAuthNRequestsSigned should be true.
	InsecureSkipAuthNRequestsSigned bool `json:"insecureSkipAuthNRequestsSigned"`
}

func (config *SamlConfig) UnmarshalJSON(data []byte) error {
	type Alias SamlConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.SamlEntity == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "samlEntity is required")
	}

	if temp.SamlIdp == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "samlIdp is required")
	}

	if temp.SamlCert == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "samlCert is required")
	}

	*config = SamlConfig(temp)
	return nil
}
