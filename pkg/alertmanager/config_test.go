package alertmanager

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/envprovider"
	"go.signoz.io/signoz/pkg/factory"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_ALERTMANAGER_PROVIDER", "legacy")
	t.Setenv("SIGNOZ_ALERTMANAGER_LEGACY_URL", "http://localhost:9093/api")

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
	err = conf.Unmarshal("alertmanager", actual)
	require.NoError(t, err)

	def := NewConfigFactory().New().(Config)

	expected := &Config{
		Provider: "legacy",
		Legacy: Legacy{
			URL: "http://localhost:9093/api",
		},
		Signoz: def.Signoz,
	}

	assert.Equal(t, expected, actual)
	assert.NoError(t, actual.Validate())
}
