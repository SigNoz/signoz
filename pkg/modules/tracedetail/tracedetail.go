package tracedetail

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Handler exposes HTTP handlers for trace detail APIs.
type Handler interface {
	GetTraceSummary(http.ResponseWriter, *http.Request)
	GetWaterfallV4(http.ResponseWriter, *http.Request)
	GetTraceAggregations(http.ResponseWriter, *http.Request)
	GetFlamegraph(http.ResponseWriter, *http.Request)
	GetThread(http.ResponseWriter, *http.Request)
	GetTraceHighlights(http.ResponseWriter, *http.Request)
	ListTraceSpans(http.ResponseWriter, *http.Request)
	GetTraceSpan(http.ResponseWriter, *http.Request)
	ListTraceSpanChildren(http.ResponseWriter, *http.Request)
	ListTraceSpanDescendants(http.ResponseWriter, *http.Request)
	ListTraceSpanAncestors(http.ResponseWriter, *http.Request)
}

// Module defines the business logic for trace detail operations.
type Module interface {
	GetTraceSummary(ctx context.Context, orgID valuer.UUID, traceID string) (*spantypes.TraceStats, error)
	GetWaterfallV4(ctx context.Context, orgID valuer.UUID, traceID string, selectedSpanID string, uncollapsedSpans []string) (*spantypes.GettableWaterfallTrace, error)
	GetTraceAggregations(ctx context.Context, traceID string, req *spantypes.PostableTraceAggregations) (*spantypes.GettableTraceAggregations, error)
	GetFlamegraph(ctx context.Context, traceID string, selectedSpanID string, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error)
	GetThread(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.ThreadQuery) (*spantypes.GettableTraceThread, error)
	GetTraceHighlights(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.TraceHighlightsQuery) (*spantypes.TraceHighlights, error)
	GetTraceSpan(ctx context.Context, traceID string, spanID string) (*spantypes.Span, error)
	ListTraceSpans(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.SpanListQuery) (*spantypes.SpanList, error)
}
