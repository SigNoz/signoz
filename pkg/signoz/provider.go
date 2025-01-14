package signoz

import (
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/provider/memory"
	"go.signoz.io/signoz/pkg/cache/provider/redis"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/migrations"
	"go.signoz.io/signoz/pkg/sqlstore/provider/sqlite"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/provider/noop"
	"go.signoz.io/signoz/pkg/web/provider/router"
)

type ProviderFactories struct {
	SQLStoreMigrationFactories factory.NamedMap[factory.ProviderFactory[sqlstore.Migration, sqlstore.Config]]
	SQLStoreProviderFactories  factory.NamedMap[factory.ProviderFactory[sqlstore.Provider, sqlstore.Config]]
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
			sqlite.NewFactory(),
		),
		WebProviderFactories: factory.MustNewNamedMap(
			router.NewFactory(),
			noop.NewFactory(),
		),
		CacheProviderFactories: factory.MustNewNamedMap(
			memory.NewFactory(),
			redis.NewFactory(),
		),
	}
}
