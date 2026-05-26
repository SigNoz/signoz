package impltracedetail

import (
	"context"
	"time"

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

// getTraceData fetches all spans for a trace and builds the WaterfallTrace.
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

	nodes := make([]*spantypes.WaterfallSpan, len(spanItems))
	for i := range spanItems {
		nodes[i] = spanItems[i].ToWaterfallSpan(traceID)
	}
	return spantypes.NewWaterfallTraceFromSpans(nodes), nil
}

// GetWaterfallV4 is the OOM-safe V4 waterfall.
// For large traces (NumSpans > effectiveLimit) it uses a two-step fetch:
// minimal fields for all spans to build the tree, then full fields for the
// visible window only. Aggregations are not returned.
func (m *module) GetWaterfallV4(ctx context.Context, traceID string, selectedSpanID string, uncollapsedSpans []string, selectAllLimit uint) (*spantypes.GettableWaterfallTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}
	effectiveLimit := min(selectAllLimit, m.config.Waterfall.MaxLimitToSelectAllSpans)
	if summary.NumSpans > uint64(effectiveLimit) {
		return m.getWindowedWaterfall(ctx, traceID, selectedSpanID, uncollapsedSpans, summary.Start, summary.End)
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
		nodes[i] = spanItems[i].ToWaterfallSpan(traceID)
	}
	waterfallTrace := spantypes.NewWaterfallTraceFromSpans(nodes)
	selectedSpans := waterfallTrace.GetAllSpans()

	return spantypes.NewGettableWaterfallTrace(waterfallTrace, selectedSpans, nil, true, nil), nil
}

func (m *module) GetFlamegraph(ctx context.Context, traceID string, req *spantypes.PostableFlamegraph) (*spantypes.GettableFlamegraphTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}

	// Step 1: fetch minimal spans → BFS tree → window selection
	minimalSpans, err := m.store.GetMinimalSpans(ctx, traceID, summary.Start, summary.End)
	if err != nil {
		return nil, err
	}
	if len(minimalSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	flamegraphTrace := spantypes.NewFlamegraphTraceFromMinimal(minimalSpans)
	minimalSpans = nil

	cfg := m.config.Flamegraph
	selectedSpans, hasMore := flamegraphTrace.GetSelectedSpans(req.SelectedSpanID, cfg.SelectAllSpansLimit,
		cfg.MaxSelectedLevels, cfg.MaxSpansPerLevel, cfg.SamplingTopLatencySpansCount, cfg.SamplingBucketCount)
	if len(selectedSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	// Step 2: fetch full data for selected spans
	fullSpans, err := m.store.GetTraceSpansByIDs(ctx, traceID, summary.Start, summary.End,
		spantypes.FlamegraphWindowSpanIDs(selectedSpans))
	if err != nil {
		return nil, err
	}

	resultSpans := flamegraphTrace.EnrichWindow(selectedSpans, fullSpans)
	return spantypes.NewGettableFlamegraphTrace(resultSpans, summary.Start.UnixMilli(), summary.End.UnixMilli(), hasMore), nil
}

// getWindowedWaterfall builds the waterfall tree with minimal data and then returns only a window of full spans.
func (m *module) getWindowedWaterfall(ctx context.Context, traceID, selectedSpanID string, uncollapsedSpans []string, start, end time.Time) (*spantypes.GettableWaterfallTrace, error) {
	// Step 1: minimal fetch → build full tree → select visible window
	minimalSpans, err := m.store.GetMinimalSpans(ctx, traceID, start, end)
	if err != nil {
		return nil, err
	}
	if len(minimalSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	nodes := make([]*spantypes.WaterfallSpan, len(minimalSpans))
	for i := range minimalSpans {
		nodes[i] = minimalSpans[i].ToWaterfallSpan(traceID)
	}
	waterfallTrace := spantypes.NewWaterfallTraceFromSpans(nodes)

	selectedSpans, uncollapsedSpans := waterfallTrace.GetSelectedSpans(
		uncollapsedSpans,
		selectedSpanID,
		m.config.Waterfall.SpanPageSize,
		m.config.Waterfall.MaxDepthToAutoExpand,
	)

	// Step 2: full fetch for the selected window only
	spanIDs := make([]string, len(selectedSpans))
	for i, s := range selectedSpans {
		spanIDs[i] = s.SpanID
	}
	fullSpans, err := m.store.GetTraceSpansByIDs(ctx, traceID, start, end, spanIDs)
	if err != nil {
		return nil, err
	}

	spantypes.EnrichSelectedSpans(selectedSpans, fullSpans)

	return spantypes.NewGettableWaterfallTrace(
		waterfallTrace, selectedSpans, uncollapsedSpans, false, nil,
	), nil
}
