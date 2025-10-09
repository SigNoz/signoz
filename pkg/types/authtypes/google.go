package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
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

	if temp.ClientID == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "clientId is required")
	}

	if temp.ClientSecret == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "clientSecret is required")
	}

	*config = GoogleConfig(temp)
	return nil
}
