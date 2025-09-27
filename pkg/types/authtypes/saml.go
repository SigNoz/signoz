package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type SamlConfig struct {
	SamlEntity string `json:"samlEntity"`
	SamlIdp    string `json:"samlIdp"`
	SamlCert   string `json:"samlCert"`
}

func (config *SamlConfig) UnmarshalJSON(data []byte) error {
	var temp SamlConfig
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.SamlCert == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "saml: samlCert is required")
	}

	// TODO: Some validations on certificates
	*config = temp
	return nil
}
