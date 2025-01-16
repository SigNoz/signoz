package fileprovider

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/config"
)

func TestGetWithStrings(t *testing.T) {
	expected := map[string]any{
		"k1::k2":       "string",
		"k3_k4":        "string",
		"k5_k6::k7_k8": "string",
		"k9_::k10":     "string",
		"k11__k12":     "string",
	}

	provider := New(config.ProviderConfig{})
	actual, err := provider.Get(context.Background(), config.MustNewUri("file:"+filepath.Join("testdata", "strings.yaml")))
	require.NoError(t, err)

	assert.Equal(t, expected, actual.All())
}

func TestGetWithGoTypes(t *testing.T) {
	expected := map[string]any{
		"bool":   true,
		"int":    1,
		"slice":  []any{1, 2},
		"string": "string",
	}

	provider := New(config.ProviderConfig{})
	actual, err := provider.Get(context.Background(), config.MustNewUri("file:"+filepath.Join("testdata", "gotypes.yaml")))
	require.NoError(t, err)

	assert.Equal(t, expected, actual.All())
}

func TestGetWithGoTypesWithUnmarshal(t *testing.T) {
	type test struct {
		Bool   bool   `mapstructure:"bool"`
		String string `mapstructure:"string"`
		Int    int    `mapstructure:"int"`
		Slice  []any  `mapstructure:"slice"`
	}

	expected := test{
		Bool:   true,
		String: "string",
		Int:    1,
		Slice:  []any{1, 2},
	}

	provider := New(config.ProviderConfig{})
	conf, err := provider.Get(context.Background(), config.MustNewUri("file:"+filepath.Join("testdata", "gotypes.yaml")))
	require.NoError(t, err)

	actual := test{}
	err = conf.Unmarshal("", &actual)
	require.NoError(t, err)

	assert.Equal(t, expected, actual)
}
