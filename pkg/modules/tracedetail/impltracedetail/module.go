package impltracedetail

import (
	"context"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/spanpercentile"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.opentelemetry.io/otel/metric"
	"golang.org/x/sync/errgroup"
)

// The span percentile compares a span with those of the hour before it, and gives up after 2 seconds.
const (
	spanPercentileWindow  = time.Hour
	spanPercentileTimeout = 2 * time.Second
)

// formattedSpansLogThreshold is the number of formatted gen_ai spans in one waterfall response above which
// the response is logged, to size the memory the formatted copies of the messages take.
const formattedSpansLogThreshold = 200

type module struct {
	store          spantypes.TraceStore
	spanPercentile spanpercentile.Module
	settings       factory.ScopedProviderSettings
	config         tracedetail.Config
	metrics        *moduleMetrics
}

func NewModule(traceStore spantypes.TraceStore, spanPercentile spanpercentile.Module, providerSettings factory.ProviderSettings, cfg tracedetail.Config) *module {
	scopedProviderSettings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail")

	metrics, err := newModuleMetrics(scopedProviderSettings.Meter())
	if err != nil {
		panic(err)
	}

	m := &module{
		config:         cfg,
		store:          traceStore,
		spanPercentile: spanPercentile,
		settings:       scopedProviderSettings,
		metrics:        metrics,
	}

	m.metrics.waterfallSpanLimit.Record(context.Background(), int64(cfg.Waterfall.MaxLimitToSelectAllSpans), metric.WithAttributes(attrResponseType.String(attrResponseTypeWindowed)))
	m.metrics.flamegraphSpanLimit.Record(context.Background(), int64(cfg.Flamegraph.SelectAllSpansLimit), metric.WithAttributes(attrResponseType.String(attrResponseTypeSampled)))

	return m
}

func (m *module) GetTraceSummary(ctx context.Context, orgID valuer.UUID, traceID string) (*spantypes.TraceStats, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}
	stats, err := m.store.GetTraceStats(ctx, orgID, traceID, bounds)
	if err != nil {
		return nil, err
	}
	if stats.TotalSpans == 0 {
		return nil, spantypes.ErrTraceNotFound
	}
	return stats, nil
}

// GetWaterfallV4 is the OOM-safe V4 waterfall.
// For large traces (NumSpans > effectiveLimit) it uses a two-step fetch:
// minimal fields for all spans to build the tree, then full fields for the
// visible window only. Aggregations are not returned.
func (m *module) GetWaterfallV4(ctx context.Context, orgID valuer.UUID, traceID string, selectedSpanID string, uncollapsedSpans []string) (*spantypes.GettableWaterfallTrace, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}
	windowed := bounds.NumSpans > uint64(m.config.Waterfall.MaxLimitToSelectAllSpans)
	if windowed {
		attrs := metric.WithAttributes(attrResponseType.String(attrResponseTypeWindowed))
		m.metrics.waterfallRequestCount.Add(ctx, 1, attrs)
		m.metrics.waterfallSpanCount.Add(ctx, int64(bounds.NumSpans), attrs)
	}

	var trace *spantypes.GettableWaterfallTrace
	if windowed {
		trace, err = m.getWindowedWaterfall(ctx, traceID, selectedSpanID, uncollapsedSpans, bounds.Start, bounds.End)
	} else {
		trace, err = m.getFullWaterfall(ctx, traceID, bounds)
	}
	if err != nil {
		return nil, err
	}
	if trace.FormattedSpans > formattedSpansLogThreshold {
		m.settings.Logger().WarnContext(ctx, "waterfall response carries many formatted gen_ai spans", slog.String("trace_id", traceID), slog.Int("formatted_spans", trace.FormattedSpans), slog.Int("spans", len(trace.Spans)), slog.Bool("windowed", trace.HasMore))
	}
	return trace, nil
}

func (m *module) getFullWaterfall(ctx context.Context, traceID string, bounds *spantypes.TraceBounds) (*spantypes.GettableWaterfallTrace, error) {
	spanItems, err := m.store.GetTraceSpans(ctx, traceID, bounds)
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
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}

	traceDurationNs := uint64(bounds.End.UnixNano()) - uint64(bounds.Start.UnixNano())

	results := make([]spantypes.SpanAggregationResult, 0, len(req.Aggregations))
	for _, agg := range req.Aggregations {
		result := spantypes.SpanAggregationResult{Field: agg.Field, Aggregation: agg.Aggregation}
		switch agg.Aggregation {
		case spantypes.SpanAggregationSpanCount:
			result.Value, err = m.store.GetSpanCountByField(ctx, traceID, bounds, agg.Field)
			if err != nil {
				return nil, err
			}
		case spantypes.SpanAggregationDuration:
			durationNs, err2 := m.store.GetSpanDurationByField(ctx, traceID, bounds, agg.Field)
			if err2 != nil {
				return nil, err2
			}
			result.Value = make(map[string]uint64, len(durationNs))
			for k, ns := range durationNs {
				result.Value[k] = ns / 1_000_000
			}
		case spantypes.SpanAggregationExecutionTimePercentage:
			durationNs, err2 := m.store.GetSpanDurationByField(ctx, traceID, bounds, agg.Field)
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
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}
	if bounds.NumSpans <= uint64(m.config.Flamegraph.SelectAllSpansLimit) {
		return m.getFullFlamegraph(ctx, traceID, bounds, selectFields)
	}
	m.metrics.flamegraphRequestCount.Add(ctx, 1, metric.WithAttributes(attrResponseType.String(attrResponseTypeSampled)))
	return m.getWindowedFlamegraph(ctx, traceID, selectedSpanID, bounds, selectFields)
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

func (m *module) GetThread(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.ThreadQuery) (*spantypes.GettableTraceThread, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}

	// One extra row per side signals a next/prev page; NewGettableTraceThread trims the response back to query.Limit.
	page := spantypes.ThreadPage{Limit: query.Limit + 1}
	switch {
	case query.SpanID != "":
		// Window centred on the span: fetch both directions, NewGettableTraceThread splits the limit.
		anchor, err := m.store.GetThreadCursor(ctx, traceID, bounds, query.SpanID)
		if err != nil {
			return nil, err
		}
		before, err := m.store.GetThreadSpans(ctx, orgID, traceID, bounds, spantypes.ThreadPage{Cursor: anchor, From: spantypes.ThreadBefore, Limit: page.Limit})
		if err != nil {
			return nil, err
		}
		// ThreadAt keeps the anchor when it carries messages; otherwise the filter drops it.
		after, err := m.store.GetThreadSpans(ctx, orgID, traceID, bounds, spantypes.ThreadPage{Cursor: anchor, From: spantypes.ThreadAt, Limit: page.Limit})
		if err != nil {
			return nil, err
		}
		return spantypes.NewGettableTraceThread(traceID, query, before, after), nil
	case query.Before != nil:
		page.Cursor, page.From = query.Before, spantypes.ThreadBefore
		before, err := m.store.GetThreadSpans(ctx, orgID, traceID, bounds, page)
		if err != nil {
			return nil, err
		}
		return spantypes.NewGettableTraceThread(traceID, query, before, nil), nil
	default:
		// nil for the first page.
		page.Cursor = query.After
		after, err := m.store.GetThreadSpans(ctx, orgID, traceID, bounds, page)
		if err != nil {
			return nil, err
		}
		return spantypes.NewGettableTraceThread(traceID, query, nil, after), nil
	}
}

func (m *module) getFullFlamegraph(ctx context.Context, traceID string, bounds *spantypes.TraceBounds, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error) {
	fullSpans, err := m.store.GetFlamegraphSpans(ctx, traceID, bounds.Start, bounds.End, nil)
	if err != nil {
		return nil, err
	}
	if len(fullSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}
	flamegraphTrace := spantypes.NewFlamegraphTraceFromStorable(fullSpans, selectFields)
	start, end := flamegraphTrace.TimeRange()
	return spantypes.NewGettableFlamegraphTrace(flamegraphTrace.GetAllLevels(), start, end, false), nil
}

// getWindowedFlamegraph returns a window of a max levels and max sampled spans per level around the selected span.
func (m *module) getWindowedFlamegraph(ctx context.Context, traceID, selectedSpanID string, bounds *spantypes.TraceBounds, selectFields []telemetrytypes.TelemetryFieldKey) (*spantypes.GettableFlamegraphTrace, error) {
	minimalSpans, err := m.store.GetMinimalSpans(ctx, traceID, bounds.Start, bounds.End)
	if err != nil {
		return nil, err
	}
	if len(minimalSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	flamegraphTrace := spantypes.NewFlamegraphTraceFromMinimal(minimalSpans)
	minimalSpans = nil //nolint:ineffassign,wastedassign // release backing array before further db calls

	start, end := flamegraphTrace.TimeRange()

	cfg := m.config.Flamegraph
	selectedSpans := flamegraphTrace.GetSelectedLevels(selectedSpanID, cfg.MaxSelectedLevels, cfg.MaxSpansPerLevel, cfg.SamplingTopLatencySpansCount, cfg.SamplingBucketCount)
	if len(selectedSpans) == 0 {
		return nil, spantypes.ErrTraceNotFound
	}

	fullSpans, err := m.store.GetFlamegraphSpans(ctx, traceID, bounds.Start, bounds.End, spantypes.FlamegraphWindowSpanIDs(selectedSpans))
	if err != nil {
		return nil, err
	}

	enrichedSpans := flamegraphTrace.EnrichSelectedSpans(selectedSpans, fullSpans, selectFields)
	return spantypes.NewGettableFlamegraphTrace(enrichedSpans, start, end, true), nil
}

func (m *module) InspectTrace(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.InspectQuery) (*spantypes.GettableTraceInspection, error) {
	inspection := &spantypes.GettableTraceInspection{Type: query.Type}
	var err error
	switch query.Type {
	case spantypes.InspectTypeSpan:
		inspection.Span, err = m.getTraceSpan(ctx, orgID, traceID, query)
	case spantypes.InspectTypeFind:
		inspection.Find, err = m.findTraceSpans(ctx, orgID, traceID, query)
	default:
		inspection.Overview, err = m.getTraceOverview(ctx, orgID, traceID, query)
	}
	if err != nil {
		return nil, err
	}
	return inspection, nil
}

// getTraceSpan returns one span in full with the spans around it. The tree and the span's own
// data are loaded side by side.
func (m *module) getTraceSpan(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.InspectQuery) (*spantypes.TraceSpanDetail, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}

	var (
		skeleton   *spantypes.TraceSkeleton
		spans      []spantypes.StorableSpan
		percentile *spantypes.TraceSpanPercentile
	)
	group, groupCtx := errgroup.WithContext(ctx)
	group.Go(func() error {
		var err error
		skeleton, err = m.loadSkeleton(groupCtx, orgID, traceID, bounds, false, false)
		return err
	})
	group.Go(func() error {
		var err error
		spans, err = m.store.GetTraceSpansByIDs(groupCtx, traceID, bounds.Start, bounds.End, []string{query.SpanID})
		if err != nil || len(spans) == 0 {
			return err
		}
		percentile = m.getSpanPercentile(groupCtx, orgID, &spans[0])
		return nil
	})
	if err := group.Wait(); err != nil {
		return nil, err
	}
	idx, ok := skeleton.Index(query.SpanID)
	if !ok || len(spans) == 0 {
		return nil, errors.NewNotFoundf(spantypes.ErrCodeInspectSpanNotFound, "span %s not found in trace %s", query.SpanID, traceID)
	}

	detail := skeleton.SpanDetail(idx, query.Depth)
	detail.Record = spantypes.NewSpanRecord(&spans[0], query.SelectFields)
	detail.Percentile = percentile
	spantypes.FitSpan(detail)
	return detail, nil
}

// findTraceSpans returns a page of every span of the trace, or of the spans matching a search.
func (m *module) findTraceSpans(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.InspectQuery) (*spantypes.TraceSpanList, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}

	if query.AllSpans {
		skeleton, err := m.loadSkeleton(ctx, orgID, traceID, bounds, false, false)
		if err != nil {
			return nil, err
		}
		if query.SpanID == "" {
			return skeleton.SpanPage(nil, query.Offset, query.Limit), nil
		}
		root, ok := skeleton.Index(query.SpanID)
		if !ok {
			return nil, errors.NewNotFoundf(spantypes.ErrCodeInspectSpanNotFound, "span %s not found in trace %s", query.SpanID, traceID)
		}
		return skeleton.SpanPage(&root, query.Offset, query.Limit), nil
	}

	// The tree gives each match its place; the search and the matched spans' own data load beside it.
	var (
		skeleton *spantypes.TraceSkeleton
		search   *spantypes.TraceSpanSearch
		spans    []spantypes.StorableSpan
	)
	group, groupCtx := errgroup.WithContext(ctx)
	group.Go(func() error {
		var err error
		skeleton, err = m.loadSkeleton(groupCtx, orgID, traceID, bounds, false, false)
		return err
	})
	group.Go(func() error {
		var err error
		search, err = m.store.SearchTraceSpans(groupCtx, orgID, traceID, bounds, &spantypes.SpansQuery{Search: query.Search, Limit: query.Limit, After: query.After})
		if err != nil {
			return err
		}
		spans, err = m.store.GetTraceSpansByIDs(groupCtx, traceID, bounds.Start, bounds.End, search.SpanIDs())
		return err
	})
	if err := group.Wait(); err != nil {
		return nil, err
	}
	return spantypes.NewTraceSpanList(skeleton, search, spans), nil
}

// getSpanPercentile places the span among those of the same name and service that started in the
// hour before it. It reads across traces, so it is cut short and left out when slow or failing.
func (m *module) getSpanPercentile(ctx context.Context, orgID valuer.UUID, span *spantypes.StorableSpan) *spantypes.TraceSpanPercentile {
	if span.Name == "" || span.ServiceName == "" || span.DurationNano == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(ctx, spanPercentileTimeout)
	defer cancel()

	startMillis := uint64(span.StartTime.UnixMilli())
	response, err := m.spanPercentile.GetSpanPercentile(ctx, orgID, &spanpercentiletypes.SpanPercentileRequest{
		DurationNano: int64(span.DurationNano),
		Name:         span.Name,
		ServiceName:  span.ServiceName,
		Start:        startMillis - uint64(spanPercentileWindow.Milliseconds()),
		End:          startMillis + 1,
	})
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			m.settings.Logger().WarnContext(ctx, "span percentile left out of trace inspect", errors.Attr(err), slog.String("span_name", span.Name), slog.String("service_name", span.ServiceName))
		}
		return nil
	}
	return &spantypes.TraceSpanPercentile{
		P50Nano:       uint64(response.Percentiles.P50),
		P90Nano:       uint64(response.Percentiles.P90),
		P99Nano:       uint64(response.Percentiles.P99),
		Position:      response.Position.Percentile,
		WindowMinutes: uint64(spanPercentileWindow.Minutes()),
	}
}

func (m *module) getTraceOverview(ctx context.Context, orgID valuer.UUID, traceID string, query *spantypes.InspectQuery) (*spantypes.TraceOverview, error) {
	bounds, err := m.store.GetTraceBounds(ctx, traceID)
	if err != nil {
		return nil, err
	}
	// A page of one list loads only what that list is built from.
	withAISpans := query.List == "" || query.List == spantypes.OverviewListExpensive
	withLinkedSpans := query.List == "" || query.List == spantypes.OverviewListLinks
	skeleton, err := m.loadSkeleton(ctx, orgID, traceID, bounds, withAISpans, withLinkedSpans)
	if err != nil {
		return nil, err
	}

	switch query.List {
	case spantypes.OverviewListErrors:
		errorList, err := m.errorPage(ctx, traceID, bounds, skeleton, query.Offset)
		if err != nil {
			return nil, err
		}
		return &spantypes.TraceOverview{Errors: errorList}, nil
	case spantypes.OverviewListUnmarkedFailures:
		return &spantypes.TraceOverview{UnmarkedFailures: skeleton.UnmarkedFailurePage(query.Offset)}, nil
	case spantypes.OverviewListSlowest:
		return &spantypes.TraceOverview{Slowest: skeleton.SlowestPage(query.Offset)}, nil
	case spantypes.OverviewListExpensive:
		return &spantypes.TraceOverview{Expensive: skeleton.ExpensivePage(query.Offset)}, nil
	case spantypes.OverviewListLinks:
		return &spantypes.TraceOverview{Links: skeleton.LinkPage(query.Offset)}, nil
	}

	errorList, err := m.errorPage(ctx, traceID, bounds, skeleton, 0)
	if err != nil {
		return nil, err
	}
	overview := &spantypes.TraceOverview{
		Identity:         skeleton.Identity(),
		Errors:           errorList,
		UnmarkedFailures: skeleton.UnmarkedFailurePage(0),
		Slowest:          skeleton.SlowestPage(0),
		Expensive:        skeleton.ExpensivePage(0),
		Links:            skeleton.LinkPage(0),
		Tree:             skeleton.Tree(),
	}
	if spantypes.IsSmallTrace(skeleton.Len()) {
		spans, err := m.store.GetTraceSpans(ctx, traceID, bounds)
		if err != nil {
			return nil, err
		}
		if records, ok := spantypes.SmallTraceRecords(spans); ok {
			overview.Tree.Records = records
		}
	}
	skeleton.FitOverview(overview)
	return overview, nil
}

func (m *module) errorPage(ctx context.Context, traceID string, bounds *spantypes.TraceBounds, skeleton *spantypes.TraceSkeleton, offset int) (*spantypes.TraceErrorList, error) {
	errorList, spanIDs := skeleton.ErrorPage(offset)
	messages, err := m.store.GetSpanStatusMessages(ctx, traceID, bounds, spanIDs)
	if err != nil {
		return nil, err
	}
	errorList.SetStatusMessages(messages)
	return errorList, nil
}

// loadSkeleton builds the span tree of the trace, with the gen_ai usage and the span links when asked for.
func (m *module) loadSkeleton(ctx context.Context, orgID valuer.UUID, traceID string, bounds *spantypes.TraceBounds, withAISpans, withLinkedSpans bool) (*spantypes.TraceSkeleton, error) {
	var (
		skeleton    *spantypes.TraceSkeleton
		aiSpans     []spantypes.AISpanUsage
		linkedSpans []spantypes.LinkedSpan
	)
	group, groupCtx := errgroup.WithContext(ctx)
	group.Go(func() error {
		var err error
		skeleton, err = m.store.GetTraceSkeleton(groupCtx, traceID, bounds)
		return err
	})
	if withAISpans {
		group.Go(func() error {
			var err error
			aiSpans, err = m.store.GetAISpanUsage(groupCtx, orgID, traceID, bounds)
			return err
		})
	}
	if withLinkedSpans {
		group.Go(func() error {
			var err error
			linkedSpans, err = m.store.GetLinkedSpans(groupCtx, traceID, bounds)
			return err
		})
	}
	if err := group.Wait(); err != nil {
		return nil, err
	}
	if skeleton.Len() == 0 {
		return nil, spantypes.ErrTraceNotFound
	}
	return skeleton.WithAISpans(aiSpans).WithLinkedSpans(linkedSpans), nil
}
