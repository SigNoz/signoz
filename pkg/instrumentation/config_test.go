package instrumentation

import (
	"context"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/config"
	"go.signoz.io/signoz/pkg/config/envprovider"
	"go.signoz.io/signoz/pkg/factory"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_INSTRUMENTATION_LOGS_LEVEL", "debug")
	t.Setenv("SIGNOZ_INSTRUMENTATION_METRICS_READERS_PULL_EXPORTER_PROMETHEUS_PORT", "1111")
	t.Setenv("SIGNOZ_INSTRUMENTATION_TRACES_ENABLED", "true")

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
	err = conf.Unmarshal("instrumentation", &actual)
	require.NoError(t, err)

	port := 1111
	expected := NewConfigFactory().New().(Config)
	expected.Logs.Level = slog.LevelDebug
	expected.Traces.Enabled = true
	expected.Metrics.Readers.Pull.Exporter.Prometheus.Port = &port

	assert.Equal(t, expected, actual)
}
