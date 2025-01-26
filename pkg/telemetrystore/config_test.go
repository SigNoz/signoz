package telemetrystore

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
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_ADDRESS", "localhost:9000")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME", "default")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD", "password")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_MAX__IDLE__CONNS", "60")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_MAX__OPEN__CONNS", "150")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_DIAL__TIMEOUT", "5s")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DEBUG", "true")

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
	err = conf.Unmarshal("telemetrystore", actual)

	require.NoError(t, err)

	expected := &Config{
		Provider: "clickhouse",
		Connection: ConnectionConfig{
			MaxOpenConns: 150,
			MaxIdleConns: 60,
			DialTimeout:  5 * time.Second,
		},
		Clickhouse: ClickhouseConfig{
			Address:  "localhost:9000",
			Username: "default",
			Password: "password",
			Debug:    true,
		},
	}

	assert.Equal(t, expected, actual)
}
