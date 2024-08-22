package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	"go.signoz.io/signoz/pkg/instrumentation"
)

func TestUnmarshal(t *testing.T) {
	input := confmap.NewFromStringMap(
		map[string]any{
			"instrumentation": map[string]any{
				"logs": map[string]bool{
					"enabled": true,
				},
			},
		},
	)
	expected := &Config{
		Instrumentation: instrumentation.Config{
			Logs: instrumentation.LogsConfig{
				Enabled: true,
			},
		},
	}
	cfg, err := unmarshal(input)
	require.NoError(t, err)

	assert.Equal(t, expected, cfg)

}
