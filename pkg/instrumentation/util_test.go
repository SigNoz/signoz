package instrumentation

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel/trace"
)

func TestGetTraceIdAndSpanIdWhenPresent(t *testing.T) {
	ctx := context.Background()

	expectedTraceId, err := trace.TraceIDFromHex("0123456789abcdef0123456789abcdef")
	require.NoError(t, err)

	expectedSpanId, err := trace.SpanIDFromHex("0123456789abcdef")
	require.NoError(t, err)

	spanContext := trace.NewSpanContext(trace.SpanContextConfig{
		TraceID: expectedTraceId,
		SpanID:  expectedSpanId,
	})
	ctx = trace.ContextWithSpanContext(ctx, spanContext)

	actualTraceId, actualSpanId, ok := GetTraceIdAndSpanId(ctx)

	assert.True(t, ok)
	assert.Equal(t, expectedTraceId.String(), actualTraceId)
	assert.Equal(t, expectedSpanId.String(), actualSpanId)
}

func TestGetTraceIdAndSpanIdWhenTraceIdNotPresent(t *testing.T) {
	ctx := context.Background()

	expectedSpanId, err := trace.SpanIDFromHex("0123456789abcdef")
	require.NoError(t, err)

	spanContext := trace.NewSpanContext(trace.SpanContextConfig{
		SpanID: expectedSpanId,
	})
	ctx = trace.ContextWithSpanContext(ctx, spanContext)

	_, _, ok := GetTraceIdAndSpanId(ctx)

	assert.False(t, ok)
}
