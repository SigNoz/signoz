package web

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_WEB_ENABLED", "false")

	conf, err := config.New(
		context.Background(),
		config.ResolverConfig{
			Uris: []string{"env:"},
			ProviderFactories: []config.ProviderFactory{
				envprovider.NewFactory(),
			},
		},
		[]factory.ConfigFactory{
			NewConfigFactory(),
		},
	)
	require.NoError(t, err)

	actual := &Config{}
	err = conf.Unmarshal("web", actual)
	require.NoError(t, err)

	def := NewConfigFactory().New().(*Config)

	expected := &Config{
		Enabled:   false,
		Index:     def.Index,
		Directory: def.Directory,
		Settings:  def.Settings,
	}

	assert.Equal(t, expected, actual)
}

func TestSettingsConfigWithEnvProvider(t *testing.T) {
	testCases := []struct {
		name     string
		env      string
		value    string
		expected SettingsConfig
	}{
		{name: "posthog_enabled", env: "SIGNOZ_WEB_SETTINGS_POSTHOG_ENABLED", value: "true", expected: SettingsConfig{Posthog: PosthogConfig{Enabled: true}}},
		{name: "posthog_key", env: "SIGNOZ_WEB_SETTINGS_POSTHOG_KEY", value: "phc_examplekey", expected: SettingsConfig{Posthog: PosthogConfig{Key: "phc_examplekey"}}},
		{name: "posthog_api_host", env: "SIGNOZ_WEB_SETTINGS_POSTHOG_API__HOST", value: "https://eu.i.posthog.com", expected: SettingsConfig{Posthog: PosthogConfig{APIHost: "https://eu.i.posthog.com"}}},
		{name: "posthog_ui_host", env: "SIGNOZ_WEB_SETTINGS_POSTHOG_UI__HOST", value: "https://eu.posthog.com", expected: SettingsConfig{Posthog: PosthogConfig{UIHost: "https://eu.posthog.com"}}},
		{name: "appcues_enabled", env: "SIGNOZ_WEB_SETTINGS_APPCUES_ENABLED", value: "true", expected: SettingsConfig{Appcues: AppcuesConfig{Enabled: true}}},
		{name: "appcues_app_id", env: "SIGNOZ_WEB_SETTINGS_APPCUES_APP__ID", value: "12345-abcde", expected: SettingsConfig{Appcues: AppcuesConfig{AppID: "12345-abcde"}}},
		{name: "sentry_enabled", env: "SIGNOZ_WEB_SETTINGS_SENTRY_ENABLED", value: "true", expected: SettingsConfig{Sentry: SentryConfig{Enabled: true}}},
		{name: "sentry_dsn", env: "SIGNOZ_WEB_SETTINGS_SENTRY_DSN", value: "https://examplePublicKey@o0.ingest.sentry.io/0", expected: SettingsConfig{Sentry: SentryConfig{DSN: "https://examplePublicKey@o0.ingest.sentry.io/0"}}},
		{name: "sentry_tunnel", env: "SIGNOZ_WEB_SETTINGS_SENTRY_TUNNEL", value: "https://example.com/tunnel", expected: SettingsConfig{Sentry: SentryConfig{Tunnel: "https://example.com/tunnel"}}},
		{name: "pylon_enabled", env: "SIGNOZ_WEB_SETTINGS_PYLON_ENABLED", value: "true", expected: SettingsConfig{Pylon: PylonConfig{Enabled: true}}},
		{name: "pylon_app_id", env: "SIGNOZ_WEB_SETTINGS_PYLON_APP__ID", value: "pylon-app-id", expected: SettingsConfig{Pylon: PylonConfig{AppID: "pylon-app-id"}}},
		{name: "pylon_identity_secret", env: "SIGNOZ_WEB_SETTINGS_PYLON_IDENTITY__SECRET", value: "pylon-secret", expected: SettingsConfig{Pylon: PylonConfig{IdentitySecret: "pylon-secret"}}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Setenv(testCase.env, testCase.value)

			conf, err := config.New(
				context.Background(),
				config.ResolverConfig{
					Uris: []string{"env:"},
					ProviderFactories: []config.ProviderFactory{
						envprovider.NewFactory(),
					},
				},
				[]factory.ConfigFactory{
					NewConfigFactory(),
				},
			)
			require.NoError(t, err)

			actual := &Config{}
			err = conf.Unmarshal("web", actual)
			require.NoError(t, err)

			assert.Equal(t, testCase.expected, actual.Settings)
		})
	}
}
