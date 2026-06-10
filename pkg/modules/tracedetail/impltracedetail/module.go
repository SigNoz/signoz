package impltracedetail

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"go.opentelemetry.io/otel/metric"
)

type module struct {
	store    spantypes.TraceStore
	settings factory.ScopedProviderSettings
	config   tracedetail.Config
	metrics  *moduleMetrics
}

func NewModule(traceStore spantypes.TraceStore, providerSettings factory.ProviderSettings, cfg tracedetail.Config) *module {
	scopedProviderSettings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail")

	metrics, err := newModuleMetrics(scopedProviderSettings.Meter())
	if err != nil {
		panic(err)
	}

	m := &module{
		config:   cfg,
		store:    traceStore,
		settings: scopedProviderSettings,
		metrics:  metrics,
	}

	m.metrics.waterfallSpanLimit.Record(context.Background(), int64(cfg.Waterfall.MaxLimitToSelectAllSpans), metric.WithAttributes(attrResponseType.String(attrResponseTypeWindowed)))
	m.metrics.flamegraphSpanLimit.Record(context.Background(), int64(cfg.Flamegraph.SelectAllSpansLimit), metric.WithAttributes(attrResponseType.String(attrResponseTypeSampled)))

	return m
}

// GetWaterfallV4 is the OOM-safe V4 waterfall.
// For large traces (NumSpans > effectiveLimit) it uses a two-step fetch:
// minimal fields for all spans to build the tree, then full fields for the
// visible window only. Aggregations are not returned.
func (m *module) GetWaterfallV4(ctx context.Context, traceID string, selectedSpanID string, uncollapsedSpans []string) (*spantypes.GettableWaterfallTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}
	if summary.NumSpans > uint64(m.config.Waterfall.MaxLimitToSelectAllSpans) {
		attrs := metric.WithAttributes(attrResponseType.String(attrResponseTypeWindowed))
		m.metrics.waterfallRequestCount.Add(ctx, 1, attrs)
		m.metrics.waterfallSpanCount.Add(ctx, int64(summary.NumSpans), attrs)
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

	return spantypes.NewGettableWaterfallTrace(waterfallTrace, selectedSpans, nil, true), nil
}

func (m *module) GetTraceAggregations(ctx context.Context, traceID string, req *spantypes.PostableTraceAggregations) (*spantypes.GettableTraceAggregations, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}

	traceDurationNs := uint64(summary.End.UnixNano()) - uint64(summary.Start.UnixNano())

	results := make([]spantypes.SpanAggregationResult, 0, len(req.Aggregations))
	for _, agg := range req.Aggregations {
		result := spantypes.SpanAggregationResult{Field: agg.Field, Aggregation: agg.Aggregation}
		switch agg.Aggregation {
		case spantypes.SpanAggregationSpanCount:
			result.Value, err = m.store.GetSpanCountByField(ctx, traceID, summary, agg.Field)
			if err != nil {
				return nil, err
			}
		case spantypes.SpanAggregationDuration:
			durationNs, err2 := m.store.GetSpanDurationByField(ctx, traceID, summary, agg.Field)
			if err2 != nil {
				return nil, err2
			}
			result.Value = make(map[string]uint64, len(durationNs))
			for k, ns := range durationNs {
				result.Value[k] = ns / 1_000_000
			}
		case spantypes.SpanAggregationExecutionTimePercentage:
			durationNs, err2 := m.store.GetSpanDurationByField(ctx, traceID, summary, agg.Field)
			if err2 != nil {
				return nil, err2
			}
			result.Value = make(map[string]uint64, len(durationNs))
			if traceDurationNs > 0 {
				for k, ns := range durationNs {
					result.Value[k] = ns * 100 / traceDurationNs
				}
			}
		}
		results = append(results, result)
	}
	return &spantypes.GettableTraceAggregations{Aggregations: results}, nil
}

func (m *module) GetFlamegraph(ctx context.Context, traceID string, selectedSpanID string, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error) {
	summary, err := m.store.GetTraceSummary(ctx, traceID)
	if err != nil {
		return nil, err
	}
	if summary.NumSpans <= uint64(m.config.Flamegraph.SelectAllSpansLimit) {
		return m.getFullFlamegraph(ctx, traceID, summary, selectFields)
	}
	m.metrics.flamegraphRequestCount.Add(ctx, 1, metric.WithAttributes(attrResponseType.String(attrResponseTypeSampled)))
	return m.getWindowedFlamegraph(ctx, traceID, selectedSpanID, summary, selectFields)
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
		waterfallTrace, selectedSpans, uncollapsedSpans, false,
	), nil
}

func (m *module) getFullFlamegraph(ctx context.Context, traceID string, summary *spantypes.TraceSummary, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error) {
	fullSpans, err := m.store.GetFlamegraphSpans(ctx, traceID, summary.Start, summary.End, nil)
	if err != nil {
		return nil, err
	}
	if len(fullSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}
	flamegraphTrace := spantypes.NewFlamegraphTraceFromStorable(fullSpans, selectFields)
	return spantypes.NewGettableFlamegraphTrace(flamegraphTrace.GetAllLevels(), summary.Start.UnixMilli(), summary.End.UnixMilli(), false), nil
}

// getWindowedFlamegraph returns a window of a max levels and max sampled spans per level around the selected span.
func (m *module) getWindowedFlamegraph(ctx context.Context, traceID, selectedSpanID string, summary *spantypes.TraceSummary, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error) {
	minimalSpans, err := m.store.GetMinimalSpans(ctx, traceID, summary.Start, summary.End)
	if err != nil {
		return nil, err
	}
	if len(minimalSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	flamegraphTrace := spantypes.NewFlamegraphTraceFromMinimal(minimalSpans)
	minimalSpans = nil //nolint:ineffassign,wastedassign // release backing array before further db calls

	cfg := m.config.Flamegraph
	selectedSpans := flamegraphTrace.GetSelectedLevels(selectedSpanID, cfg.MaxSelectedLevels, cfg.MaxSpansPerLevel, cfg.SamplingTopLatencySpansCount, cfg.SamplingBucketCount)
	if len(selectedSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	fullSpans, err := m.store.GetFlamegraphSpans(ctx, traceID, summary.Start, summary.End, spantypes.FlamegraphWindowSpanIDs(selectedSpans))
	if err != nil {
		return nil, err
	}

	return spantypes.NewGettableFlamegraphTrace(
		flamegraphTrace.EnrichSelectedSpans(selectedSpans, fullSpans, selectFields),
		summary.Start.UnixMilli(),
		summary.End.UnixMilli(),
		true,
	), nil
}
