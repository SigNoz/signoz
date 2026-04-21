package impltracedetail

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store  tracedetailtypes.TraceStore
	cache  cache.Cache
	logger *slog.Logger
}

func NewModule(telemetryStore telemetrystore.TelemetryStore, cache cache.Cache, providerSettings factory.ProviderSettings) tracedetail.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail")
	return &module{
		store:  newClickhouseTraceStore(telemetryStore),
		cache:  cache,
		logger: scopedProviderSettings.Logger(),
	}
}

func (m *module) GetWaterfall(ctx context.Context, orgID valuer.UUID, traceID string, req *tracedetailtypes.WaterfallRequest) (*tracedetailtypes.GettableWaterfallTrace, error) {
	waterfallTrace, err := m.getTraceData(ctx, orgID, traceID)
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
func (m *module) getTraceData(ctx context.Context, orgID valuer.UUID, traceID string) (*tracedetailtypes.WaterfallTrace, error) {
	if cached, err := m.getFromCache(ctx, orgID, traceID); err == nil {
		return cached, nil
	}

	m.logger.DebugContext(ctx, "cache miss for v3 waterfall", slog.String("trace_id", traceID))

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

	if cacheErr := m.cache.Set(ctx, orgID, waterfallCacheKey(traceID), traceData, tracedetailtypes.WaterfallCacheTTL); cacheErr != nil {
		m.logger.ErrorContext(ctx, "failed to store v3 waterfall cache", slog.String("trace_id", traceID), errors.Attr(cacheErr))
	}

	return traceData, nil
}

func (m *module) getFromCache(ctx context.Context, orgID valuer.UUID, traceID string) (*tracedetailtypes.WaterfallTrace, error) {
	cachedData := new(tracedetailtypes.WaterfallTrace)
	err := m.cache.Get(ctx, orgID, waterfallCacheKey(traceID), cachedData)
	if err != nil {
		return nil, err
	}

	// Skip cache if trace end time falls within flux interval
	if time.Since(time.Unix(0, int64(cachedData.EndTime))) < tracedetailtypes.FluxInterval {
		m.logger.InfoContext(ctx, "trace end time within flux interval, skipping v3 waterfall cache", slog.String("trace_id", traceID))
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "trace end time within flux interval, traceID: %s", traceID)
	}

	m.logger.InfoContext(ctx, "cache hit for v3 waterfall", slog.String("trace_id", traceID))
	return cachedData, nil
}

func waterfallCacheKey(traceID string) string {
	return strings.Join([]string{"v3_waterfall", traceID}, "-")
}
