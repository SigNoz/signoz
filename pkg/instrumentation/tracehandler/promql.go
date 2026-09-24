package tracehandler

import (
	"context"
	"strings"

	"go.opentelemetry.io/otel/trace"
	tracenoop "go.opentelemetry.io/otel/trace/noop"
)

// TODO(srikanthccv): replace with the tracer scope filter (per-scope
// "enabled") when the otel-go trace SDK ships it
// (https://github.com/open-telemetry/opentelemetry-go/issues/8411).
func NewPromQL() Wrapper {
	noop := tracenoop.NewTracerProvider().Tracer("")
	return WrapperFunc(func(scope string, next StartFunc) StartFunc {
		if scope != "" {
			return next
		}
		return func(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
			if strings.HasPrefix(spanName, "promql") {
				return noop.Start(ctx, spanName)
			}
			return next(ctx, spanName, opts...)
		}
	})
}
