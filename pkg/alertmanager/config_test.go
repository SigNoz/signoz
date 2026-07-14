package alertmanager

import (
	"context"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const prefix = "SIGNOZ_"

// clearSignozEnv unsets all existing SIGNOZ_* env vars for the duration of the test.
func clearSignozEnv(t *testing.T) {
	t.Helper()
	for _, kv := range os.Environ() {
		if strings.HasPrefix(kv, prefix) {
			key := strings.SplitN(kv, "=", 2)[0]
			orig, _ := os.LookupEnv(key)
			_ = os.Unsetenv(key)
			t.Cleanup(func() { _ = os.Setenv(key, orig) })
		}
	}
}

func TestNewWithEnvProvider(t *testing.T) {
	clearSignozEnv(t)
	t.Setenv("SIGNOZ_ALERTMANAGER_PROVIDER", "signoz")
	t.Setenv("SIGNOZ_ALERTMANAGER_LEGACY_API__URL", "http://localhost:9093/api")
	t.Setenv("SIGNOZ_ALERTMANAGER_SIGNOZ_ROUTE_REPEAT__INTERVAL", "5m")
	t.Setenv("SIGNOZ_ALERTMANAGER_SIGNOZ_EXTERNAL__URL", "https://example.com/test")
	t.Setenv("SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_RESOLVE__TIMEOUT", "10s")

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
	err = conf.Unmarshal("alertmanager", actual, "yaml")
	require.NoError(t, err)

	def := NewConfigFactory().New().(Config)
	def.Signoz.Global.ResolveTimeout = model.Duration(10 * time.Second)
	def.Signoz.Route.RepeatInterval = 5 * time.Minute
	def.Signoz.ExternalURL = &url.URL{
		Scheme: "https",
		Host:   "example.com",
		Path:   "/test",
	}

	expected := &Config{
		Provider: "signoz",
		Signoz:   def.Signoz,
	}

	assert.Equal(t, expected, actual)
	assert.NoError(t, actual.Validate())
}
