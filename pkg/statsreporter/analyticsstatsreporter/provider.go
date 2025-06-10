package analyticsstatsreporter

import (
	"context"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/analytics/segmentanalytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/analyticstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
)

type provider struct {
	// settings
	settings factory.ScopedProviderSettings

	// config
	config statsreporter.Config

	// used to get telemetry details. srikanthcvv to move this to the querier layer
	telemetryStore telemetrystore.TelemetryStore

	// a list of collectors, used to collect stats from across the codebase
	collectors []statsreporter.StatsCollector

	// used to get organizations
	orgGetter organization.Getter

	// used to send stats to an analytics backend
	analytics analytics.Analytics

	// used to get build information
	build version.Build

	// used to get deployment information
	deployment version.Deployment

	// used to stop the provider
	stopC chan struct{}
}

func NewFactory(telemetryStore telemetrystore.TelemetryStore, collectors []statsreporter.StatsCollector, orgGetter organization.Getter, build version.Build, analyticsConfig analytics.Config) factory.ProviderFactory[statsreporter.StatsReporter, statsreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("analytics"), func(ctx context.Context, settings factory.ProviderSettings, config statsreporter.Config) (statsreporter.StatsReporter, error) {
		return New(ctx, settings, config, telemetryStore, collectors, orgGetter, build, analyticsConfig)
	})
}

func New(
	ctx context.Context,
	providerSettings factory.ProviderSettings,
	config statsreporter.Config,
	telemetryStore telemetrystore.TelemetryStore,
	collectors []statsreporter.StatsCollector,
	orgGetter organization.Getter,
	build version.Build,
	analyticsConfig analytics.Config,
) (statsreporter.StatsReporter, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/statsreporter/analyticsstatsreporter")
	deployment := version.NewDeployment()
	analytics, err := segmentanalytics.New(ctx, providerSettings, analyticsConfig)
	if err != nil {
		return nil, err
	}

	return &provider{
		settings:       settings,
		config:         config,
		telemetryStore: telemetryStore,
		collectors:     collectors,
		orgGetter:      orgGetter,
		analytics:      analytics,
		build:          build,
		deployment:     deployment,
		stopC:          make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	go func() {
		if err := provider.analytics.Start(ctx); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to start analytics", "error", err)
		}
	}()

	ticker := time.NewTicker(provider.config.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-provider.stopC:
			return nil
		case <-ticker.C:
			if err := provider.Report(ctx); err != nil {
				provider.settings.Logger().WarnContext(ctx, "failed to report stats", "error", err)
			}
		}
	}
}

func (provider *provider) Report(ctx context.Context) error {
	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	for _, org := range orgs {
		stats := provider.collectOrg(ctx, org.ID)
		if len(stats) == 0 {
			provider.settings.Logger().WarnContext(ctx, "no stats collected", "org_id", org.ID)
			continue
		}

		stats["build.version"] = provider.build.Version()
		stats["build.branch"] = provider.build.Branch()
		stats["build.hash"] = provider.build.Hash()
		stats["build.variant"] = provider.build.Variant()
		stats["deployment.mode"] = provider.deployment.Mode()
		stats["deployment.platform"] = provider.deployment.Platform()
		stats["deployment.os"] = provider.deployment.OS()
		stats["deployment.arch"] = provider.deployment.Arch()

		provider.settings.Logger().DebugContext(ctx, "reporting stats", "stats", stats)
		provider.analytics.Send(
			ctx,
			analyticstypes.Track{
				UserId:     "stats_" + org.ID.String(),
				Event:      "Stats Reported",
				Properties: analyticstypes.NewPropertiesFromMap(stats),
				Context: &analyticstypes.Context{
					Extra: map[string]interface{}{
						analyticstypes.KeyGroupID: org.ID.String(),
					},
				},
			},
			analyticstypes.Group{
				UserId:  "stats_" + org.ID.String(),
				GroupId: org.ID.String(),
				Traits: analyticstypes.
					NewTraitsFromMap(stats).
					SetName(org.DisplayName).
					SetUsername(org.Name).
					SetCreatedAt(org.CreatedAt),
			},
			analyticstypes.Identify{
				UserId: "stats_" + org.ID.String(),
				Traits: analyticstypes.
					NewTraits().
					SetName(org.DisplayName).
					SetUsername(org.Name).
					SetCreatedAt(org.CreatedAt),
			},
		)
	}

	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	close(provider.stopC)
	// report stats on stop
	if err := provider.Report(ctx); err != nil {
		provider.settings.Logger().WarnContext(ctx, "failed to report stats", "error", err)
	}

	if err := provider.analytics.Stop(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to stop analytics", "error", err)
	}

	return nil
}

func (provider *provider) collectOrg(ctx context.Context, orgID valuer.UUID) map[string]any {
	var wg sync.WaitGroup
	wg.Add(len(provider.collectors))

	stats := make(map[string]any, 0)
	mtx := sync.Mutex{}

	for _, collector := range provider.collectors {
		go func(collector statsreporter.StatsCollector) {
			defer wg.Done()

			collectorStats, err := collector.Collect(ctx, orgID)
			if err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to collect stats", "error", err)
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
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_traces.distributed_signoz_index_v3").Scan(&traces); err == nil {
		stats["telemetry.traces.count"] = traces
	}

	var logs uint64
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_logs.distributed_logs_v2").Scan(&logs); err == nil {
		stats["telemetry.logs.count"] = logs
	}

	var metrics uint64
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT COUNT(*) FROM signoz_metrics.distributed_samples_v4").Scan(&metrics); err == nil {
		stats["telemetry.metrics.count"] = metrics
	}

	return stats
}
