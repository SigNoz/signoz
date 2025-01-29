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
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN", "http://localhost:9000")
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
		ClickHouse: ClickHouseConfig{
			DSN: "http://localhost:9000",
		},
	}

	assert.Equal(t, expected, actual)
}

func TestNewWithEnvProviderWithQuerySettings(t *testing.T) {
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__EXECUTION__TIME", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__EXECUTION__TIME__LEAF", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_TIMEOUT__BEFORE__CHECKING__EXECUTION__SPEED", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__BYTES__TO__READ", "1000000")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__RESULT__ROWS__FOR__CH__QUERY", "10000")

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
		ClickHouse: ClickHouseConfig{
			QuerySettings: ClickHouseQuerySettings{
				MaxExecutionTime:                    10,
				MaxExecutionTimeLeaf:                10,
				TimeoutBeforeCheckingExecutionSpeed: 10,
				MaxBytesToRead:                      1000000,
				MaxResultRowsForCHQuery:             10000,
			},
		},
	}

	assert.Equal(t, expected.ClickHouse.QuerySettings, actual.ClickHouse.QuerySettings)
}
