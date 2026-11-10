package tracehandler

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
	"go.opentelemetry.io/otel/trace"
	tracenoop "go.opentelemetry.io/otel/trace/noop"
)

func TestWrappersChainInOrder(t *testing.T) {
	recorder := tracetest.NewSpanRecorder()
	var order []string
	observer := func(name string) Wrapper {
		return WrapperFunc(func(_ string, next StartFunc) StartFunc {
			return func(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
				order = append(order, name)
				return next(ctx, spanName, opts...)
			}
		})
	}
	provider := New(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)), observer("first"), observer("second"))

	_, span := provider.Tracer("test").Start(context.Background(), "op")
	span.End()

	assert.Equal(t, []string{"first", "second"}, order)
	require.Len(t, recorder.Ended(), 1)
	assert.Equal(t, "op", recorder.Ended()[0].Name())
}

func TestScopedWrapperSkipsOtherScopes(t *testing.T) {
	recorder := tracetest.NewSpanRecorder()
	noop := tracenoop.NewTracerProvider().Tracer("")
	dropAnonymous := WrapperFunc(func(scope string, next StartFunc) StartFunc {
		if scope != "" {
			return next
		}
		return func(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
			return noop.Start(ctx, spanName)
		}
	})
	provider := New(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)), dropAnonymous)

	_, dropped := provider.Tracer("").Start(context.Background(), "anon")
	dropped.End()
	_, kept := provider.Tracer("named").Start(context.Background(), "op")
	kept.End()

	require.Len(t, recorder.Ended(), 1)
	assert.Equal(t, "op", recorder.Ended()[0].Name())
}

func TestPromQL(t *testing.T) {
	recorder := tracetest.NewSpanRecorder()
	provider := New(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)), NewPromQL())

	ctx, root := provider.Tracer("http").Start(context.Background(), "GET /api")

	engineCtx, engineSpan := provider.Tracer("").Start(ctx, "promqlInnerEval eval *promql.BinaryExpr")
	assert.False(t, engineSpan.IsRecording(), "promql engine spans must not record")
	assert.Equal(t, root.SpanContext().SpanID(), engineSpan.SpanContext().SpanID(), "the filtered span must keep the parent's span context")

	_, child := provider.Tracer("clickhouse").Start(engineCtx, "clickhouse.query")
	child.End()

	_, other := provider.Tracer("").Start(ctx, "http.request")
	other.End()
	root.End()

	var names []string
	var childParent string
	for _, span := range recorder.Ended() {
		names = append(names, span.Name())
		if span.Name() == "clickhouse.query" {
			childParent = span.Parent().SpanID().String()
		}
	}
	require.ElementsMatch(t, []string{"clickhouse.query", "http.request", "GET /api"}, names)
	assert.Equal(t, root.SpanContext().SpanID().String(), childParent, "descendants of a filtered span must attach to the surrounding span")
	assert.False(t, strings.HasPrefix(recorder.Ended()[0].Name(), "promql"))
}
