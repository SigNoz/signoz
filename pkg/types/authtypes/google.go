package authtypes

import (
	"encoding/json"
)

type GoogleConfig struct {
	// ClientID is the application's ID. For example, 292085223830.apps.googleusercontent.com.
	ClientID string `json:"clientId"`

	// It is the application's secret.
	ClientSecret string `json:"clientSecret"`

	// What is the meaning of this? Should we remove this?
	RedirectURI string `json:"redirectURI"`
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
