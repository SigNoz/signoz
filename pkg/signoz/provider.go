package signoz

import (
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/memorycache"
	"go.signoz.io/signoz/pkg/cache/rediscache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlitesqlstore"
	"go.signoz.io/signoz/pkg/sqlstoremigrator/migrations"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/noopweb"
	"go.signoz.io/signoz/pkg/web/routerweb"
)

type ProviderFactories struct {
	SQLStoreMigrationFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStoreMigration, sqlstore.Config]]
	SQLStoreProviderFactories  factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]]
	WebProviderFactories       factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]]
	CacheProviderFactories     factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]]
}

func NewProviderFactories() ProviderFactories {
	return ProviderFactories{
		SQLStoreMigrationFactories: factory.MustNewNamedMap(
			migrations.NewAddDataMigrationsFactory(),
			migrations.NewAddOrganizationFactory(),
			migrations.NewAddPreferencesFactory(),
			migrations.NewAddDashboardsFactory(),
			migrations.NewAddSavedViewsFactory(),
			migrations.NewAddAgentsFactory(),
			migrations.NewAddPipelinesFactory(),
			migrations.NewAddIntegrationsFactory(),
		),
		SQLStoreProviderFactories: factory.MustNewNamedMap(
			sqlitesqlstore.NewFactory(),
		),
		WebProviderFactories: factory.MustNewNamedMap(
			routerweb.NewFactory(),
			noopweb.NewFactory(),
		),
		CacheProviderFactories: factory.MustNewNamedMap(
			memorycache.NewFactory(),
			rediscache.NewFactory(),
		),
	}
}
