package apiserver

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/envprovider"
	"go.signoz.io/signoz/pkg/factory"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_APISERVER_TIMEOUT_DEFAULT", "70s")
	t.Setenv("SIGNOZ_APISERVER_TIMEOUT_MAX", "700s")
	t.Setenv("SIGNOZ_APISERVER_TIMEOUT_EXCLUDED__ROUTES", "/excluded1,/excluded2")
	t.Setenv("SIGNOZ_APISERVER_LOGGING_EXCLUDED__ROUTES", "/api/v1/health1")

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
	err = conf.Unmarshal("apiserver", actual)

	require.NoError(t, err)

	expected := &Config{
		Timeout: Timeout{
			Default: 70 * time.Second,
			Max:     700 * time.Second,
			ExcludedRoutes: []string{
				"/excluded1",
				"/excluded2",
			},
		},
		Logging: Logging{
			ExcludedRoutes: []string{
				"/api/v1/health1",
			},
		},
	}

	assert.Equal(t, expected, actual)
}
