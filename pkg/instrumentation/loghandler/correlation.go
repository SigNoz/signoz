package loghandler

import (
	"context"
	"log/slog"

	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type correlation struct{}

func NewCorrelation() *correlation {
	return &correlation{}
}

func (h *correlation) Wrap(next LogHandler) LogHandler {
	return LogHandlerFunc(func(ctx context.Context, record slog.Record) error {
		span := trace.SpanFromContext(ctx)
		if span == nil || !span.IsRecording() {
			return next.Handle(ctx, record)
		}

		// Adding span info to log record.
		spanContext := span.SpanContext()
		if spanContext.HasTraceID() {
			traceID := spanContext.TraceID().String()
			record.AddAttrs(slog.String("trace_id", traceID))
		}

		if spanContext.HasSpanID() {
			spanID := spanContext.SpanID().String()
			record.AddAttrs(slog.String("span_id", spanID))
		}

		// Setting span status if the log is an error.
		// Purposely leaving as codes.Unset (default) otherwise.
		if record.Level >= slog.LevelError {
			span.SetStatus(codes.Error, record.Message)
		}

		return next.Handle(ctx, record)
	})
}
