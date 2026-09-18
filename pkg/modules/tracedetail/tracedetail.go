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
}

// Module defines the business logic for trace detail operations.
type Module interface {
	GetTraceStats(ctx context.Context, orgID valuer.UUID, traceID string) (*spantypes.TraceStats, error)
	GetWaterfallV4(ctx context.Context, traceID string, selectedSpanID string, uncollapsedSpans []string) (*spantypes.GettableWaterfallTrace, error)
	GetTraceAggregations(ctx context.Context, traceID string, req *spantypes.PostableTraceAggregations) (*spantypes.GettableTraceAggregations, error)
	GetFlamegraph(ctx context.Context, traceID string, selectedSpanID string, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error)
}
