package loghandler

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/sdk/trace"
)

func TestCorrelation(t *testing.T) {
	correlation := NewCorrelation()

	buf := bytes.NewBuffer(nil)
	logger := slog.New(&handler{base: slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug}), wrappers: []Wrapper{correlation}})

	tracer := trace.NewTracerProvider().Tracer("test")
	ctx, span := tracer.Start(context.Background(), "test")
	defer span.End()

	logger.InfoContext(ctx, "test")

	m := make(map[string]any)
	err := json.Unmarshal(buf.Bytes(), &m)
	require.NoError(t, err)

	assert.Equal(t, span.SpanContext().TraceID().String(), m["trace_id"])
	assert.Equal(t, span.SpanContext().SpanID().String(), m["span_id"])
}
