package signozenvprovider

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/confmap/confmaptest"
)

func createProvider() confmap.Provider {
	return NewFactory().Create(confmaptest.NewNopProviderSettings())
}

func TestValidateProviderScheme(t *testing.T) {
	assert.NoError(t, confmaptest.ValidateProviderScheme(createProvider()))
}

func TestRetrieve(t *testing.T) {
	t.Setenv("SIGNOZ_STORAGE_DSN", "localhost:9000")
	t.Setenv("SIGNOZ_SIGNOZ_ENABLED", "true")
	expected := confmap.NewFromStringMap(map[string]any{
		"storage::dsn":    "localhost:9000",
		"signoz::enabled": "true",
	})

	signoz := createProvider()
	retrieved, err := signoz.Retrieve(context.Background(), schemeName+":", nil)
	require.NoError(t, err)

	actual, err := retrieved.AsConf()
	require.NoError(t, err)

	assert.Equal(t, expected.ToStringMap(), actual.ToStringMap())
	assert.NoError(t, signoz.Shutdown(context.Background()))
}
