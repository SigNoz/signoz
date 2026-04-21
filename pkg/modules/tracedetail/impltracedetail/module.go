package impltracedetail

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
)

type module struct {
	store  tracedetailtypes.TraceStore
	logger *slog.Logger
}

func NewModule(telemetryStore telemetrystore.TelemetryStore, providerSettings factory.ProviderSettings) *module {
	scopedProviderSettings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail")
	return &module{
		store:  newClickhouseTraceStore(telemetryStore),
		logger: scopedProviderSettings.Logger(),
	}
}

func (m *module) GetWaterfall(ctx context.Context, traceID string, req *tracedetailtypes.WaterfallRequest) (*tracedetailtypes.GettableWaterfallTrace, error) {
	waterfallTrace, err := m.getTraceData(ctx, traceID)
	if err != nil {
		return nil, err
	}

	// Span selection: all spans or windowed
	limit := min(req.Limit, tracedetailtypes.MaxLimitToSelectAllSpans)
	selectAllSpans := waterfallTrace.TotalSpans <= uint64(limit)

	var (
		selectedSpans    []*tracedetailtypes.WaterfallSpan
		uncollapsedSpans []string
	)

	if selectAllSpans {
		selectedSpans = waterfallTrace.GetPreOrderedSpans()
	} else {
		selectedSpans, uncollapsedSpans = waterfallTrace.GetSelectedSpans(req.UncollapsedSpans, req.SelectedSpanID)
	}

	return tracedetailtypes.NewGettableWaterfallTrace(waterfallTrace, selectedSpans, uncollapsedSpans, selectAllSpans), nil
}

// getTraceData returns the waterfall cache for the given traceID with fallback on DB.
func (m *module) getTraceData(ctx context.Context, traceID string) (*tracedetailtypes.WaterfallTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}

	spanItems, err := m.store.GetTraceSpans(ctx, traceID, summary)
	if err != nil {
		return nil, err
	}

	if len(spanItems) == 0 {
		return nil, tracedetailtypes.ErrTraceNotFound
	}

	traceData := tracedetailtypes.NewWaterfallTraceFromSpans(spanItems)
	return traceData, nil
}
