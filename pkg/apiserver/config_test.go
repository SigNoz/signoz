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
	t.Setenv("SIGNOZ_APISERVER_CONTEXT__TIMEOUT__MAX__ALLOWED", "700s")

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
		Enabled:                  false,
		ContextTimeout:           60 * time.Second,
		ContextTimeoutMaxAllowed: 700 * time.Second,
		TimeoutExcludedRoutes: []string{
			"/api/v1/logs/tail",
			"/api/v3/logs/livetail",
		},
	}

	assert.Equal(t, expected, actual)
}
