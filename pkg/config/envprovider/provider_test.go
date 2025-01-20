package envprovider

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/config"
)

func TestGetWithStrings(t *testing.T) {
	t.Setenv("SIGNOZ_K1_K2", "string")
	t.Setenv("SIGNOZ_K3__K4", "string")
	t.Setenv("SIGNOZ_K5__K6_K7__K8", "string")
	t.Setenv("SIGNOZ_K9___K10", "string")
	t.Setenv("SIGNOZ_K11____K12", "string")
	expected := map[string]any{
		"k1::k2":       "string",
		"k3_k4":        "string",
		"k5_k6::k7_k8": "string",
		"k9_::k10":     "string",
		"k11__k12":     "string",
	}

	provider := New(config.ProviderConfig{})
	actual, err := provider.Get(context.Background(), config.MustNewUri("env:"))
	require.NoError(t, err)

	assert.Equal(t, expected, actual.All())
}

func TestGetWithNoPrefix(t *testing.T) {
	t.Setenv("K1_K2", "string")
	t.Setenv("K3_K4", "string")
	expected := map[string]any{}

	provider := New(config.ProviderConfig{})
	actual, err := provider.Get(context.Background(), config.MustNewUri("env:"))
	require.NoError(t, err)

	assert.Equal(t, expected, actual.All())
}

func TestGetWithGoTypes(t *testing.T) {
	t.Setenv("SIGNOZ_BOOL", "true")
	t.Setenv("SIGNOZ_STRING", "string")
	t.Setenv("SIGNOZ_INT", "1")
	t.Setenv("SIGNOZ_SLICE", "[1,2]")
	expected := map[string]any{
		"bool":   "true",
		"int":    "1",
		"slice":  "[1,2]",
		"string": "string",
	}

	provider := New(config.ProviderConfig{})
	actual, err := provider.Get(context.Background(), config.MustNewUri("env:"))
	require.NoError(t, err)

	assert.Equal(t, expected, actual.All())
}

func TestGetWithGoTypesWithUnmarshal(t *testing.T) {
	t.Setenv("SIGNOZ_BOOL", "true")
	t.Setenv("SIGNOZ_STRING", "string")
	t.Setenv("SIGNOZ_INT", "1")

	type test struct {
		Bool   bool   `mapstructure:"bool"`
		String string `mapstructure:"string"`
		Int    int    `mapstructure:"int"`
	}

	expected := test{
		Bool:   true,
		String: "string",
		Int:    1,
	}

	provider := New(config.ProviderConfig{})
	conf, err := provider.Get(context.Background(), config.MustNewUri("env:"))
	require.NoError(t, err)

	actual := test{}
	err = conf.Unmarshal("", &actual)
	require.NoError(t, err)

	assert.Equal(t, expected, actual)
}
