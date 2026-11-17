package telemetrystore

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN", "tcp://localhost:9000")
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

	actual := Config{}
	err = conf.Unmarshal("telemetrystore", &actual)
	require.NoError(t, err)

	assert.NoError(t, actual.Validate())

	expected := NewConfigFactory().New().(Config)
	expected.Provider = "clickhouse"
	expected.Connection.MaxOpenConns = 150
	expected.Connection.MaxIdleConns = 60
	expected.Connection.DialTimeout = 5 * time.Second
	expected.Clickhouse.DSN = "tcp://localhost:9000"

	assert.Equal(t, expected, actual)
}

func TestNewWithEnvProviderWithQuerySettings(t *testing.T) {
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__EXECUTION__TIME", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__EXECUTION__TIME__LEAF", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_TIMEOUT__BEFORE__CHECKING__EXECUTION__SPEED", "10")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__BYTES__TO__READ", "1000000")
	t.Setenv("SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__RESULT__ROWS", "10000")

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

	actual := Config{}
	err = conf.Unmarshal("telemetrystore", &actual)

	require.NoError(t, err)

	expected := Config{
		Clickhouse: ClickhouseConfig{
			QuerySettings: QuerySettings{
				MaxExecutionTime:                    10,
				MaxExecutionTimeLeaf:                10,
				TimeoutBeforeCheckingExecutionSpeed: 10,
				MaxBytesToRead:                      1000000,
				MaxResultRows:                       10000,
			},
		},
	}

	assert.Equal(t, expected.Clickhouse.QuerySettings, actual.Clickhouse.QuerySettings)
}
