package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/featureflag"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/telemetrystore"
	"go.signoz.io/signoz/pkg/version"

	"go.signoz.io/signoz/pkg/web"
)

type SigNoz struct {
	Cache              cache.Cache
	Web                web.Web
	SQLStore           sqlstore.SQLStore
	TelemetryStore     telemetrystore.TelemetryStore
	FeatureFlagManager *featureflag.FeatureFlagManager
}

func New(
	ctx context.Context,
	config Config,
	providerConfig ProviderConfig,
) (*SigNoz, error) {
	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, version.Build{}, config.Instrumentation)
	if err != nil {
		return nil, err
	}

	instrumentation.Logger().InfoContext(ctx, "starting signoz", "config", config)

	// Get the provider settings from instrumentation
	providerSettings := instrumentation.ToProviderSettings()

	// Initialize cache from the available cache provider factories
	cache, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Cache,
		providerConfig.CacheProviderFactories,
		config.Cache.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize web from the available web provider factories
	web, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Web,
		providerConfig.WebProviderFactories,
		config.Web.Provider(),
	)
	if err != nil {
		return nil, err
	}

	// Initialize sqlstore from the available sqlstore provider factories
	sqlstore, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.SQLStore,
		providerConfig.SQLStoreProviderFactories,
		config.SQLStore.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize telemetrystore from the available telemetrystore provider factories
	telemetrystore, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.TelemetryStore,
		providerConfig.TelemetryStoreProviderFactories,
		config.TelemetryStore.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Run migrations on the sqlstore
	sqlmigrations, err := sqlmigration.New(
		ctx,
		providerSettings,
		config.SQLMigration,
		providerConfig.SQLMigrationProviderFactories,
	)
  err = sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Migrate(ctx)
	if err != nil {
		return nil, err
	}


	featureFlagProviders, err := factory.NewFromNamedMap(ctx, providerSettings, config.FeatureFlag, providerConfig.FeatureFlagProviderFactories)
  if err != nil {
		return nil, err
	}
	featureFlagManager := featureflag.NewFeatureFlagManager(ctx, sqlstore.SQLxDB(), featureFlagProviders...)
	// TODO : do we need to start the feature flag manager here?
	featureFlagManager.Start(ctx)

	return &SigNoz{
		Cache:              cache,
		Web:                web,
		SQLStore:           sqlstore,
		TelemetryStore:     telemetrystore,
		FeatureFlagManager: featureFlagManager,
	}, nil
}
