package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type OIDCConfig struct {
	Issuer                    string       `json:"issuer"`
	IssuerAlias               string       `json:"issuerAlias"`
	ClientID                  string       `json:"clientId"`
	ClientSecret              string       `json:"clientSecret"`
	ClaimMapping              ClaimMapping `json:"claimMapping"`
	InsecureSkipEmailVerified bool         `json:"insecureSkipEmailVerified"`
	GetUserInfo               bool         `json:"getUserInfo"`
}

type ClaimMapping struct {
	Email string `json:"email"`
}

func (config *OIDCConfig) UnmarshalJSON(data []byte) error {
	type Alias OIDCConfig

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Issuer == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "issuer is required")
	}

	if temp.ClientID == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "clientId is required")
	}

	if temp.ClientSecret == "" {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "clientSecret is required")
	}

	if temp.ClaimMapping.Email == "" {
		temp.ClaimMapping.Email = "email"
	}

	*config = OIDCConfig(temp)
	return nil
}
