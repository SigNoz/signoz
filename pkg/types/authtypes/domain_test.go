package authtypes

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/require"
)

// Verifies the new flat wire shape: ssoType/provider configs collapse into a
// single discriminated `provider:{type,config}`, and the typed payload survives
// a marshal -> unmarshal round-trip. This fails if UnmarshalJSON forgets to
// assign envelop.Config (the decoded config would be lost).
func TestAuthDomainConfigWireRoundTrip(t *testing.T) {
	tests := []struct {
		name         string
		provider     AuthNProvider
		config       any
		wantType     string
		assertConfig func(t *testing.T, c AuthDomainConfig)
	}{
		{
			name:     "saml",
			provider: AuthNProviderSAML,
			config: &SamlConfig{
				SamlEntity: "https://idp.example.com",
				SamlIdp:    "https://idp.example.com/sso",
				SamlCert:   "cert-bytes",
			},
			wantType: "saml",
			assertConfig: func(t *testing.T, c AuthDomainConfig) {
				require.NotNil(t, c.Saml())
				require.Equal(t, "https://idp.example.com", c.Saml().SamlEntity)
			},
		},
		{
			name:     "google",
			provider: AuthNProviderGoogleAuth,
			config:   &GoogleConfig{ClientID: "cid", ClientSecret: "secret"},
			wantType: "google_auth",
			assertConfig: func(t *testing.T, c AuthDomainConfig) {
				require.NotNil(t, c.Google())
				require.Equal(t, "cid", c.Google().ClientID)
			},
		},
		{
			name:     "oidc",
			provider: AuthNProviderOIDC,
			config:   &OIDCConfig{Issuer: "https://issuer", ClientID: "cid", ClientSecret: "secret"},
			wantType: "oidc",
			assertConfig: func(t *testing.T, c AuthDomainConfig) {
				require.NotNil(t, c.Oidc())
				require.Equal(t, "https://issuer", c.Oidc().Issuer)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := AuthDomainConfig{
				SSOEnabled: true,
				Provider:   AuthProviderEnvelop{Type: tt.provider, Config: tt.config},
			}

			raw, err := json.Marshal(in)
			require.NoError(t, err)

			js := string(raw)
			require.Contains(t, js, `"provider"`)
			require.Contains(t, js, `"type":"`+tt.wantType+`"`)
			// legacy keys must be gone
			require.NotContains(t, js, "ssoType")
			require.NotContains(t, js, "samlConfig")
			require.NotContains(t, js, "googleAuthConfig")
			require.NotContains(t, js, "oidcConfig")

			var out AuthDomainConfig
			require.NoError(t, json.Unmarshal(raw, &out))
			require.True(t, out.SSOEnabled)
			require.Equal(t, tt.provider, out.Provider.Type)
			tt.assertConfig(t, out)
		})
	}
}

// Unknown discriminator values are rejected, and the nested provider config's
// own validators still run through the envelope.
func TestAuthDomainConfigUnmarshalRejects(t *testing.T) {
	tests := []struct {
		name string
		json string
	}{
		{
			name: "unknown provider type",
			json: `{"ssoEnabled":true,"provider":{"type":"ldap","config":{}}}`,
		},
		{
			name: "oidc config missing clientId",
			json: `{"ssoEnabled":true,"provider":{"type":"oidc","config":{"issuer":"https://issuer","clientSecret":"secret"}}}`,
		},
		{
			name: "saml config missing samlEntity",
			json: `{"ssoEnabled":true,"provider":{"type":"saml","config":{"samlIdp":"https://idp/sso","samlCert":"abc"}}}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var c AuthDomainConfig
			require.Error(t, json.Unmarshal([]byte(tt.json), &c))
		})
	}
}

// The config is marshaled into the `data` column and unmarshaled back when the
// domain is loaded, so the typed provider config must survive that round-trip.
func TestAuthDomainStorageRoundTrip(t *testing.T) {
	cfg := AuthDomainConfig{
		SSOEnabled: true,
		Provider: AuthProviderEnvelop{
			Type:   AuthNProviderSAML,
			Config: &SamlConfig{SamlEntity: "https://idp", SamlIdp: "https://idp/sso", SamlCert: "abc"},
		},
	}

	domain, err := NewAuthDomainFromConfig("example.com", &cfg, valuer.GenerateUUID())
	require.NoError(t, err)

	got := domain.AuthDomainConfig()
	require.Equal(t, AuthNProviderSAML, got.Provider.Type)
	require.NotNil(t, got.Saml())
	require.Equal(t, "https://idp", got.Saml().SamlEntity)
}

// Postable keeps name-regex validation and still decodes the embedded provider.
func TestPostableAuthDomainUnmarshal(t *testing.T) {
	valid := `{
		"name":"example.com",
		"ssoEnabled":true,
		"provider":{"type":"saml","config":{"samlEntity":"https://idp","samlIdp":"https://idp/sso","samlCert":"abc"}}
	}`

	var p PostableAuthDomain
	require.NoError(t, json.Unmarshal([]byte(valid), &p))
	require.Equal(t, "example.com", p.Name)
	require.True(t, p.SSOEnabled)
	require.NotNil(t, p.Saml())
	require.Equal(t, "https://idp", p.Saml().SamlEntity)

	invalid := `{"name":"not a domain!","provider":{"type":"saml","config":{"samlEntity":"https://idp","samlIdp":"https://idp/sso","samlCert":"abc"}}}`
	var bad PostableAuthDomain
	require.Error(t, json.Unmarshal([]byte(invalid), &bad))
}
