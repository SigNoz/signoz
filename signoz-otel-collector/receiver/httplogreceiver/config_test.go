package httplogreceiver

import (
	"path/filepath"
	"testing"

	"github.com/SigNoz/signoz-otel-collector/receiver/httplogreceiver/internal/metadata"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/confighttp"
	"go.opentelemetry.io/collector/config/configtls"
	"go.opentelemetry.io/collector/confmap/confmaptest"
)

func TestLoadConfig(t *testing.T) {
	t.Parallel()

	cm, err := confmaptest.LoadConf(filepath.Join("testdata", "config.yaml"))
	require.NoError(t, err)

	tests := []struct {
		id       component.ID
		expected component.Config
	}{
		{
			id:       component.NewIDWithName(metadata.Type, ""),
			expected: createDefaultConfig(),
		},
		{
			id: component.NewIDWithName(metadata.Type, "endpoint"),
			expected: &Config{
				HTTPServerSettings: confighttp.HTTPServerSettings{
					Endpoint: "localhost:54321",
				},
			},
		},
		{
			id: component.NewIDWithName(metadata.Type, "withtls"),
			expected: &Config{
				HTTPServerSettings: confighttp.HTTPServerSettings{
					Endpoint: ":54321",
					TLSSetting: &configtls.TLSServerSetting{
						TLSSetting: configtls.TLSSetting{
							CertFile: "/test.crt",
							KeyFile:  "/test.key",
						},
					},
				},
			},
		},
		{
			id: component.NewIDWithName(metadata.Type, "heroku"),
			expected: &Config{
				HTTPServerSettings: confighttp.HTTPServerSettings{
					Endpoint: ":54321",
				},
				Source: "heroku",
			},
		},
		{
			id: component.NewIDWithName(metadata.Type, "google"),
			expected: &Config{
				HTTPServerSettings: confighttp.HTTPServerSettings{
					Endpoint: ":54321",
				},
				Source: "google",
			},
		},
		{
			id: component.NewIDWithName(metadata.Type, "json"),
			expected: &Config{
				HTTPServerSettings: confighttp.HTTPServerSettings{
					Endpoint: ":54321",
				},
				Source: "json",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.id.String(), func(t *testing.T) {
			factory := NewFactory()
			cfg := factory.CreateDefaultConfig()

			sub, err := cm.Sub(tt.id.String())
			require.NoError(t, err)
			require.NoError(t, component.UnmarshalConfig(sub, cfg))

			assert.NoError(t, component.ValidateConfig(cfg))
			assert.Equal(t, tt.expected, cfg)
		})
	}
}

func TestCreateInvalidHTTPEndpoint(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	cfg.Endpoint = ""

	err := cfg.Validate()
	assert.EqualError(t, err, "must specify an endpoint for the httplogreceiver")
}

func TestCreateNoPortEndpoint(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	cfg.Endpoint = "localhost:"

	err := cfg.Validate()
	assert.EqualError(t, err, `endpoint port is not a number: strconv.ParseInt: parsing "": invalid syntax`)
}

func TestCreateLargePortEndpoint(t *testing.T) {
	factory := NewFactory()
	cfg := factory.CreateDefaultConfig().(*Config)
	cfg.Endpoint = "localhost:65536"

	err := cfg.Validate()
	assert.EqualError(t, err, "port number must be between 1 and 65535")
}
