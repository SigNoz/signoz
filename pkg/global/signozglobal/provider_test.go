package signozglobal

import (
	"context"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/identn"
)

// providerForTest mirrors how newProvider constructs the provider in
// provider.go. GetConfig dereferences both ExternalURL and IngestionURL
// unconditionally (unlike MCPURL and AIAssistantURL, which are nil-checked),
// so both must be non-nil or GetConfig panics.
func providerForTest(t *testing.T, identNConfig identn.Config) global.Global {
	t.Helper()

	externalURL, err := url.Parse("https://signoz.example.com")
	require.NoError(t, err)

	provider, err := newProvider(context.Background(), factorytest.NewSettings(), global.Config{
		ExternalURL:  externalURL,
		IngestionURL: externalURL,
	}, identNConfig)
	require.NoError(t, err)

	return provider
}

// The browser has no other way to learn that identity comes from a proxy, so the
// public config must carry the flag. It must never carry the mode or the secret.
func TestGetConfigExposesTrustedHeaderEnabled(t *testing.T) {
	provider := providerForTest(t, identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled:           true,
			LogoutRedirectURL: "https://proxy.example/logout",
			Trust: identn.TrustConfig{
				Mode:   identn.TrustModeSecret,
				Secret: identn.SecretTrustConfig{Header: "X-Proxy-Auth", Value: "s3cret"},
			},
		},
	})

	config := provider.GetConfig(context.Background())

	assert.True(t, config.IdentN.TrustedHeader.Enabled)
	assert.Equal(t, "https://proxy.example/logout", config.IdentN.TrustedHeader.LogoutRedirectURL)
}
