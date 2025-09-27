package authtypes

import (
	"encoding/json"
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

	// TODO: Some validations on certificates
	*config = temp
	return nil
}
