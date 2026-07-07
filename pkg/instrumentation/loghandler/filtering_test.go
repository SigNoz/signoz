package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFiltering_SuppressesContextCanceled(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.ErrorContext(context.Background(), "operation failed", slog.Any("error", context.Canceled))

	assert.Empty(t, buf.String(), "log with context.Canceled should be suppressed")
}

func TestFiltering_AllowsOtherErrors(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.ErrorContext(context.Background(), "operation failed", slog.Any("error", errors.New(errors.TypeInternal, errors.CodeInternal, "some other error")))

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)
	assert.Equal(t, "operation failed", m["msg"])
}

func TestFiltering_AllowsLogsWithoutErrors(t *testing.T) {
	filtering := NewFiltering()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{filtering}})

	logger.InfoContext(context.Background(), "normal log", slog.String("key", "value"))

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)
	assert.Equal(t, "normal log", m["msg"])
}
