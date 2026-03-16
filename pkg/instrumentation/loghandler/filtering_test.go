package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFiltering_SuppressesContextCanceled(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.Error("operation failed", "error", context.Canceled)

	assert.Empty(t, buf.String(), "log with context.Canceled should be suppressed")
}

func TestFiltering_SuppressesWrappedContextCanceled(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	wrappedErr := fmt.Errorf("wrapped: %w", context.Canceled)
	logger.Error("operation failed", "error", wrappedErr)

	assert.Empty(t, buf.String(), "log with wrapped context.Canceled should be suppressed")
}

func TestFiltering_AllowsOtherErrors(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.Error("operation failed", "error", fmt.Errorf("some other error"))

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)
	assert.Equal(t, "operation failed", m["msg"])
}

func TestFiltering_AllowsLogsWithoutErrors(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.Info("normal log", "key", "value")

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)
	assert.Equal(t, "normal log", m["msg"])
}
