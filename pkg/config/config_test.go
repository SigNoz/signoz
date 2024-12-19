package config

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	contribsdkconfig "go.opentelemetry.io/contrib/config"
	"go.signoz.io/signoz/pkg/confmap/provider/signozenvprovider"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/web"
)

func TestNewWithSignozEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ__INSTRUMENTATION__LOGS__ENABLED", "true")
	t.Setenv("SIGNOZ__INSTRUMENTATION__LOGS__PROCESSORS__BATCH__EXPORTER__OTLP__ENDPOINT", "0.0.0.0:4317")
	t.Setenv("SIGNOZ__INSTRUMENTATION__LOGS__PROCESSORS__BATCH__EXPORT_TIMEOUT", "10")
	t.Setenv("SIGNOZ__WEB__PREFIX", "/web")
	t.Setenv("SIGNOZ__WEB__DIRECTORY", "/build")

	config, err := New(context.Background(), ProviderSettings{
		ResolverSettings: confmap.ResolverSettings{
			URIs: []string{"signozenv:"},
			ProviderFactories: []confmap.ProviderFactory{
				signozenvprovider.NewFactory(),
			},
		},
	})
	require.NoError(t, err)

	i := 10
	expected := &Config{
		Instrumentation: instrumentation.Config{
			Logs: instrumentation.LogsConfig{
				Enabled: true,
				LoggerProvider: contribsdkconfig.LoggerProvider{
					Processors: []contribsdkconfig.LogRecordProcessor{
						{
							Batch: &contribsdkconfig.BatchLogRecordProcessor{
								ExportTimeout: &i,
								Exporter: contribsdkconfig.LogRecordExporter{
									OTLP: &contribsdkconfig.OTLP{
										Endpoint: "0.0.0.0:4317",
									},
								},
							},
						},
					},
				},
			},
		},
		Web: web.Config{
			Prefix:    "/web",
			Directory: "/build",
		},
	}

	assert.Equal(t, expected, config)
}
