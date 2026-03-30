package cmd

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSigNozConfig_NoConfigFiles(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)
	config, err := NewSigNozConfig(context.Background(), logger, nil)
	require.NoError(t, err)
	assert.NotZero(t, config)
}

func TestNewSigNozConfig_SingleConfigFile(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	err := os.WriteFile(configPath, []byte(`
cache:
  provider: "redis"
`), 0644)
	require.NoError(t, err)

	logger := slog.New(slog.DiscardHandler)
	config, err := NewSigNozConfig(context.Background(), logger, []string{configPath})
	require.NoError(t, err)
	assert.Equal(t, "redis", config.Cache.Provider)
}

func TestNewSigNozConfig_MultipleConfigFiles_LaterOverridesEarlier(t *testing.T) {
	dir := t.TempDir()

	basePath := filepath.Join(dir, "base.yaml")
	err := os.WriteFile(basePath, []byte(`
cache:
  provider: "memory"
sqlstore:
  provider: "sqlite"
`), 0644)
	require.NoError(t, err)

	overridePath := filepath.Join(dir, "override.yaml")
	err = os.WriteFile(overridePath, []byte(`
cache:
  provider: "redis"
`), 0644)
	require.NoError(t, err)

	logger := slog.New(slog.DiscardHandler)
	config, err := NewSigNozConfig(context.Background(), logger, []string{basePath, overridePath})
	require.NoError(t, err)
	// Later file overrides earlier
	assert.Equal(t, "redis", config.Cache.Provider)
	// Value from base file that wasn't overridden persists
	assert.Equal(t, "sqlite", config.SQLStore.Provider)
}

func TestNewSigNozConfig_EnvOverridesConfigFile(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.yaml")
	err := os.WriteFile(configPath, []byte(`
cache:
  provider: "fromfile"
`), 0644)
	require.NoError(t, err)

	t.Setenv("SIGNOZ_CACHE_PROVIDER", "fromenv")

	logger := slog.New(slog.DiscardHandler)
	config, err := NewSigNozConfig(context.Background(), logger, []string{configPath})
	require.NoError(t, err)
	// Env should override file
	assert.Equal(t, "fromenv", config.Cache.Provider)
}

func TestNewSigNozConfig_NonexistentFile(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)
	_, err := NewSigNozConfig(context.Background(), logger, []string{"/nonexistent/config.yaml"})
	assert.Error(t, err)
}
