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
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}
	effectiveLimit := min(req.Limit, m.config.Waterfall.MaxLimitToSelectAllSpans)
	if summary.NumSpans > uint64(effectiveLimit) {
		return m.getWindowedWaterfall(ctx, traceID, req, summary, effectiveLimit)
	}
	return m.getFullWaterfall(ctx, traceID, summary)
}

func (m *module) getFullWaterfall(ctx context.Context, traceID string, summary *spantypes.TraceSummary) (*spantypes.GettableWaterfallTrace, error) {
	spanItems, err := m.store.GetTraceSpans(ctx, traceID, summary)
	if err != nil {
		return nil, err
	}

	if len(spanItems) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	nodes := make([]*spantypes.WaterfallSpan, len(spanItems))
	for i := range spanItems {
		nodes[i] = spanItems[i].ToWaterfallSpan()
	}
	waterfallTrace := spantypes.NewWaterfallTraceFromSpans(nodes)
	selectedSpans := waterfallTrace.GetAllSpans()

	return spantypes.NewGettableWaterfallTrace(waterfallTrace, selectedSpans, nil, true, nil), nil
}

// getWindowedWaterfall builds the waterfall tree with minimal data and then returns only a window of full spans
func (m *module) getWindowedWaterfall(ctx context.Context, traceID string, req *spantypes.PostableWaterfall, summary *spantypes.TraceSummary, effectiveLimit uint) (*spantypes.GettableWaterfallTrace, error) {
	// Step 1: minimal fetch → build full tree → select visible window
	minimalSpans, err := m.store.GetMinimalSpans(ctx, traceID, summary)
	if err != nil {
		return nil, err
	}
	if len(minimalSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	nodes := make([]*spantypes.WaterfallSpan, len(minimalSpans))
	for i := range minimalSpans {
		nodes[i] = minimalSpans[i].ToWaterfallSpan()
	}
	waterfallTrace := spantypes.NewWaterfallTraceFromSpans(nodes)

	selectedSpans, uncollapsedSpans := waterfallTrace.GetSelectedSpans(
		req.UncollapsedSpans,
		req.SelectedSpanID,
		m.config.Waterfall.SpanPageSize,
		m.config.Waterfall.MaxDepthToAutoExpand,
	)

	aggregationResults := make([]spantypes.SpanAggregationResult, 0, len(req.Aggregations))
	for _, a := range req.Aggregations {
		aggregationResults = append(aggregationResults, waterfallTrace.GetSpanAggregation(a.Aggregation, a.Field))
	}

	// Step 2: full fetch for the selected window only
	spanIDs := make([]string, len(selectedSpans))
	for i, s := range selectedSpans {
		spanIDs[i] = s.SpanID
	}
	fullSpans, err := m.store.GetTraceSpansByIDs(ctx, traceID, summary, spanIDs)
	if err != nil {
		return nil, err
	}

	// Replace minimal WaterfallSpans with full ones, preserving tree metadata.
	fullByID := make(map[string]*spantypes.StorableSpan, len(fullSpans))
	for i := range fullSpans {
		fullByID[fullSpans[i].SpanID] = &fullSpans[i]
	}
	for i, ws := range selectedSpans {
		full, ok := fullByID[ws.SpanID]
		if !ok {
			continue // synthesized MissingSpan — keep empty shell
		}
		newWS := full.ToWaterfallSpan()
		newWS.Level = ws.Level
		newWS.HasChildren = ws.HasChildren
		newWS.SubTreeNodeCount = ws.SubTreeNodeCount
		selectedSpans[i] = newWS
	}

	return spantypes.NewGettableWaterfallTrace(
		waterfallTrace, selectedSpans, uncollapsedSpans, false, aggregationResults,
	), nil
}
