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

	assert.Contains(t, m, "code.filepath")
	assert.Contains(t, m, "code.function")
	assert.Contains(t, m, "code.lineno")

	assert.Contains(t, m["code.filepath"], "source_test.go")
	assert.Contains(t, m["code.function"], "TestSource")
	assert.NotZero(t, m["code.lineno"])

	// Ensure the nested "source" key is not present.
	assert.NotContains(t, m, "source")
	assert.NotContains(t, m, "code")
}
