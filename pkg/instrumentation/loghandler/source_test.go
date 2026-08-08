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

func TestSource(t *testing.T) {
	src := NewSource()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{src}})

	logger.InfoContext(context.Background(), "test")

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)

	assert.Contains(t, m, "code.file.path")
	assert.Contains(t, m, "code.function.name")
	assert.Contains(t, m, "code.line.number")

	assert.Contains(t, m["code.file.path"], "source_test.go")
	assert.Contains(t, m["code.function.name"], "TestSource")
	assert.NotZero(t, m["code.line.number"])

	// Ensure the nested "source" key is not present.
	assert.NotContains(t, m, "source")
	assert.NotContains(t, m, "code")
}
