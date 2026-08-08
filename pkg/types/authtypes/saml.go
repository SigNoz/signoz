package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type SamlConfig struct {
	// The entityID of the SAML identity provider. It can typically be found in the EntityID attribute of the EntityDescriptor element in the SAML metadata of the identity provider. Example: <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="{entityId}">
	EntityID string `json:"entityId" required:"true"`

	// The SSO endpoint of the SAML identity provider. It can typically be found in the Location attribute of the SingleSignOnService element in the SAML metadata of the identity provider. Example: <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{location}"/>
	Location string `json:"location" required:"true"`

	// The certificate of the SAML identity provider. It can typically be found in the X509Certificate element in the SAML metadata of the identity provider. Example: <ds:X509Certificate><ds:X509Certificate>{certificate}</ds:X509Certificate></ds:X509Certificate>
	Certificate string `json:"certificate" required:"true"`

	// Whether to skip signing the SAML requests. It can typically be found in the WantAuthnRequestsSigned attribute of the IDPSSODescriptor element in the SAML metadata of the identity provider. Example: <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
	// For providers like jumpcloud, this should be set to true.
	// Note: This is the reverse of WantAuthnRequestsSigned. If WantAuthnRequestsSigned is false, then InsecureSkipAuthNRequestsSigned should be true.
	InsecureSkipAuthNRequestsSigned bool `json:"insecureSkipAuthNRequestsSigned"`

	// Mapping of SAML assertion attributes
	AttributeMapping AttributeMapping `json:"attributeMapping"`
}

// StorableSamlConfig is SamlConfig in its persisted shape. It differs from SamlConfig
// only in JSON keys, which are kept for compatibility with rows written before the
// keys were renamed.
type StorableSamlConfig struct {
	EntityID                        string           `json:"samlEntity"`
	Location                        string           `json:"samlIdp"`
	Certificate                     string           `json:"samlCert"`
	InsecureSkipAuthNRequestsSigned bool             `json:"insecureSkipAuthNRequestsSigned"`
	AttributeMapping                AttributeMapping `json:"attributeMapping"`
}

func (config *SamlConfig) UnmarshalJSON(data []byte) error {
	type Alias SamlConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	samlConfig := SamlConfig(temp)
	if err := samlConfig.validate(); err != nil {
		return err
	}

	*config = samlConfig
	return nil
}

func (config *StorableSamlConfig) UnmarshalJSON(data []byte) error {
	type Alias StorableSamlConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	samlConfig := SamlConfig(StorableSamlConfig(temp))
	if err := samlConfig.validate(); err != nil {
		return err
	}

	*config = StorableSamlConfig(samlConfig)
	return nil
}

// validate also assigns the default attribute mapping when none is present.
func (config *SamlConfig) validate() error {
	if config.EntityID == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "entityId is required")
	}

	if config.Location == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "location is required")
	}

	if config.Certificate == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "certificate is required")
	}

	if config.AttributeMapping == (AttributeMapping{}) {
		if err := json.Unmarshal([]byte("{}"), &config.AttributeMapping); err != nil {
			return err
		}
	}

	return nil
}
