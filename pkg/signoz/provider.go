package signoz

import (
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/memorycache"
	"go.signoz.io/signoz/pkg/cache/rediscache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlitesqlstore"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/noopweb"
	"go.signoz.io/signoz/pkg/web/routerweb"
)

type ProviderConfig struct {
	// Map of all cache provider factories
	CacheProviderFactories factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]]

	// Map of all web provider factories
	WebProviderFactories factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]]

	// Map of all sqlstore provider factories
	SQLStoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]]

	// Map of all sql migration provider factories
	SQLMigrationProviderFactories factory.NamedMap[factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config]]
}

func NewProviderConfig() ProviderConfig {
	return ProviderConfig{
		CacheProviderFactories: factory.MustNewNamedMap(
			memorycache.NewFactory(),
			rediscache.NewFactory(),
		),
		WebProviderFactories: factory.MustNewNamedMap(
			routerweb.NewFactory(),
			noopweb.NewFactory(),
		),
		SQLStoreProviderFactories: factory.MustNewNamedMap(
			sqlitesqlstore.NewFactory(),
		),
		SQLMigrationProviderFactories: factory.MustNewNamedMap(
			sqlmigration.NewAddDataMigrationsFactory(),
			sqlmigration.NewAddOrganizationFactory(),
			sqlmigration.NewAddPreferencesFactory(),
			sqlmigration.NewAddDashboardsFactory(),
			sqlmigration.NewAddSavedViewsFactory(),
			sqlmigration.NewAddAgentsFactory(),
			sqlmigration.NewAddPipelinesFactory(),
			sqlmigration.NewAddIntegrationsFactory(),
		),
	}
}
