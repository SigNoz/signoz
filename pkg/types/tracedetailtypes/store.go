package tracedetailtypes

import "context"

// TraceStore defines the data access interface for trace detail queries.
type TraceStore interface {
	GetTraceSummary(ctx context.Context, traceID string) (*TraceSummary, error)
	GetTraceSpans(ctx context.Context, traceID string, summary *TraceSummary) ([]StorableSpan, error)
}
