package instrumentation

import (
	"context"

	"go.opentelemetry.io/otel/trace"
)

// Gets a trace id and span id from the input context.
// It return false if no span or trace is present in the context.
func GetTraceIdAndSpanId(ctx context.Context) (string, string, bool) {
	span := trace.SpanFromContext(ctx)

	if ok := span.SpanContext().HasTraceID(); ok {
		if ok := span.SpanContext().HasSpanID(); ok {
			return span.SpanContext().TraceID().String(), span.SpanContext().SpanID().String(), true
		}
	}

	return "", "", false
}
