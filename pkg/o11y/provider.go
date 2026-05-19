package o11y

import (
	"github.com/hanzoai/o11y/pkg/alertmanager"
	"github.com/hanzoai/o11y/pkg/alertmanager/nfmanager"
	"github.com/hanzoai/o11y/pkg/alertmanager/nfmanager/rulebasednotification"
	"github.com/hanzoai/o11y/pkg/alertmanager/o11yalertmanager"
	"github.com/hanzoai/o11y/pkg/analytics"
	"github.com/hanzoai/o11y/pkg/analytics/noopanalytics"
	"github.com/hanzoai/o11y/pkg/analytics/segmentanalytics"
	"github.com/hanzoai/o11y/pkg/apiserver"
	"github.com/hanzoai/o11y/pkg/apiserver/o11yapiserver"
	"github.com/hanzoai/o11y/pkg/authz"
	"github.com/hanzoai/o11y/pkg/cache"
	"github.com/hanzoai/o11y/pkg/cache/memorycache"
	"github.com/hanzoai/o11y/pkg/cache/rediscache"
	"github.com/hanzoai/o11y/pkg/emailing"
	"github.com/hanzoai/o11y/pkg/emailing/noopemailing"
	"github.com/hanzoai/o11y/pkg/emailing/smtpemailing"
	"github.com/hanzoai/o11y/pkg/factory"
	"github.com/hanzoai/o11y/pkg/flagger"
	"github.com/hanzoai/o11y/pkg/flagger/configflagger"
	"github.com/hanzoai/o11y/pkg/global"
	"github.com/hanzoai/o11y/pkg/global/o11yglobal"
	"github.com/hanzoai/o11y/pkg/modules/authdomain/implauthdomain"
	"github.com/hanzoai/o11y/pkg/modules/organization"
	"github.com/hanzoai/o11y/pkg/modules/organization/implorganization"
	"github.com/hanzoai/o11y/pkg/modules/preference/implpreference"
	"github.com/hanzoai/o11y/pkg/modules/promote/implpromote"
	"github.com/hanzoai/o11y/pkg/modules/session/implsession"
	"github.com/hanzoai/o11y/pkg/modules/user"
	"github.com/hanzoai/o11y/pkg/modules/user/impluser"
	"github.com/hanzoai/o11y/pkg/prometheus"
	"github.com/hanzoai/o11y/pkg/prometheus/clickhouseprometheus"
	"github.com/hanzoai/o11y/pkg/querier"
	"github.com/hanzoai/o11y/pkg/querier/o11yquerier"
	"github.com/hanzoai/o11y/pkg/queryparser"
	"github.com/hanzoai/o11y/pkg/ruler"
	"github.com/hanzoai/o11y/pkg/ruler/o11yruler"
	"github.com/hanzoai/o11y/pkg/sharder"
	"github.com/hanzoai/o11y/pkg/sharder/noopsharder"
	"github.com/hanzoai/o11y/pkg/sharder/singlesharder"
	"github.com/hanzoai/o11y/pkg/sqlmigration"
	"github.com/hanzoai/o11y/pkg/sqlschema"
	"github.com/hanzoai/o11y/pkg/sqlschema/sqlitesqlschema"
	"github.com/hanzoai/o11y/pkg/sqlstore"
	"github.com/hanzoai/o11y/pkg/sqlstore/sqlitesqlstore"
	"github.com/hanzoai/o11y/pkg/sqlstore/sqlstorehook"
	"github.com/hanzoai/o11y/pkg/statsreporter"
	"github.com/hanzoai/o11y/pkg/statsreporter/analyticsstatsreporter"
	"github.com/hanzoai/o11y/pkg/statsreporter/noopstatsreporter"
	"github.com/hanzoai/o11y/pkg/telemetrystore"
	"github.com/hanzoai/o11y/pkg/telemetrystore/clickhousetelemetrystore"
	"github.com/hanzoai/o11y/pkg/telemetrystore/telemetrystorehook"
	"github.com/hanzoai/o11y/pkg/tokenizer"
	"github.com/hanzoai/o11y/pkg/tokenizer/jwttokenizer"
	"github.com/hanzoai/o11y/pkg/tokenizer/opaquetokenizer"
	"github.com/hanzoai/o11y/pkg/tokenizer/tokenizerstore/sqltokenizerstore"
	"github.com/hanzoai/o11y/pkg/types/alertmanagertypes"
	"github.com/hanzoai/o11y/pkg/types/featuretypes"
	"github.com/hanzoai/o11y/pkg/version"
	"github.com/hanzoai/o11y/pkg/web"
	"github.com/hanzoai/o11y/pkg/web/noopweb"
	"github.com/hanzoai/o11y/pkg/web/routerweb"
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
		sqlmigration.NewUpdateUserPreferenceFactory(sqlstore, sqlschema),
		sqlmigration.NewUpdateOrgPreferenceFactory(sqlstore, sqlschema),
		sqlmigration.NewRenameOrgDomainsFactory(sqlstore, sqlschema),
		sqlmigration.NewAddResetPasswordTokenExpiryFactory(sqlstore, sqlschema),
		sqlmigration.NewAddManagedRolesFactory(sqlstore, sqlschema),
		sqlmigration.NewAddAuthzIndexFactory(sqlstore, sqlschema),
		sqlmigration.NewMigrateRbacToAuthzFactory(sqlstore),
		sqlmigration.NewMigratePublicDashboardsFactory(sqlstore),
		sqlmigration.NewAddAnonymousPublicDashboardTransactionFactory(sqlstore),
		sqlmigration.NewAddRootUserFactory(sqlstore, sqlschema),
		sqlmigration.NewAddUserEmailOrgIDIndexFactory(sqlstore, sqlschema),
		sqlmigration.NewMigrateRulesV4ToV5Factory(sqlstore, telemetryStore),
		sqlmigration.NewAddStatusUserFactory(sqlstore, sqlschema),
		sqlmigration.NewDeprecateUserInviteFactory(sqlstore, sqlschema),
	)
}

func NewTelemetryStoreProviderFactories() factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]] {
	return factory.MustNewNamedMap(
		clickhousetelemetrystore.NewFactory(
			telemetrystorehook.NewLoggingFactory(),
			// adding instrumentation factory before settings as we are starting the query span here
			telemetrystorehook.NewInstrumentationFactory(),
			telemetrystorehook.NewSettingsFactory(),
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
		o11yalertmanager.NewFactory(sqlstore, orgGetter, nfManager),
	)
}

func NewRulerProviderFactories(sqlstore sqlstore.SQLStore, queryParser queryparser.QueryParser) factory.NamedMap[factory.ProviderFactory[ruler.Ruler, ruler.Config]] {
	return factory.MustNewNamedMap(
		o11yruler.NewFactory(sqlstore, queryParser),
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

func NewQuerierProviderFactories(telemetryStore telemetrystore.TelemetryStore, prometheus prometheus.Prometheus, cache cache.Cache, flagger flagger.Flagger) factory.NamedMap[factory.ProviderFactory[querier.Querier, querier.Config]] {
	return factory.MustNewNamedMap(
		o11yquerier.NewFactory(telemetryStore, prometheus, cache, flagger),
	)
}

func NewAPIServerProviderFactories(orgGetter organization.Getter, authz authz.AuthZ, global global.Global, modules Modules, handlers Handlers) factory.NamedMap[factory.ProviderFactory[apiserver.APIServer, apiserver.Config]] {
	return factory.MustNewNamedMap(
		o11yapiserver.NewFactory(
			orgGetter,
			authz,
			implorganization.NewHandler(modules.OrgGetter, modules.OrgSetter),
			impluser.NewHandler(modules.User, modules.UserGetter),
			implsession.NewHandler(modules.Session),
			implauthdomain.NewHandler(modules.AuthDomain),
			implpreference.NewHandler(modules.Preference),
			o11yglobal.NewHandler(global),
			implpromote.NewHandler(modules.Promote),
			handlers.FlaggerHandler,
			modules.Dashboard,
			handlers.Dashboard,
			handlers.MetricsExplorer,
			handlers.GatewayHandler,
			handlers.Fields,
			handlers.AuthzHandler,
			handlers.ZeusHandler,
			handlers.QuerierHandler,
			handlers.ServiceAccountHandler,
		),
	)
}

func NewTokenizerProviderFactories(cache cache.Cache, sqlstore sqlstore.SQLStore, orgGetter organization.Getter) factory.NamedMap[factory.ProviderFactory[tokenizer.Tokenizer, tokenizer.Config]] {
	tokenStore := sqltokenizerstore.NewStore(sqlstore)
	return factory.MustNewNamedMap(
		opaquetokenizer.NewFactory(cache, tokenStore, orgGetter),
		jwttokenizer.NewFactory(cache, tokenStore),
	)
}

func NewGlobalProviderFactories() factory.NamedMap[factory.ProviderFactory[global.Global, global.Config]] {
	return factory.MustNewNamedMap(
		o11yglobal.NewFactory(),
	)
}

func NewFlaggerProviderFactories(registry featuretypes.Registry) factory.NamedMap[factory.ProviderFactory[flagger.FlaggerProvider, flagger.Config]] {
	return factory.MustNewNamedMap(
		configflagger.NewFactory(registry),
	)
}
