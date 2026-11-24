package apiserver

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	httpserver "github.com/SigNoz/signoz/pkg/http/server"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_APISERVER_ADDRESS", "0.0.0.0:9090")
	t.Setenv("SIGNOZ_APISERVER_READ__TIMEOUT", "80s")
	t.Setenv("SIGNOZ_APISERVER_TLS_ENABLED", "true")
	t.Setenv("SIGNOZ_APISERVER_TLS_CERT__FILE", "/etc/signoz/server.crt")
	t.Setenv("SIGNOZ_APISERVER_TLS_KEY__FILE", "/etc/signoz/server.key")
	t.Setenv("SIGNOZ_APISERVER_TLS_MIN__VERSION", "1.3")
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
		Config: httpserver.Config{
			Address:     "0.0.0.0:9090",
			ReadTimeout: 80 * time.Second,
			TLS: httpserver.TLS{
				Enabled:    true,
				CertFile:   "/etc/signoz/server.crt",
				KeyFile:    "/etc/signoz/server.key",
				MinVersion: "1.3",
			},
		},
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
		Compression: Compression{
			Enabled: true,
			Level:   -1,
		},
	}

	assert.Equal(t, expected, actual)
}

func TestCompressionWithEnvProvider(t *testing.T) {
	testCases := []struct {
		name     string
		env      map[string]string
		expected Compression
	}{
		{
			name:     "Defaults",
			env:      map[string]string{},
			expected: Compression{Enabled: true, Level: -1},
		},
		{
			name:     "Disabled",
			env:      map[string]string{"SIGNOZ_APISERVER_COMPRESSION_ENABLED": "false"},
			expected: Compression{Enabled: false, Level: -1},
		},
		{
			name:     "Disabled_Capitalized",
			env:      map[string]string{"SIGNOZ_APISERVER_COMPRESSION_ENABLED": "False"},
			expected: Compression{Enabled: false, Level: -1},
		},
		{
			name:     "Enabled_Level",
			env:      map[string]string{"SIGNOZ_APISERVER_COMPRESSION_ENABLED": "true", "SIGNOZ_APISERVER_COMPRESSION_LEVEL": "9"},
			expected: Compression{Enabled: true, Level: 9},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			for key, value := range testCase.env {
				t.Setenv(key, value)
			}

			conf, err := config.New(
				context.Background(),
				config.ResolverConfig{
					Uris:              []string{"env:"},
					ProviderFactories: []config.ProviderFactory{envprovider.NewFactory()},
				},
				[]factory.ConfigFactory{NewConfigFactory()},
			)
			require.NoError(t, err)

			actual := &Config{}
			require.NoError(t, conf.Unmarshal("apiserver", actual))
			assert.Equal(t, testCase.expected, actual.Compression)
		})
	}
}

func TestValidateCompressionLevel(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name    string
		level   int
		wantErr bool
	}{
		{name: "Default", level: -1, wantErr: false},
		{name: "BestSpeed", level: 1, wantErr: false},
		{name: "BestCompression", level: 9, wantErr: false},
		{name: "Zero", level: 0, wantErr: true},
		{name: "AboveBestCompression", level: 10, wantErr: true},
		{name: "BelowDefault", level: -2, wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			conf := NewConfigFactory().New().(*Config)
			conf.Compression.Level = testCase.level

			err := conf.Validate()
			if testCase.wantErr {
				assert.ErrorContains(t, err, "apiserver.compression.level")
				return
			}
			assert.NoError(t, err)
		})
	}
}
