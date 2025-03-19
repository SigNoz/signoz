package signoz

import (
	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/legacyalertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/signozalertmanager"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/cache/memorycache"
	"go.signoz.io/signoz/pkg/cache/rediscache"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/postgressqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlitesqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlstorehook"
	"go.signoz.io/signoz/pkg/telemetrystore"
	"go.signoz.io/signoz/pkg/telemetrystore/clickhousetelemetrystore"
	"go.signoz.io/signoz/pkg/telemetrystore/telemetrystorehook"
	"go.signoz.io/signoz/pkg/web"
	"go.signoz.io/signoz/pkg/web/noopweb"
	"go.signoz.io/signoz/pkg/web/routerweb"
)

func NewCacheProviderFactories() factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]] {
	return factory.MustNewNamedMap(
		memorycache.NewFactory(),
		rediscache.NewFactory(),
	)
}

func NewWebProviderFactories() factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]] {
	return factory.MustNewNamedMap(
		routerweb.NewFactory(),
		noopweb.NewFactory(),
	)
}

func NewSQLStoreProviderFactories() factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]] {
	hook := sqlstorehook.NewLoggingFactory()
	return factory.MustNewNamedMap(
		sqlitesqlstore.NewFactory(hook),
		postgressqlstore.NewFactory(hook),
	)
}

func NewSQLMigrationProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config]] {
	return factory.MustNewNamedMap(
		sqlmigration.NewAddDataMigrationsFactory(),
		sqlmigration.NewAddOrganizationFactory(),
		sqlmigration.NewAddPreferencesFactory(),
		sqlmigration.NewAddDashboardsFactory(),
		sqlmigration.NewAddSavedViewsFactory(),
		sqlmigration.NewAddAgentsFactory(),
		sqlmigration.NewAddPipelinesFactory(),
		sqlmigration.NewAddIntegrationsFactory(),
		sqlmigration.NewAddLicensesFactory(),
		sqlmigration.NewAddPatsFactory(),
		sqlmigration.NewModifyDatetimeFactory(),
		sqlmigration.NewModifyOrgDomainFactory(),
		sqlmigration.NewUpdateOrganizationFactory(sqlstore),
		sqlmigration.NewAddAlertmanagerFactory(),
		sqlmigration.NewUpdateDashboardAndSavedViewsFactory(sqlstore),
	)
}

func NewTelemetryStoreProviderFactories() factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]] {
	return factory.MustNewNamedMap(
		clickhousetelemetrystore.NewFactory(telemetrystorehook.NewFactory()),
	)
}

func NewAlertmanagerProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config]] {
	return factory.MustNewNamedMap(
		legacyalertmanager.NewFactory(sqlstore),
		signozalertmanager.NewFactory(sqlstore),
	)
}
