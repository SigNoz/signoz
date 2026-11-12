package opamp

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_OPAMP_ADDRESS", "127.0.0.1:4321")

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
	err = conf.Unmarshal("opamp", &actual)
	require.NoError(t, err)

	assert.Equal(t, Config{Address: "127.0.0.1:4321"}, actual)
}

func TestDefault(t *testing.T) {
	assert.Equal(t, Config{Address: "0.0.0.0:4320"}, NewConfigFactory().New())
}

func TestValidate(t *testing.T) {
	testCases := []struct {
		name    string
		address string
		fail    bool
	}{
		{name: "AllInterfaces", address: "0.0.0.0:4320", fail: false},
		{name: "Loopback", address: "127.0.0.1:4320", fail: false},
		{name: "IPv6", address: "[::1]:4320", fail: false},
		{name: "PortOnly", address: ":4320", fail: false},
		{name: "Hostname", address: "localhost:4320", fail: false},
		{name: "Empty", address: "", fail: true},
		{name: "MissingPort", address: "0.0.0.0", fail: true},
		{name: "UnbracketedIPv6", address: "::1:4320", fail: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := Config{Address: testCase.address}.Validate()
			if testCase.fail {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
		})
	}
}
