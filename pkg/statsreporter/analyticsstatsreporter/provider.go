package analyticsstatsreporter

import (
	"context"
	"log/slog"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/analytics/segmentanalytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/version"
)

type provider struct {
	// settings
	settings factory.ScopedProviderSettings

	// config
	config statsreporter.Config

	// used to aggregate stats for an organization
	aggregator statsreporter.Aggregator

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

func NewFactory(aggregator statsreporter.Aggregator, orgGetter organization.Getter, userGetter user.Getter, tokenizer tokenizer.Tokenizer, build version.Build, analyticsConfig analytics.Config) factory.ProviderFactory[statsreporter.StatsReporter, statsreporter.Config] {
	return factory.NewProviderFactory(factory.MustNewName("analytics"), func(ctx context.Context, settings factory.ProviderSettings, config statsreporter.Config) (statsreporter.StatsReporter, error) {
		return New(ctx, settings, config, aggregator, orgGetter, userGetter, tokenizer, build, analyticsConfig)
	})
}

func New(
	ctx context.Context,
	providerSettings factory.ProviderSettings,
	config statsreporter.Config,
	aggregator statsreporter.Aggregator,
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
		settings:   settings,
		config:     config,
		aggregator: aggregator,
		orgGetter:  orgGetter,
		userGetter: userGetter,
		analytics:  analytics,
		tokenizer:  tokenizer,
		build:      build,
		deployment: deployment,
		stopC:      make(chan struct{}),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	go func() {
		if err := provider.analytics.Start(ctx); err != nil {
			provider.settings.Logger().ErrorContext(ctx, "failed to start analytics", errors.Attr(err))
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
				provider.settings.Logger().WarnContext(ctx, "failed to report stats", errors.Attr(err))
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
		stats, err := provider.aggregator.Aggregate(ctx, org.ID)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "failed to aggregate stats", errors.Attr(err), slog.Any("org_id", org.ID))
			continue
		}

		if len(stats) == 0 {
			provider.settings.Logger().WarnContext(ctx, "no stats collected", slog.Any("org_id", org.ID))
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

		provider.settings.Logger().DebugContext(ctx, "reporting stats", slog.Any("stats", stats))

		provider.analytics.IdentifyGroup(ctx, org.ID.String(), stats)
		provider.analytics.TrackGroup(ctx, org.ID.String(), "Stats Reported", stats)

		if !provider.config.Collect.Identities {
			continue
		}

		users, err := provider.userGetter.ListUsersByOrgID(ctx, org.ID)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "failed to list users", errors.Attr(err), slog.Any("org_id", org.ID))
			continue
		}

		maxLastObservedAtPerUserID, err := provider.tokenizer.ListMaxLastObservedAtByOrgID(ctx, org.ID)
		if err != nil {
			provider.settings.Logger().WarnContext(ctx, "failed to list max last observed at per user id", errors.Attr(err), slog.Any("org_id", org.ID))
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
		provider.settings.Logger().WarnContext(ctx, "failed to report stats", errors.Attr(err))
	}

	if err := provider.analytics.Stop(ctx); err != nil {
		provider.settings.Logger().ErrorContext(ctx, "failed to stop analytics", errors.Attr(err))
	}

	return nil
}
