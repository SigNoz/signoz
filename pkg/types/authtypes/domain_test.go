package authtypes

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPostableAuthDomainSpecFields(t *testing.T) {
	testCases := []struct {
		name          string
		body          string
		expectedError bool
	}{
		{
			name:          "SAMLSpec",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"saml","spec":{"entityId":"e","location":"l","certificate":"c"}}}`,
			expectedError: false,
		},
		{
			name:          "SAMLSpecWithAttributeMapping",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"saml","spec":{"entityId":"e","location":"l","certificate":"c","insecureSkipAuthNRequestsSigned":true,"attributeMapping":{"email":"mail"}}}}`,
			expectedError: false,
		},
		{
			name:          "GoogleSpec",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","insecureSkipEmailVerified":false}}}`,
			expectedError: false,
		},
		{
			name:          "GoogleSpecWithWorkspaceGroups",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","fetchGroups":true,"serviceAccountJson":"{}","domainToAdminEmail":{"*":"admin@a.test"},"fetchTransitiveGroupMembership":true,"allowedGroups":["g@a.test"]}}}`,
			expectedError: false,
		},
		{
			name:          "OIDCSpec",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"oidc","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s"}}}`,
			expectedError: false,
		},
		{
			// clientId and clientSecret are google's only required fields, so an
			// oidc spec satisfies them and would otherwise be accepted with its
			// issuer silently dropped.
			name:          "OIDCSpecUnderGoogleKind",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s","claimMapping":{"email":"mail"}}}}`,
			expectedError: true,
		},
		{
			name:          "GoogleSpecUnderOIDCKind",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"oidc","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s","fetchGroups":true}}}`,
			expectedError: true,
		},
		{
			name:          "SAMLSpecUnderGoogleKind",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","entityId":"e"}}}`,
			expectedError: true,
		},
		{
			name:          "UnrecognizedFieldInGoogleSpec",
			body:          `{"name":"a.test","enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s","redirectURI":"https://a.test/cb"}}}`,
			expectedError: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			postable := new(PostableAuthDomain)
			err := json.Unmarshal([]byte(testCase.body), postable)

			if testCase.expectedError {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
		})
	}
}

// The enforcement toggle and the edit modal both PUT a full replacement, so the
// update body needs the same check as the create body.
func TestUpdatableAuthDomainSpecFields(t *testing.T) {
	updatable := new(UpdatableAuthDomain)
	err := json.Unmarshal([]byte(`{"enabled":true,"config":{"kind":"google","spec":{"issuer":"https://issuer.a.test","clientId":"c","clientSecret":"s"}}}`), updatable)
	assert.Error(t, err)

	updatable = new(UpdatableAuthDomain)
	err = json.Unmarshal([]byte(`{"enabled":true,"config":{"kind":"google","spec":{"clientId":"c","clientSecret":"s"}}}`), updatable)
	assert.NoError(t, err)
}

// Reads stay lenient on purpose: a document written by a newer binary has to keep
// loading after a rollback, and dropping a field must not need a migration.
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
