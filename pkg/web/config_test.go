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
		expected SettingsConfig
	}{
		{name: "posthog", env: "SIGNOZ_WEB_SETTINGS_POSTHOG_ENABLED", expected: SettingsConfig{Posthog: PosthogConfig{Enabled: true}}},
		{name: "appcues", env: "SIGNOZ_WEB_SETTINGS_APPCUES_ENABLED", expected: SettingsConfig{Appcues: AppcuesConfig{Enabled: true}}},
		{name: "sentry", env: "SIGNOZ_WEB_SETTINGS_SENTRY_ENABLED", expected: SettingsConfig{Sentry: SentryConfig{Enabled: true}}},
		{name: "pylon", env: "SIGNOZ_WEB_SETTINGS_PYLON_ENABLED", expected: SettingsConfig{Pylon: PylonConfig{Enabled: true}}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Setenv(testCase.env, "true")

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
