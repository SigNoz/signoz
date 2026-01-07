package authtypes

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

const wildCardDomain = "*"

type GoogleConfig struct {
	// ClientID is the application's ID. For example, 292085223830.apps.googleusercontent.com.
	ClientID string `json:"clientId"`

	// It is the application's secret.
	ClientSecret string `json:"clientSecret"`

	// What is the meaning of this? Should we remove this?
	RedirectURI string `json:"redirectURI"`

	// Whether to fetch the Google workspace groups (required additional API scopes)
	FetchGroups bool `json:"fetchGroups"`

	// Service Account creds JSON stored for Google Admin SDK access
	// This is content of the JSON file stored directly into db as string
	// Required if FetchGroups is true (unless running on GCE with default credentials)
	ServiceAccountJSON string `json:"serviceAccountJson,omitempty"`

	// Map of workspace domain to admin email for service account impersonation
	// The service account will impersonate this admin to call the directory API
	// Use "*" as key for wildcard/default that matches any domain
	// Example: {"example.com": "admin@exmaple.com", "*": "fallbackadmin@company.com"}
	DomainToAdminEmail map[string]string `json:"adminEmail,omitempty"`

	// If true, fetch transitive group membership (recursive - groups that contains other groups)
	FetchTransitiveGroupMembership bool `json:"fetchTransitiveGroupMembership,omitempty"`

	// Optional list of allowed groups
	// If this is present, only users belonging to one of these groups will be allowed to login
	AllowedGroups []string `json:"allowedGroups,omitempty"`

	// Scopes for oauth2.Config. Defaults to "email profile"
	Scopes []string `json:"scopes"`
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

	if temp.FetchGroups {
		if len(temp.DomainToAdminEmail) == 0 {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "domainToAdminEmail is required if fetchGroups is true")
		}

		if temp.ServiceAccountJSON == "" {
			return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "serviceAccountJSON is required if fetchGroups is true")
		}
	}

	if len(temp.Scopes) == 0 {
		temp.Scopes = []string{"email", "profile"}
	}

	*config = GoogleConfig(temp)
	return nil
}

func (config *GoogleConfig) GetAdminEmailForDomain(userEmail string) string {
	domain := extractDomainFromEmail(userEmail)

	if adminEmail, ok := config.DomainToAdminEmail[domain]; ok {
		return adminEmail
	}

	return config.DomainToAdminEmail[wildCardDomain]
}

func extractDomainFromEmail(email string) string {
	if at := strings.LastIndex(email, "@"); at >= 0 {
		return email[at+1:]
	}
	return wildCardDomain
}
