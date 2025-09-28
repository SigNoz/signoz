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
	type Alias SamlConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Unfortunately, we have not being doing validations till now and putting validations here will break the existing data.
	*config = SamlConfig(temp)
	return nil
}
