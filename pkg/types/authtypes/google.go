package authtypes

import (
	"encoding/json"
)

type GoogleConfig struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	RedirectURI  string `json:"redirectURI"`
}

func (config *GoogleConfig) UnmarshalJSON(data []byte) error {
	type Alias GoogleConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Unfortunately, we have not being doing validations till now and putting validations here will break the existing data.

	*config = GoogleConfig(temp)
	return nil
}
