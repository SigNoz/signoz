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
	t.Setenv("SIGNOZ_WEB_PREFIX", "/web")
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
		Prefix:    "/web",
		Directory: def.Directory,
	}

	assert.Equal(t, expected, actual)
}
