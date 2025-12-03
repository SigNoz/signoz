package signoz

import (
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/rulebasednotification"
	"github.com/SigNoz/signoz/pkg/alertmanager/signozalertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/analytics/noopanalytics"
	"github.com/SigNoz/signoz/pkg/analytics/segmentanalytics"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/memorycache"
	"github.com/SigNoz/signoz/pkg/cache/rediscache"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/emailing/noopemailing"
	"github.com/SigNoz/signoz/pkg/emailing/smtpemailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querier/signozquerier"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/ruler/signozruler"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sharder/noopsharder"
	"github.com/SigNoz/signoz/pkg/sharder/singlesharder"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlschema/sqlitesqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstorehook"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/statsreporter/analyticsstatsreporter"
	"github.com/SigNoz/signoz/pkg/statsreporter/noopstatsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/clickhousetelemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystorehook"
	"github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/tokenizer/jwttokenizer"
	"github.com/SigNoz/signoz/pkg/tokenizer/opaquetokenizer"
	"github.com/SigNoz/signoz/pkg/tokenizer/tokenizerstore/sqltokenizerstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/SigNoz/signoz/pkg/web/noopweb"
	"github.com/SigNoz/signoz/pkg/web/routerweb"
)

func NewAnalyticsProviderFactories() factory.NamedMap[factory.ProviderFactory[analytics.Analytics, analytics.Config]] {
	return factory.MustNewNamedMap(
		noopanalytics.NewFactory(),
		segmentanalytics.NewFactory(),
	)
}

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
	return factory.MustNewNamedMap(
		sqlitesqlstore.NewFactory(sqlstorehook.NewLoggingFactory(), sqlstorehook.NewInstrumentationFactory()),
	)
}

func NewSQLSchemaProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]] {
	return factory.MustNewNamedMap(
		sqlitesqlschema.NewFactory(sqlstore),
	)
}

func NewSQLMigrationProviderFactories(
	sqlstore sqlstore.SQLStore,
	sqlschema sqlschema.SQLSchema,
	telemetryStore telemetrystore.TelemetryStore,
	providerSettings factory.ProviderSettings,
) factory.NamedMap[factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config]] {
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
		sqlmigration.NewAddAlertmanagerFactory(sqlstore),
		sqlmigration.NewUpdateDashboardAndSavedViewsFactory(sqlstore),
		sqlmigration.NewUpdatePatAndOrgDomainsFactory(sqlstore),
		sqlmigration.NewUpdatePipelines(sqlstore),
		sqlmigration.NewDropLicensesSitesFactory(sqlstore),
		sqlmigration.NewUpdateInvitesFactory(sqlstore),
		sqlmigration.NewUpdatePatFactory(sqlstore),
		sqlmigration.NewUpdateAlertmanagerFactory(sqlstore),
		sqlmigration.NewUpdatePreferencesFactory(sqlstore),
		sqlmigration.NewUpdateApdexTtlFactory(sqlstore),
		sqlmigration.NewUpdateResetPasswordFactory(sqlstore),
		sqlmigration.NewUpdateRulesFactory(sqlstore),
		sqlmigration.NewAddVirtualFieldsFactory(),
		sqlmigration.NewUpdateIntegrationsFactory(sqlstore),
		sqlmigration.NewUpdateOrganizationsFactory(sqlstore),
		sqlmigration.NewDropGroupsFactory(sqlstore),
		sqlmigration.NewCreateQuickFiltersFactory(sqlstore),
		sqlmigration.NewUpdateQuickFiltersFactory(sqlstore),
		sqlmigration.NewAuthRefactorFactory(sqlstore),
		sqlmigration.NewUpdateLicenseFactory(sqlstore),
		sqlmigration.NewMigratePATToFactorAPIKey(sqlstore),
		sqlmigration.NewUpdateApiMonitoringFiltersFactory(sqlstore),
		sqlmigration.NewAddKeyOrganizationFactory(sqlstore),
		sqlmigration.NewAddTraceFunnelsFactory(sqlstore),
		sqlmigration.NewUpdateDashboardFactory(sqlstore),
		sqlmigration.NewDropFeatureSetFactory(),
		sqlmigration.NewDropDeprecatedTablesFactory(),
		sqlmigration.NewUpdateAgentsFactory(sqlstore),
		sqlmigration.NewUpdateUsersFactory(sqlstore, sqlschema),
		sqlmigration.NewUpdateUserInviteFactory(sqlstore, sqlschema),
		sqlmigration.NewUpdateOrgDomainFactory(sqlstore, sqlschema),
		sqlmigration.NewAddFactorIndexesFactory(sqlstore, sqlschema),
		sqlmigration.NewQueryBuilderV5MigrationFactory(sqlstore, telemetryStore),
		sqlmigration.NewAddMeterQuickFiltersFactory(sqlstore, sqlschema),
		sqlmigration.NewUpdateTTLSettingForCustomRetentionFactory(sqlstore, sqlschema),
		sqlmigration.NewAddRoutePolicyFactory(sqlstore, sqlschema),
		sqlmigration.NewAddAuthTokenFactory(sqlstore, sqlschema),
		sqlmigration.NewAddAuthzFactory(sqlstore, sqlschema),
		sqlmigration.NewAddPublicDashboardsFactory(sqlstore, sqlschema),
		sqlmigration.NewAddRoleFactory(sqlstore, sqlschema),
		sqlmigration.NewUpdateAuthzFactory(sqlstore, sqlschema),
	)
}

func NewTelemetryStoreProviderFactories() factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]] {
	return factory.MustNewNamedMap(
		clickhousetelemetrystore.NewFactory(
			telemetrystore.TelemetryStoreHookFactoryFunc(func(s string) factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
				return telemetrystorehook.NewSettingsFactory(s)
			}),
			telemetrystore.TelemetryStoreHookFactoryFunc(func(s string) factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
				return telemetrystorehook.NewLoggingFactory()
			}),
			telemetrystore.TelemetryStoreHookFactoryFunc(func(s string) factory.ProviderFactory[telemetrystore.TelemetryStoreHook, telemetrystore.Config] {
				return telemetrystorehook.NewInstrumentationFactory(s)
			}),
		),
	)
}

func NewPrometheusProviderFactories(telemetryStore telemetrystore.TelemetryStore) factory.NamedMap[factory.ProviderFactory[prometheus.Prometheus, prometheus.Config]] {
	return factory.MustNewNamedMap(
		clickhouseprometheus.NewFactory(telemetryStore),
	)
}

func NewNotificationManagerProviderFactories(routeStore alertmanagertypes.RouteStore) factory.NamedMap[factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config]] {
	return factory.MustNewNamedMap(
		rulebasednotification.NewFactory(routeStore),
	)
}

func NewAlertmanagerProviderFactories(sqlstore sqlstore.SQLStore, orgGetter organization.Getter, nfManager nfmanager.NotificationManager) factory.NamedMap[factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config]] {
	return factory.MustNewNamedMap(
		signozalertmanager.NewFactory(sqlstore, orgGetter, nfManager),
	)
}

func NewRulerProviderFactories(sqlstore sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[ruler.Ruler, ruler.Config]] {
	return factory.MustNewNamedMap(
		signozruler.NewFactory(sqlstore),
	)
}

func NewEmailingProviderFactories() factory.NamedMap[factory.ProviderFactory[emailing.Emailing, emailing.Config]] {
	return factory.MustNewNamedMap(
		noopemailing.NewFactory(),
		smtpemailing.NewFactory(),
	)
}

func NewSharderProviderFactories() factory.NamedMap[factory.ProviderFactory[sharder.Sharder, sharder.Config]] {
	return factory.MustNewNamedMap(
		singlesharder.NewFactory(),
		noopsharder.NewFactory(),
	)
}

func NewStatsReporterProviderFactories(telemetryStore telemetrystore.TelemetryStore, collectors []statsreporter.StatsCollector, orgGetter organization.Getter, userGetter user.Getter, tokenizer tokenizer.Tokenizer, build version.Build, analyticsConfig analytics.Config) factory.NamedMap[factory.ProviderFactory[statsreporter.StatsReporter, statsreporter.Config]] {
	return factory.MustNewNamedMap(
		analyticsstatsreporter.NewFactory(telemetryStore, collectors, orgGetter, userGetter, tokenizer, build, analyticsConfig),
		noopstatsreporter.NewFactory(),
	)
}

func NewQuerierProviderFactories(telemetryStore telemetrystore.TelemetryStore, prometheus prometheus.Prometheus, cache cache.Cache) factory.NamedMap[factory.ProviderFactory[querier.Querier, querier.Config]] {
	return factory.MustNewNamedMap(
		signozquerier.NewFactory(telemetryStore, prometheus, cache),
	)
}

func NewTokenizerProviderFactories(cache cache.Cache, sqlstore sqlstore.SQLStore, orgGetter organization.Getter) factory.NamedMap[factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config]] {
	tokenStore := sqltokenizerstore.NewStore(sqlstore)
	return factory.MustNewNamedMap(
		opaquetokenizer.NewFactory(cache, tokenStore, orgGetter),
		jwttokenizer.NewFactory(cache, tokenStore),
	)
}
