package sqlmigration

import (
	"context"
	"database/sql"
	"log/slog"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	_ "modernc.org/sqlite"
)

func TestRestructureAuthDomainConfig(t *testing.T) {
	testCases := []struct {
		name         string
		data         string
		expectedData string
	}{
		{
			// Rows written before the provider enum became a valuer.String spell
			// the discriminator uppercase and were never rewritten on disk.
			name:         "UppercaseSAML",
			data:         `{"ssoEnabled":true,"ssoType":"SAML","samlConfig":{"samlEntity":"entity","samlIdp":"https://idp.example.com/sso","samlCert":"cert"},"roleMapping":{"defaultRole":"signoz-admin"}}`,
			expectedData: `{"enabled":true,"config":{"kind":"saml","spec":{"entityId":"entity","location":"https://idp.example.com/sso","certificate":"cert"}},"roleMapping":{"defaultRole":"signoz-admin"}}`,
		},
		{
			name:         "UppercaseGoogleAuth",
			data:         `{"ssoEnabled":true,"ssoType":"GOOGLE_AUTH","googleAuthConfig":{"clientId":"cid","clientSecret":"secret","redirectURI":"https://example.com/callback"}}`,
			expectedData: `{"enabled":true,"config":{"kind":"google","spec":{"clientId":"cid","clientSecret":"secret"}}}`,
		},
		{
			name:         "MixedCaseWithSurroundingWhitespace",
			data:         `{"ssoEnabled":false,"ssoType":" Saml ","samlConfig":{"samlEntity":"entity","samlIdp":"location","samlCert":"cert"}}`,
			expectedData: `{"enabled":false,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert"}}}`,
		},
		{
			name:         "LowercaseSAML",
			data:         `{"ssoEnabled":true,"ssoType":"saml","samlConfig":{"samlEntity":"entity","samlIdp":"location","samlCert":"cert","fieldFromANewerVersion":true}}`,
			expectedData: `{"enabled":true,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert","fieldFromANewerVersion":true}}}`,
		},
		{
			name:         "LowercaseGoogleAuthWithWorkspaceGroups",
			data:         `{"ssoEnabled":true,"ssoType":"google_auth","googleAuthConfig":{"clientId":"cid","clientSecret":"secret","redirectURI":"https://example.com/callback","fetchGroups":true,"serviceAccountJson":"{}","domainToAdminEmail":{"*":"admin@example.com"},"allowedGroups":["eng@example.com"]},"roleMapping":{"defaultRole":"signoz-viewer","groupMappings":{"eng":"signoz-editor"}}}`,
			expectedData: `{"enabled":true,"config":{"kind":"google","spec":{"clientId":"cid","clientSecret":"secret","fetchGroups":true,"serviceAccountJson":"{}","domainToAdminEmail":{"*":"admin@example.com"},"allowedGroups":["eng@example.com"]}},"roleMapping":{"defaultRole":"signoz-viewer","groupMappings":{"eng":"signoz-editor"}}}`,
		},
		{
			name:         "LowercaseOIDC",
			data:         `{"ssoEnabled":true,"ssoType":"oidc","oidcConfig":{"clientId":"cid","clientSecret":"secret","issuer":"https://issuer.example.com"}}`,
			expectedData: `{"enabled":true,"config":{"kind":"oidc","spec":{"clientId":"cid","clientSecret":"secret","issuer":"https://issuer.example.com"}}}`,
		},
		{
			name:         "MissingSSOEnabledDefaultsToDisabled",
			data:         `{"ssoType":"saml","samlConfig":{"samlEntity":"entity","samlIdp":"location","samlCert":"cert"}}`,
			expectedData: `{"enabled":false,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert"}}}`,
		},
		{
			name:         "NullRoleMappingIsDropped",
			data:         `{"ssoEnabled":true,"ssoType":"saml","samlConfig":{"samlEntity":"entity","samlIdp":"location","samlCert":"cert"},"roleMapping":null}`,
			expectedData: `{"enabled":true,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert"}}}`,
		},
		{
			name:         "AlreadyRestructured",
			data:         `{"enabled":true,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert"}}}`,
			expectedData: `{"enabled":true,"config":{"kind":"saml","spec":{"entityId":"entity","location":"location","certificate":"cert"}}}`,
		},
		{
			name:         "UnknownSSOType",
			data:         `{"ssoEnabled":true,"ssoType":"ldap","samlConfig":{"samlEntity":"entity"}}`,
			expectedData: `{"ssoEnabled":true,"ssoType":"ldap","samlConfig":{"samlEntity":"entity"}}`,
		},
		{
			name:         "NullProviderConfig",
			data:         `{"ssoEnabled":true,"ssoType":"saml","samlConfig":null}`,
			expectedData: `{"ssoEnabled":true,"ssoType":"saml","samlConfig":null}`,
		},
		{
			name:         "UnreadableData",
			data:         `not json`,
			expectedData: `not json`,
		},
	}

	ctx := context.Background()

	sqldb, err := sql.Open("sqlite", "file:"+filepath.Join(t.TempDir(), "test.db"))
	require.NoError(t, err)
	defer sqldb.Close()

	db := bun.NewDB(sqldb, sqlitedialect.New())

	// Only the two columns the migration reads and writes.
	_, err = db.ExecContext(ctx, `CREATE TABLE auth_domain (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
	require.NoError(t, err)

	for _, testCase := range testCases {
		_, err := db.NewInsert().
			Model(&restructureAuthDomainRow{ID: testCase.name, Data: testCase.data}).
			Exec(ctx)
		require.NoError(t, err)
	}

	migration := &restructureAuthDomainConfig{logger: slog.New(slog.DiscardHandler)}

	// Running twice pins idempotency: a restructured document carries no
	// ssoType, so the second pass must leave every row untouched.
	for range 2 {
		require.NoError(t, migration.Up(ctx, db))

		for _, testCase := range testCases {
			t.Run(testCase.name, func(t *testing.T) {
				row := new(restructureAuthDomainRow)
				require.NoError(t, db.NewSelect().Model(row).Where("id = ?", testCase.name).Scan(ctx))

				if testCase.name == "UnreadableData" {
					assert.Equal(t, testCase.expectedData, row.Data)
					return
				}

				assert.JSONEq(t, testCase.expectedData, row.Data)
			})
		}
	}
}
