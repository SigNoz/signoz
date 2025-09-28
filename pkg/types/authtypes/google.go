package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
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

	if temp.ClientID == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "google: clientId is required")
	}

	if temp.ClientSecret == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "google: clientSecret is required")
	}

	if temp.RedirectURI == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeAuthDomainInvalidConfig, "google: redirectURI is required")
	}

	*config = GoogleConfig(temp)
	return nil
}
