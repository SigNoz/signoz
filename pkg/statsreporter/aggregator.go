package statsreporter

import (
	"context"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// Aggregator aggregates stats from every registered StatsCollector together with
// telemetry-store counts for a single organization.
type Aggregator interface {
	Aggregate(ctx context.Context, orgID valuer.UUID) (map[string]any, error)
}

type aggregator struct {
	// settings
	settings factory.ScopedProviderSettings

	// used to get telemetry details. srikanthcvv to move this to the querier layer
	telemetryStore telemetrystore.TelemetryStore

	// a list of collectors, used to collect stats from across the codebase
	collectors []StatsCollector
}

func NewAggregator(providerSettings factory.ProviderSettings, telemetryStore telemetrystore.TelemetryStore, collectors []StatsCollector) Aggregator {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/statsreporter")

	return &aggregator{
		settings:       settings,
		telemetryStore: telemetryStore,
		collectors:     collectors,
	}
}

func (aggregator *aggregator) Aggregate(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.CodeNamespace:    "statsreporter",
		instrumentationtypes.CodeFunctionName: "Aggregate",
	})
	var wg sync.WaitGroup
	wg.Add(len(aggregator.collectors))

	stats := make(map[string]any, 0)
	mtx := sync.Mutex{}

	for _, collector := range aggregator.collectors {
		go func(collector StatsCollector) {
			defer wg.Done()

			collectorStats, err := collector.Collect(ctx, orgID)
			if err != nil {
				aggregator.settings.Logger().ErrorContext(ctx, "failed to collect stats", errors.Attr(err))
				return
			}

			mtx.Lock()
			for k, v := range collectorStats {
				stats[k] = v
			}
			mtx.Unlock()
		}(collector)
	}
	wg.Wait()

	var traces uint64
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_traces.distributed_signoz_index_v3").Scan(&traces); err == nil {
		stats["telemetry.traces.count"] = traces
	}

	var logs uint64
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_logs.distributed_logs_v2").Scan(&logs); err == nil {
		stats["telemetry.logs.count"] = logs
	}

	var metrics uint64
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_metrics.distributed_samples_v4").Scan(&metrics); err == nil {
		stats["telemetry.metrics.count"] = metrics
	}

	var tracesLastSeenAt time.Time
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT max(timestamp) FROM signoz_traces.distributed_signoz_index_v3").Scan(&tracesLastSeenAt); err == nil {
		if tracesLastSeenAt.Unix() != 0 {
			stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
			stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
		}
	}

	var logsLastSeenAt time.Time
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM signoz_logs.distributed_logs_v2").Scan(&logsLastSeenAt); err == nil {
		if logsLastSeenAt.Unix() != 0 {
			stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
			stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
		}
	}

	var metricsLastSeenAt time.Time
	if err := aggregator.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT toDateTime(max(unix_milli) / 1000) FROM signoz_metrics.distributed_samples_v4").Scan(&metricsLastSeenAt); err == nil {
		if metricsLastSeenAt.Unix() != 0 {
			stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
			stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
		}
	}

	return stats, nil
}
