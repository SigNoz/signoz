package signoz

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/telemetrystore"
	"go.signoz.io/signoz/pkg/version"

	"go.signoz.io/signoz/pkg/web"
)

type SigNoz struct {
	*factory.Registry
	Cache          cache.Cache
	Web            web.Web
	SQLStore       sqlstore.SQLStore
	TelemetryStore telemetrystore.TelemetryStore
	Alertmanager   alertmanager.Alertmanager
}

func New(
	ctx context.Context,
	config Config,
	cacheProviderFactories factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]],
	webProviderFactories factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]],
	sqlstoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]],
	telemetrystoreProviderFactories factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]],
) (*SigNoz, error) {
	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, version.Build{}, config.Instrumentation)
	if err != nil {
		return nil, err
	}

	instrumentation.Logger().DebugContext(ctx, "starting signoz", "config", config)

	// Get the provider settings from instrumentation
	providerSettings := instrumentation.ToProviderSettings()

	// Initialize cache from the available cache provider factories
	cache, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Cache,
		cacheProviderFactories,
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
		webProviderFactories,
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
		sqlstoreProviderFactories,
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
		telemetrystoreProviderFactories,
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
		NewSQLMigrationProviderFactories(sqlstore),
	)
	if err != nil {
		return nil, err
	}

	err = sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Migrate(ctx)
	if err != nil {
		return nil, err
	}

	alertmanager, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Alertmanager,
		NewAlertmanagerProviderFactories(sqlstore),
		config.Alertmanager.Provider,
	)
	if err != nil {
		return nil, err
	}

	registry, err := factory.NewRegistry(
		instrumentation.Logger(),
		factory.NewNamedService(factory.MustNewName("instrumentation"), instrumentation),
		factory.NewNamedService(factory.MustNewName("alertmanager"), alertmanager),
	)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Registry:       registry,
		Cache:          cache,
		Web:            web,
		SQLStore:       sqlstore,
		TelemetryStore: telemetrystore,
		Alertmanager:   alertmanager,
	}, nil
}
