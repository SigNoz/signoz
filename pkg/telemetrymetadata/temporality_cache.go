package telemetrymetadata

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// TemporalityCacheEntry represents a cached temporality entry
type TemporalityCacheEntry struct {
	Temporality metrictypes.Temporality `json:"temporality"`
	CachedAt    time.Time               `json:"cached_at"`
	SoftTTL     time.Duration           `json:"soft_ttl"`
	HardTTL     time.Duration           `json:"hard_ttl"`
}

func (e *TemporalityCacheEntry) MarshalBinary() ([]byte, error) {
	return json.Marshal(e)
}

func (e *TemporalityCacheEntry) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, e)
}

type TemporalityCache struct {
	cache                cache.Cache
	logger               *slog.Logger
	softTTL              time.Duration
	hardTTL              time.Duration
	jitterPercent        int
	refreshing           sync.Map // map[string]bool to track ongoing refreshes
	refreshCallback      func(ctx context.Context, orgID valuer.UUID, metricName string) (metrictypes.Temporality, error)
	refreshMultiCallback func(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]metrictypes.Temporality, error)
}

// TemporalityCacheConfig holds configuration for the temporality cache
type TemporalityCacheConfig struct {
	SoftTTL       time.Duration
	HardTTL       time.Duration
	JitterPercent int // Percentage of TTL to use as jitter range (e.g., 10 for ±10%)
}

// DefaultTemporalityCacheConfig returns default cache configuration
func DefaultTemporalityCacheConfig() TemporalityCacheConfig {
	return TemporalityCacheConfig{
		SoftTTL:       30 * time.Minute,  // Fresh data threshold
		HardTTL:       240 * time.Minute, // Maximum cache lifetime
		JitterPercent: 20,                // 20% jitter
	}
}

// NewTemporalityCache creates a new temporality cache
func NewTemporalityCache(
	settings factory.ProviderSettings,
	cache cache.Cache,
	config TemporalityCacheConfig,
	refreshCallback func(ctx context.Context, orgID valuer.UUID, metricName string) (metrictypes.Temporality, error),
) *TemporalityCache {
	cacheSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetrymetadata/temporality_cache")

	return &TemporalityCache{
		cache:           cache,
		logger:          cacheSettings.Logger(),
		softTTL:         config.SoftTTL,
		hardTTL:         config.HardTTL,
		jitterPercent:   config.JitterPercent,
		refreshCallback: refreshCallback,
	}
}

// SetRefreshMultiCallback sets the batch refresh callback
func (tc *TemporalityCache) SetRefreshMultiCallback(callback func(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]metrictypes.Temporality, error)) {
	tc.refreshMultiCallback = callback
}

func (tc *TemporalityCache) generateCacheKey(metricName string) string {
	return fmt.Sprintf("temporality:metric:%s", metricName)
}

func (tc *TemporalityCache) applyJitter(duration time.Duration) time.Duration {
	if tc.jitterPercent <= 0 {
		return duration
	}

	jitterRange := int64(float64(duration.Nanoseconds()) * float64(tc.jitterPercent) / 100.0)
	jitter := rand.Int63n(2*jitterRange) - jitterRange

	result := duration + time.Duration(jitter)
	if result < 0 {
		return 0
	}
	return result
}

func (tc *TemporalityCache) Get(ctx context.Context, orgID valuer.UUID, metricName string) (metrictypes.Temporality, error) {
	cacheKey := tc.generateCacheKey(metricName)

	var entry TemporalityCacheEntry
	err := tc.cache.Get(ctx, orgID, cacheKey, &entry, false)

	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			tc.logger.ErrorContext(ctx, "error getting cached temporality", "metric", metricName, "error", err)
		}

		temporality, err := tc.refreshCallback(ctx, orgID, metricName)
		if err != nil {
			return metrictypes.Unknown, err
		}

		tc.put(ctx, orgID, metricName, temporality)
		return temporality, nil
	}

	age := time.Since(entry.CachedAt)

	if age < entry.SoftTTL {
		tc.logger.DebugContext(ctx, "returning fresh cached temporality",
			"metric", metricName,
			"age", age,
			"soft_ttl", entry.SoftTTL)
		return entry.Temporality, nil
	}

	if age < entry.HardTTL {
		tc.logger.DebugContext(ctx, "returning stale cached temporality and triggering refresh",
			"metric", metricName,
			"age", age,
			"soft_ttl", entry.SoftTTL,
			"hard_ttl", entry.HardTTL)

		tc.triggerBackgroundRefresh(ctx, orgID, metricName)

		return entry.Temporality, nil
	}

	tc.logger.DebugContext(ctx, "cached temporality exceeded hard TTL, fetching fresh",
		"metric", metricName,
		"age", age,
		"hard_ttl", entry.HardTTL)

	temporality, err := tc.refreshCallback(ctx, orgID, metricName)
	if err != nil {
		// when refresh fails and we have stale data, return it as fallback
		if entry.Temporality != metrictypes.Unknown {
			tc.logger.WarnContext(ctx, "failed to refresh temporality, returning stale data",
				"metric", metricName,
				"error", err)
			return entry.Temporality, nil
		}
		return metrictypes.Unknown, err
	}

	tc.put(ctx, orgID, metricName, temporality)
	return temporality, nil
}

func (tc *TemporalityCache) GetMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]metrictypes.Temporality, error) {
	result := make(map[string]metrictypes.Temporality)
	var missedMetrics []string
	staleMetrics := make(map[string]metrictypes.Temporality)

	// for each metric, check if it fresh, stale + valid, or invalid/missing
	// then trigger fetch for all missing metrics
	for _, metricName := range metricNames {
		cacheKey := tc.generateCacheKey(metricName)

		var entry TemporalityCacheEntry
		err := tc.cache.Get(ctx, orgID, cacheKey, &entry, false)

		if err != nil {
			missedMetrics = append(missedMetrics, metricName)
			continue
		}

		age := time.Since(entry.CachedAt)

		if age < entry.SoftTTL {
			result[metricName] = entry.Temporality
		} else if age < entry.HardTTL {
			result[metricName] = entry.Temporality
			staleMetrics[metricName] = entry.Temporality
		} else {
			missedMetrics = append(missedMetrics, metricName)
		}
	}

	for metricName := range staleMetrics {
		tc.triggerBackgroundRefresh(ctx, orgID, metricName)
	}

	if len(missedMetrics) > 0 {
		temporalities, err := tc.refreshMulti(ctx, orgID, missedMetrics)
		if err != nil {
			return result, err
		}

		for metricName, temporality := range temporalities {
			tc.put(ctx, orgID, metricName, temporality)
			result[metricName] = temporality
		}
	}

	return result, nil
}

func (tc *TemporalityCache) put(ctx context.Context, orgID valuer.UUID, metricName string, temporality metrictypes.Temporality) {
	entry := TemporalityCacheEntry{
		Temporality: temporality,
		CachedAt:    time.Now(),
		SoftTTL:     tc.applyJitter(tc.softTTL),
		HardTTL:     tc.applyJitter(tc.hardTTL),
	}

	cacheKey := tc.generateCacheKey(metricName)

	if err := tc.cache.Set(ctx, orgID, cacheKey, &entry, entry.HardTTL); err != nil {
		tc.logger.ErrorContext(ctx, "failed to cache temporality",
			"metric", metricName,
			"error", err)
	}
}

func (tc *TemporalityCache) triggerBackgroundRefresh(_ context.Context, orgID valuer.UUID, metricName string) {
	if _, loading := tc.refreshing.LoadOrStore(metricName, true); loading {
		return
	}

	go func() {
		defer tc.refreshing.Delete(metricName)

		refreshCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		tc.logger.DebugContext(refreshCtx, "starting background refresh", "metric", metricName)

		temporality, err := tc.refreshCallback(refreshCtx, orgID, metricName)
		if err != nil {
			tc.logger.ErrorContext(refreshCtx, "background refresh failed",
				"metric", metricName,
				"error", err)
			return
		}

		tc.put(refreshCtx, orgID, metricName, temporality)

		tc.logger.DebugContext(refreshCtx, "background refresh completed", "metric", metricName)
	}()
}

func (tc *TemporalityCache) refreshMulti(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]metrictypes.Temporality, error) {
	if tc.refreshMultiCallback != nil {
		return tc.refreshMultiCallback(ctx, orgID, metricNames)
	}

	result := make(map[string]metrictypes.Temporality)

	for _, metricName := range metricNames {
		temporality, err := tc.refreshCallback(ctx, orgID, metricName)
		if err != nil {
			tc.logger.ErrorContext(ctx, "failed to refresh temporality",
				"metric", metricName,
				"error", err)
			result[metricName] = metrictypes.Unknown
			continue
		}
		result[metricName] = temporality
	}

	return result, nil
}
