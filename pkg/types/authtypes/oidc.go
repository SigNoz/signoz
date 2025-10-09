package authtypes

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
)

type OIDCConfig struct {
	// It is the URL identifier for the service. For example: "https://accounts.google.com" or "https://login.salesforce.com".
	Issuer string `json:"issuer"`

	// Some offspec providers like Azure, Oracle IDCS have oidc discovery url different from issuer url which causes issuerValidation to fail
	// This provides a way to override the Issuer url from the .well-known/openid-configuration issuer
	// from the .well-known/openid-configuration issuer
	IssuerAlias string `json:"issuerAlias"`

	// It is the application's ID.
	ClientID string `json:"clientId"`

	// It is the application's secret.
	ClientSecret string `json:"clientSecret"`

	// Mapping of claims to the corresponding fields in the token.
	ClaimMapping ClaimMapping `json:"claimMapping"`

	// Whether to skip email verification. Defaults to "false"
	InsecureSkipEmailVerified bool `json:"insecureSkipEmailVerified"`

	// Uses the userinfo endpoint to get additional claims for the token. This is especially useful where upstreams return "thin" id tokens
	GetUserInfo bool `json:"getUserInfo"`
}

type ClaimMapping struct {
	// Configurable key which contains the email claims. Defaults to "email"
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
