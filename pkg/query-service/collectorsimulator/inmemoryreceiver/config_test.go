package inmemoryreceiver

import (
	"testing"

	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/confmap"
)

func TestValidate(t *testing.T) {
	tests := []struct {
		name          string
		rawConf       *confmap.Conf
		errorExpected bool
	}{
		{
			name: "with id",
			rawConf: confmap.NewFromStringMap(map[string]interface{}{
				"id": "test_receiver",
			}),
			errorExpected: false,
		},
		{
			name: "empty id",
			rawConf: confmap.NewFromStringMap(map[string]interface{}{
				"id": "",
			}),
			errorExpected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			factory := NewFactory()
			cfg := factory.CreateDefaultConfig()
			err := tt.rawConf.Unmarshal(&cfg)
			require.NoError(t, err, "could not UnmarshalConfig")

			err = component.ValidateConfig(cfg)
			if tt.errorExpected {
				require.NotNilf(t, err, "Invalid config did not return validation error: %v", cfg)
			} else {
				require.NoErrorf(t, err, "Valid config returned validation error: %v", cfg)
			}
		})
	}
}
