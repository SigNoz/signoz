package authtypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostableAuthDomainSpecFields(t *testing.T) {
	testCases := []struct {
		name         string
		body         string
		expectedKind AuthNProvider
	}{
		{
			name:         "SAMLSpec",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"saml","spec":{"entityId":"e","location":"l","certificate":"c"}}}`,
			expectedKind: AuthNProviderSAML,
		},
		{
			name:         "SAMLSpecWithAttributeMapping",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"saml","spec":{"entityId":"e","location":"l","certificate":"c","insecureSkipAuthNRequestsSigned":true,"attributeMapping":{"email":"mail"}}}}`,
			expectedKind: AuthNProviderSAML,
		},
		{
			name:         "GoogleSpec",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","insecureSkipEmailVerified":false}}}`,
			expectedKind: AuthNProviderGoogle,
		},
		{
			name:         "GoogleSpecWithWorkspaceGroups",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","fetchGroups":true,"serviceAccountJson":"{}","domainToAdminEmail":{"*":"admin@a.test"},"fetchTransitiveGroupMembership":true,"allowedGroups":["g@a.test"]}}}`,
			expectedKind: AuthNProviderGoogle,
		},
		{
			name:         "OIDCSpec",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"oidc","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s"}}}`,
			expectedKind: AuthNProviderOIDC,
		},
		{
			name:         "OIDCFieldsUnderGoogleKindConfigureGoogle",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s","claimMapping":{"email":"mail"}}}}`,
			expectedKind: AuthNProviderGoogle,
		},
		{
			name:         "GoogleOnlyFieldUnderGoogleKindIgnored",
			body:         `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","redirectURI":"https://a.test/cb"}}}`,
			expectedKind: AuthNProviderGoogle,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			postable := new(PostableAuthDomain)
			err := json.Unmarshal([]byte(testCase.body), postable)
			require.NoError(t, err)

			assert.Equal(t, testCase.expectedKind, postable.Config.Kind)
		})
	}
}

// The enforcement toggle and the edit modal both PUT a full replacement, so the update body decodes with the same kind-authoritative rules as the create body.
func TestUpdatableAuthDomainSpecFields(t *testing.T) {
	updatable := new(UpdatableAuthDomain)
	err := json.Unmarshal([]byte(`{"enabled":true,"config":{"kind":"google","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s"}}}`), updatable)
	require.NoError(t, err)

	assert.Equal(t, AuthNProviderGoogle, updatable.Config.Kind)
}

// Reads stay lenient on purpose: a document written by a newer binary has to keep loading after a rollback, and dropping a field must not need a migration.
func TestNewAuthDomainFromStorableAuthDomainKeepsUnknownSpecFields(t *testing.T) {
	storable := &StorableAuthDomain{
		Data: `{"enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","fieldFromANewerVersion":"x"}}}`,
	}

	authDomain, err := NewAuthDomainFromStorableAuthDomain(storable)
	require.NoError(t, err)

	google, err := authDomain.Config().GoogleConfig()
	require.NoError(t, err)

	assert.Equal(t, AuthNProviderGoogle, authDomain.Kind())
	assert.Equal(t, "c", google.ClientID)
}
