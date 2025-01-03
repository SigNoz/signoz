package config

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/confmap/provider/signozenvprovider"
	"go.signoz.io/signoz/pkg/web"
)

func TestNewWithSignozEnvProvider(t *testing.T) {

	t.Setenv("SIGNOZ__WEB__PREFIX", "/web")
	t.Setenv("SIGNOZ__WEB__DIRECTORY", "/build")
	t.Setenv("SIGNOZ__CACHE__PROVIDER", "redis")
	t.Setenv("SIGNOZ__CACHE__REDIS__HOST", "127.0.0.1")

	config, err := New(context.Background(), ProviderSettings{
		ResolverSettings: confmap.ResolverSettings{
			URIs: []string{"signozenv:"},
			ProviderFactories: []confmap.ProviderFactory{
				signozenvprovider.NewFactory(),
			},
		},
	})
	require.NoError(t, err)

	expected := &Config{
		Web: web.Config{
			Prefix:    "/web",
			Directory: "/build",
		},
		Cache: cache.Config{
			Provider: "redis",
			Memory: cache.Memory{
				TTL:             time.Duration(-1),
				CleanupInterval: 1 * time.Minute,
			},
			Redis: cache.Redis{
				Host:     "127.0.0.1",
				Port:     6379,
				Password: "",
				DB:       0,
			},
		},
	}

	assert.Equal(t, expected, config)
}
