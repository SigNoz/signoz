package impltracedetail

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
)

type module struct {
	store    spantypes.TraceStore
	settings factory.ScopedProviderSettings
	config   tracedetail.Config
}

func NewModule(traceStore spantypes.TraceStore, providerSettings factory.ProviderSettings, cfg tracedetail.Config) *module {
	scopedProviderSettings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail")
	return &module{
		config:   cfg,
		store:    traceStore,
		settings: scopedProviderSettings,
	}
}

func (m *module) GetWaterfall(ctx context.Context, traceID string, req *spantypes.PostableWaterfall) (*spantypes.GettableWaterfallTrace, error) {
	waterfallTrace, err := m.getTraceData(ctx, traceID)
	if err != nil {
		return nil, err
	}

	selectedSpans, uncollapsedSpans, selectedAllSpans := waterfallTrace.GetWaterfallSpans(
		req.UncollapsedSpans,
		req.SelectedSpanID,
		min(req.Limit, m.config.Waterfall.MaxLimitToSelectAllSpans),
		m.config.Waterfall.SpanPageSize,
		m.config.Waterfall.MaxDepthToAutoExpand,
	)

	aggregationResults := make([]spantypes.SpanAggregationResult, 0, len(req.Aggregations))
	for _, a := range req.Aggregations {
		aggregationResults = append(aggregationResults, waterfallTrace.GetSpanAggregation(a.Aggregation, a.Field))
	}

	return spantypes.NewGettableWaterfallTrace(waterfallTrace, selectedSpans, uncollapsedSpans, selectedAllSpans, aggregationResults), nil
}

// getTraceData returns the waterfall cache for the given traceID with fallback on DB.
func (m *module) getTraceData(ctx context.Context, traceID string) (*spantypes.WaterfallTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}

	spanItems, err := m.store.GetTraceSpans(ctx, traceID, summary)
	if err != nil {
		return nil, err
	}

	if len(spanItems) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	traceData := spantypes.NewWaterfallTraceFromSpans(spanItems)
	return traceData, nil
}
