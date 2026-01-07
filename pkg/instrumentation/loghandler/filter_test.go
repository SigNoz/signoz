package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFilter_ContextCanceled(t *testing.T) {
	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{
		base:     slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}),
		wrappers: []Wrapper{NewFilter()},
	})

	logger.Warn("ignore_message", "error", context.Canceled)

	// Buffer should be empty since the log should be filtered out
	assert.Empty(t, buf.Bytes(), "context.Canceled error should be filtered out")
}

func TestFilter_OtherErrors(t *testing.T) {
	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{
		base:     slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}),
		wrappers: []Wrapper{NewFilter()},
	})

	// Log with different error - should NOT be filtered
	logger.Warn("log_message", "error", context.DeadlineExceeded)

	// Buffer should contain the log entry
	require.NotEmpty(t, buf.Bytes(), "other errors should be logged")

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)

	assert.Equal(t, "log_message", m["msg"])
	assert.Equal(t, "WARN", m["level"])
	assert.Equal(t, "context deadline exceeded", m["error"])
}

func TestFilter_NoError(t *testing.T) {
	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{
		base:     slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}),
		wrappers: []Wrapper{NewFilter()},
	})

	// Log without error - should be logged normally
	logger.Info("normal_message", "key", "value")

	// Buffer should contain the log entry
	require.NotEmpty(t, buf.Bytes(), "logs without errors should be logged")

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)

	assert.Equal(t, "normal_message", m["msg"])
	assert.Equal(t, "value", m["key"])
}
