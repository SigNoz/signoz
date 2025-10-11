package analyticsstatsreporter

import (
	"context"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/analytics/segmentanalytics"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
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

	// used to get users
	userGetter user.Getter

	// used to get tokenizer
	tokenizer tokenizer.Tokenizer

	// used to send stats to an analytics backend
	analytics analytics.Analytics

	// used to get build information
	build version.Build

	// used to get deployment information
	deployment version.Deployment

	// used to stop the provider
	stopC chan struct{}
}

func NewFactory(telemetryStore telemetrystore.TelemetryStore, collectors []statsreporter.StatsCollector, orgGetter organization.Getter, userGetter user.Getter, tokenizer tokenizer.Tokenizer, build version.Build, analyticsConfig analytics.Config) factory.ProviderFactory[statsreporter.StatsReporter, statsreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("analytics"), func(ctx context.Context, settings factory.ProviderSettings, config statsreporter.Config) (statsreporter.StatsReporter, error) {
		return New(ctx, settings, config, telemetryStore, collectors, orgGetter, userGetter, tokenizer, build, analyticsConfig)
	})
}

func New(
	ctx context.Context,
	providerSettings factory.ProviderSettings,
	config statsreporter.Config,
	telemetryStore telemetrystore.TelemetryStore,
	collectors []statsreporter.StatsCollector,
	orgGetter organization.Getter,
	userGetter user.Getter,
	tokenizer tokenizer.Tokenizer,
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
		userGetter:     userGetter,
		analytics:      analytics,
		tokenizer:      tokenizer,
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
			ctx, span := provider.settings.Tracer().Start(ctx, "statsreporter.Report", trace.WithAttributes(attribute.String("statsreporter.provider", "analytics")))

			if err := provider.Report(ctx); err != nil {
				span.RecordError(err)
				provider.settings.Logger().WarnContext(ctx, "failed to report stats", "error", err)
			}

			span.End()
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

		// Add build and deployment stats
		stats["build.version"] = provider.build.Version()
		stats["build.branch"] = provider.build.Branch()
		stats["build.hash"] = provider.build.Hash()
		stats["build.variant"] = provider.build.Variant()
		stats["deployment.mode"] = provider.deployment.Mode()
		stats["deployment.platform"] = provider.deployment.Platform()
		stats["deployment.os"] = provider.deployment.OS()
		stats["deployment.arch"] = provider.deployment.Arch()

		// Add org stats
		stats["display_name"] = org.DisplayName
		stats["name"] = org.Name
		stats["created_at"] = org.CreatedAt
		stats["alias"] = org.Alias

		provider.settings.Logger().DebugContext(ctx, "reporting stats", "stats", stats)

		provider.analytics.IdentifyGroup(ctx, org.ID.String(), stats)
		provider.analytics.TrackGroup(ctx, org.ID.String(), "Stats Reported", stats)

		if !provider.config.Collect.Identities {
			continue
		}

		users, err := provider.userGetter.ListByOrgID(ctx, org.ID)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "failed to list users", "error", err, "org_id", org.ID)
			continue
		}

		maxLastObservedAtPerUserID, err := provider.tokenizer.ListMaxLastObservedAtByOrgID(ctx, org.ID)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "failed to list max last observed at per user id", "error", err, "org_id", org.ID)
			maxLastObservedAtPerUserID = make(map[valuer.UUID]time.Time)
		}

		for _, user := range users {
			traits := types.NewTraitsFromUser(user)
			if maxLastObservedAt, ok := maxLastObservedAtPerUserID[user.ID]; ok {
				traits["auth_token.last_observed_at.max.time"] = maxLastObservedAt.UTC()
				traits["auth_token.last_observed_at.max.time_unix"] = maxLastObservedAt.Unix()
			}

			provider.analytics.IdentifyUser(ctx, org.ID.String(), user.ID.String(), traits)
		}
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

	var tracesLastSeenAt time.Time
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT max(timestamp) FROM signoz_traces.distributed_signoz_index_v3").Scan(&tracesLastSeenAt); err == nil {
		if tracesLastSeenAt.Unix() != 0 {
			stats["telemetry.traces.last_observed.time"] = tracesLastSeenAt.UTC()
			stats["telemetry.traces.last_observed.time_unix"] = tracesLastSeenAt.Unix()
		}
	}

	var logsLastSeenAt time.Time
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT fromUnixTimestamp64Nano(max(timestamp)) FROM signoz_logs.distributed_logs_v2").Scan(&logsLastSeenAt); err == nil {
		if logsLastSeenAt.Unix() != 0 {
			stats["telemetry.logs.last_observed.time"] = logsLastSeenAt.UTC()
			stats["telemetry.logs.last_observed.time_unix"] = logsLastSeenAt.Unix()
		}
	}

	var metricsLastSeenAt time.Time
	if err := provider.telemetryStore.ClickhouseDB().QueryRow(ctx, "SELECT toDateTime(max(unix_milli) / 1000) FROM signoz_metrics.distributed_samples_v4").Scan(&metricsLastSeenAt); err == nil {
		if metricsLastSeenAt.Unix() != 0 {
			stats["telemetry.metrics.last_observed.time"] = metricsLastSeenAt.UTC()
			stats["telemetry.metrics.last_observed.time_unix"] = metricsLastSeenAt.Unix()
		}
	}

	return stats
}
