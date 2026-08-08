package signoz

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/sqlroutingstore"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/apiserver"
	"github.com/SigNoz/signoz/pkg/auditor"
	"github.com/SigNoz/signoz/pkg/authn"
	"github.com/SigNoz/signoz/pkg/authn/authnstore/sqlauthnstore"
	"github.com/SigNoz/signoz/pkg/authz"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/meterreporter"
	"github.com/SigNoz/signoz/pkg/modules/authdomain/implauthdomain"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/retention"
	"github.com/SigNoz/signoz/pkg/modules/retention/implretention"
	"github.com/SigNoz/signoz/pkg/modules/rulestatehistory"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount/implserviceaccount"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/modules/tag/impltag"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/statementbuilder/aistatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/auditstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/logsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/meterstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/metricsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/tracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	pkgtokenizer "github.com/SigNoz/signoz/pkg/tokenizer"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"

	"github.com/SigNoz/signoz/pkg/web"
)

type SigNoz struct {
	*factory.Registry
	Instrumentation        instrumentation.Instrumentation
	Analytics              analytics.Analytics
	Cache                  cache.Cache
	Web                    web.Web
	SQLStore               sqlstore.SQLStore
	TelemetryStore         telemetrystore.TelemetryStore
	TelemetryMetadataStore telemetrytypes.MetadataStore
	Prometheus             prometheus.Prometheus
	Alertmanager           alertmanager.Alertmanager
	Querier                querier.Querier
	APIServer              apiserver.APIServer
	Zeus                   zeus.Zeus
	Licensing              licensing.Licensing
	Emailing               emailing.Emailing
	Sharder                sharder.Sharder
	StatsReporter          statsreporter.StatsReporter
	Tokenizer              pkgtokenizer.Tokenizer
	IdentNResolver         identn.IdentNResolver
	Authz                  authz.AuthZ
	Ruler                  ruler.Ruler
	Modules                Modules
	Handlers               Handlers
	QueryParser            queryparser.QueryParser
	Flagger                flagger.Flagger
	Gateway                gateway.Gateway
	Auditor                auditor.Auditor
	MeterReporter          meterreporter.Reporter
}

// newQueryStack assembles the query stack once and returns, in order: the shared
// telemetry metadata store (reused elsewhere in signoz.New), the per-signal
// statement builders (trace, ai-trace, log, audit, metric, meter, trace-operator),
// and the bucket cache. It is the only place that imports the concrete
// statement-builder sub-packages.
func newQueryStack(
	ctx context.Context,
	settings factory.ProviderSettings,
	config Config,
	telemetryStore telemetrystore.TelemetryStore,
	cache cache.Cache,
	fl flagger.Flagger,
) (
	telemetrytypes.MetadataStore,
	qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	qbtypes.StatementBuilder[qbtypes.LogAggregation],
	qbtypes.StatementBuilder[qbtypes.LogAggregation],
	qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	qbtypes.StatementBuilder[qbtypes.MetricAggregation],
	qbtypes.TraceOperatorStatementBuilder,
	querier.BucketCache,
	error,
) {
	metadataStore := telemetrymetadata.NewTelemetryMetaStore(settings, telemetryStore, fl)

	cfg := config.Querier.Config
	traceStmtBuilder, err := tracesstatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	aiTraceStmtBuilder, err := aistatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	traceOperatorStmtBuilder, err := tracesstatementbuilder.NewOperatorFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	logStmtBuilder, err := logsstatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	auditStmtBuilder, err := auditstatementbuilder.NewFactory(metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	metricStmtBuilder, err := metricsstatementbuilder.NewFactory(metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}
	meterStmtBuilder, err := meterstatementbuilder.NewFactory(metadataStore, fl).New(ctx, settings, cfg)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, nil, nil, err
	}

	bucketCache := querier.NewBucketCache(settings, cache, config.Querier.CacheTTL, config.Querier.FluxInterval)

	return metadataStore, traceStmtBuilder, aiTraceStmtBuilder, logStmtBuilder, auditStmtBuilder, metricStmtBuilder, meterStmtBuilder, traceOperatorStmtBuilder, bucketCache, nil
}

func New(
	ctx context.Context,
	config Config,
	zeusConfig zeus.Config,
	zeusProviderFactory factory.ProviderFactory[zeus.Zeus, zeus.Config],
	licenseConfig licensing.Config,
	licenseProviderFactory func(sqlstore.SQLStore, zeus.Zeus, organization.Getter, analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config],
	emailingProviderFactories factory.NamedMap[factory.ProviderFactory[emailing.Emailing, emailing.Config]],
	cacheProviderFactories factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]],
	webProviderFactories factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]],
	sqlSchemaProviderFactories func(sqlstore.SQLStore) factory.NamedMap[factory.ProviderFactory[sqlschema.SQLSchema, sqlschema.Config]],
	sqlstoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]],
	telemetrystoreProviderFactories factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]],
	authNsCallback func(ctx context.Context, providerSettings factory.ProviderSettings, store authtypes.AuthNStore, licensing licensing.Licensing) (map[authtypes.AuthNProvider]authn.AuthN, error),
	authzCallback func(context.Context, sqlstore.SQLStore, authz.Config, licensing.Licensing, []authz.OnBeforeRoleDelete) (factory.ProviderFactory[authz.AuthZ, authz.Config], error),
	dashboardModuleCallback func(sqlstore.SQLStore, factory.ProviderSettings, analytics.Analytics, organization.Getter, queryparser.QueryParser, querier.Querier, licensing.Licensing, tag.Module) dashboard.Module,
	gatewayProviderFactory func(licensing.Licensing) factory.ProviderFactory[gateway.Gateway, gateway.Config],
	auditorProviderFactories func(licensing.Licensing) factory.NamedMap[factory.ProviderFactory[auditor.Auditor, auditor.Config]],
	meterReporterProviderFactories func(context.Context, factory.ProviderSettings, flagger.Flagger, licensing.Licensing, telemetrystore.TelemetryStore, retention.Getter, organization.Getter, zeus.Zeus) (factory.NamedMap[factory.ProviderFactory[meterreporter.Reporter, meterreporter.Config]], string),
	querierHandlerCallback func(factory.ProviderSettings, querier.Querier, analytics.Analytics) querier.Handler,
	cloudIntegrationCallback func(sqlstore.SQLStore, dashboard.Module, global.Global, zeus.Zeus, gateway.Gateway, licensing.Licensing, serviceaccount.Module, cloudintegration.Config) (cloudintegration.Module, error),
	metricReductionRuleModuleCallback func(sqlstore.SQLStore, telemetrystore.TelemetryStore, dashboard.Module, queryparser.QueryParser, licensing.Licensing, flagger.Flagger, telemetrytypes.MetadataStore, factory.ProviderSettings, int) metricreductionrule.Module,
	rulerProviderFactories func(cache.Cache, alertmanager.Alertmanager, sqlstore.SQLStore, telemetrystore.TelemetryStore, telemetrytypes.MetadataStore, prometheus.Prometheus, organization.Getter, rulestatehistory.Module, querier.Querier, queryparser.QueryParser) factory.NamedMap[factory.ProviderFactory[ruler.Ruler, ruler.Config]],
) (*SigNoz, error) {
	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
	if err != nil {
		return nil, err
	}

	instrumentation.Logger().InfoContext(ctx, "starting signoz", slog.String("version", version.Info.Version()), slog.String("variant", version.Info.Variant()), slog.String("commit", version.Info.Hash()), slog.String("branch", version.Info.Branch()), slog.String("go", version.Info.GoVersion()), slog.String("time", version.Info.Time()))
	instrumentation.Logger().DebugContext(ctx, "loaded signoz config", slog.Any("config", config))

	// Get the provider settings from instrumentation
	providerSettings := instrumentation.ToProviderSettings()

	pprofService, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.PProf,
		NewPProfProviderFactories(),
		config.PProf.Provider(),
	)
	if err != nil {
		return nil, err
	}

	// Initialize analytics just after instrumentation, as providers might require it
	analytics, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Analytics,
		NewAnalyticsProviderFactories(),
		config.Analytics.Provider(),
	)
	if err != nil {
		return nil, err
	}

	// Initialize zeus from the available zeus provider factory. This is not config controlled
	// and depends on the variant of the build.
	zeus, err := zeusProviderFactory.New(
		ctx,
		providerSettings,
		zeusConfig,
	)
	if err != nil {
		return nil, err
	}

	// Initialize emailing from the available emailing provider factories
	emailing, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Emailing,
		emailingProviderFactories,
		config.Emailing.Provider(),
	)
	if err != nil {
		return nil, err
	}

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

	// Initialize flagger from the available flagger provider factories
	flaggerRegistry := flagger.MustNewRegistry()
	flaggerProviderFactories := NewFlaggerProviderFactories(flaggerRegistry)
	flagger, err := flagger.New(
		ctx,
		providerSettings,
		config.Flagger,
		flaggerRegistry,
		flaggerProviderFactories.GetInOrder()...,
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

	retentionGetter := implretention.NewGetter(implretention.NewStore(sqlstore))

	// promV2 is the clickhousev2 provider handed to the querier for shadow
	// comparison and pinned serving (declared before the serving provider,
	// whose variable shadows the package name below).
	var promV2 prometheus.Prometheus

	// Initialize prometheus from the available prometheus provider factories
	prometheus, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Prometheus,
		NewPrometheusProviderFactories(telemetrystore),
		config.Prometheus.Provider(),
	)
	if err != nil {
		return nil, err
	}

	// With the default provider, also stand up the clickhousev2 provider for
	// the querier: PromQL queries shadow-compare against it behind the
	// use_prometheus_clickhouse_v2 flag (see pkg/querier/promql_shadow.go).
	// It never serves by default. An explicit
	// prometheus::provider: clickhousev2 makes v2 the serving provider
	// outright, so there is nothing to compare against.
	if config.Prometheus.Provider() == "clickhouse" {
		v2Config := config.Prometheus
		// The v2 engine only evaluates shadow and pinned queries; disable its
		// active query tracker so two trackers never share a file.
		v2Config.ActiveQueryTrackerConfig.Enabled = false
		promV2, err = clickhouseprometheusv2.New(ctx, providerSettings, v2Config, telemetrystore)
		if err != nil {
			return nil, err
		}
	}

	// Assemble the query stack (metadata store, statement builders, bucket cache) once,
	// and reuse the single metadata store everywhere downstream.
	telemetryMetadataStore, traceStmtBuilder, aiTraceStmtBuilder, logStmtBuilder, auditStmtBuilder, metricStmtBuilder, meterStmtBuilder, traceOperatorStmtBuilder, bucketCache, err := newQueryStack(ctx, providerSettings, config, telemetrystore, cache, flagger)
	if err != nil {
		return nil, err
	}

	// Initialize querier from the available querier provider factories
	querier, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Querier,
		NewQuerierProviderFactories(telemetrystore, prometheus, promV2, telemetryMetadataStore, traceStmtBuilder, aiTraceStmtBuilder, logStmtBuilder, auditStmtBuilder, metricStmtBuilder, meterStmtBuilder, traceOperatorStmtBuilder, bucketCache, flagger),
		config.Querier.Provider(),
	)
	if err != nil {
		return nil, err
	}

	sqlschema, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.SQLSchema,
		sqlSchemaProviderFactories(sqlstore),
		config.SQLStore.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize tag module — shared across modules that link entities to tags
	// (currently dashboard; future: alerts, RBAC). Built once here and injected
	// where needed.
	tagModule := impltag.NewModule(impltag.NewStore(sqlstore))

	// Dashboard store, injected into the migrations that reshape stored dashboards.
	dashboardStore := impldashboard.NewStore(sqlstore)

	// Run migrations on the sqlstore
	sqlmigrations, err := sqlmigration.New(
		ctx,
		providerSettings,
		config.SQLMigration,
		NewSQLMigrationProviderFactories(sqlstore, sqlschema, telemetrystore, providerSettings, dashboardStore, tagModule),
	)
	if err != nil {
		return nil, err
	}

	err = sqlmigrator.New(ctx, providerSettings, sqlstore, sqlmigrations, config.SQLMigrator).Migrate(ctx)
	if err != nil {
		return nil, err
	}

	// Initialize sharder from the available sharder provider factories
	sharder, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Sharder,
		NewSharderProviderFactories(),
		config.Sharder.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize organization getter
	orgGetter := implorganization.NewGetter(implorganization.NewStore(sqlstore), sharder)

	// Initialize tokenizer from the available tokenizer provider factories
	tokenizer, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Tokenizer,
		NewTokenizerProviderFactories(cache, sqlstore, orgGetter),
		config.Tokenizer.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize user store
	userStore := impluser.NewStore(sqlstore, providerSettings)

	// Initialize user role store
	userRoleStore := impluser.NewUserRoleStore(sqlstore, providerSettings)

	licensingProviderFactory := licenseProviderFactory(sqlstore, zeus, orgGetter, analytics)
	licensing, err := licensingProviderFactory.New(
		ctx,
		providerSettings,
		licenseConfig,
	)
	if err != nil {
		return nil, err
	}

	// Initialize query parser (needed for dashboard module)
	queryParser := queryparser.New(providerSettings)

	// Initialize dashboard module
	dashboard := dashboardModuleCallback(sqlstore, providerSettings, analytics, orgGetter, queryParser, querier, licensing, tagModule)

	// Initialize user getter
	userGetter := impluser.NewGetter(userStore, userRoleStore, flagger)

	// Initialize service account getter
	serviceAccountGetter := implserviceaccount.NewGetter(implserviceaccount.NewStore(sqlstore))

	authDomainGetter := implauthdomain.NewGetter(implauthdomain.NewStore(sqlstore))

	// Build pre-delete callbacks from modules
	onBeforeRoleDelete := []authz.OnBeforeRoleDelete{
		userGetter.OnBeforeRoleDelete,
		serviceAccountGetter.OnBeforeRoleDelete,
		authDomainGetter.OnBeforeRoleDelete,
	}

	// Initialize authz
	authzProviderFactory, err := authzCallback(ctx, sqlstore, config.Authz, licensing, onBeforeRoleDelete)
	if err != nil {
		return nil, err
	}
	authz, err := authzProviderFactory.New(ctx, providerSettings, config.Authz)
	if err != nil {
		return nil, err
	}

	// Initialize notification manager from the available notification manager provider factories
	nfManager, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		nfmanager.Config{},
		NewNotificationManagerProviderFactories(sqlroutingstore.NewStore(sqlstore)),
		"rulebased",
	)
	if err != nil {
		return nil, err
	}

	maintenanceStore := sqlalertmanagerstore.NewMaintenanceStore(sqlstore, providerSettings)

	// Initialize alertmanager from the available alertmanager provider factories
	alertmanager, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Alertmanager,
		NewAlertmanagerProviderFactories(sqlstore, orgGetter, nfManager, maintenanceStore),
		config.Alertmanager.Provider,
	)
	if err != nil {
		return nil, err
	}

	gatewayFactory := gatewayProviderFactory(licensing)
	gateway, err := gatewayFactory.New(ctx, providerSettings, config.Gateway)
	if err != nil {
		return nil, err
	}

	// Initialize auditor from the variant-specific provider factories
	auditor, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.Auditor, auditorProviderFactories(licensing), config.Auditor.Provider)
	if err != nil {
		return nil, err
	}

	// Initialize meter reporter from the variant-specific provider factories
	meterReporterFactories, meterReporterProvider := meterReporterProviderFactories(ctx, providerSettings, flagger, licensing, telemetrystore, retentionGetter, orgGetter, zeus)
	meterReporter, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.MeterReporter, meterReporterFactories, meterReporterProvider)
	if err != nil {
		return nil, err
	}

	// Initialize authns
	store := sqlauthnstore.NewStore(sqlstore)
	authNs, err := authNsCallback(ctx, providerSettings, store, licensing)
	if err != nil {
		return nil, err
	}

	global, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Global,
		NewGlobalProviderFactories(config.IdentN),
		"signoz",
	)
	if err != nil {
		return nil, err
	}

	serviceAccount := implserviceaccount.NewModule(implserviceaccount.NewStore(sqlstore), authz, cache, analytics, providerSettings, config.ServiceAccount)

	cloudIntegrationModule, err := cloudIntegrationCallback(sqlstore, dashboard, global, zeus, gateway, licensing, serviceAccount, config.CloudIntegration)
	if err != nil {
		return nil, err
	}

	metricReductionRuleModule := metricReductionRuleModuleCallback(sqlstore, telemetrystore, dashboard, queryParser, licensing, flagger, telemetryMetadataStore, providerSettings, config.MetricsExplorer.TelemetryStore.Threads)

	// Initialize all modules
	modules := NewModules(sqlstore, tokenizer, emailing, providerSettings, orgGetter, alertmanager, analytics, querier, telemetrystore, telemetryMetadataStore, authNs, authz, cache, queryParser, config, dashboard, userGetter, userRoleStore, serviceAccount, serviceAccountGetter, cloudIntegrationModule, retentionGetter, flagger, tagModule, metricReductionRuleModule)

	// Initialize ruler from the variant-specific provider factories
	rulerInstance, err := factory.NewProviderFromNamedMap(ctx, providerSettings, config.Ruler, rulerProviderFactories(cache, alertmanager, sqlstore, telemetrystore, telemetryMetadataStore, prometheus, orgGetter, modules.RuleStateHistory, querier, queryParser), "signoz")
	if err != nil {
		return nil, err
	}

	// Initialize identN resolver
	identNFactories := NewIdentNProviderFactories(tokenizer, serviceAccount, orgGetter, userGetter, modules.UserSetter, config.User)
	identNResolver, err := identn.NewIdentNResolver(ctx, providerSettings, config.IdentN, identNFactories)
	if err != nil {
		return nil, err
	}

	userService := impluser.NewService(providerSettings, impluser.NewStore(sqlstore, providerSettings), modules.UserGetter, modules.UserSetter, orgGetter, authz, config.User.Root)

	// Initialize the querier handler via callback (allows EE to decorate with anomaly detection)
	querierHandler := querierHandlerCallback(providerSettings, querier, analytics)

	// Create a list of all stats collectors
	statsCollectors := []statsreporter.StatsCollector{
		alertmanager,
		rulerInstance,
		modules.Dashboard,
		modules.SavedView,
		modules.UserSetter,
		licensing,
		tokenizer,
		config,
		modules.AuthDomain,
		serviceAccount,
		cloudIntegrationModule,
		modules.LogsPipeline,
		modules.InfraMonitoring,
		querier,
		authz,
	}

	// Initialize the stats aggregator (always-on, independent of whether reporting is enabled)
	statsAggregator := statsreporter.NewAggregator(providerSettings, statsCollectors)

	// Initialize stats reporter from the available stats reporter provider factories
	statsReporter, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.StatsReporter,
		NewStatsReporterProviderFactories(statsAggregator, orgGetter, userGetter, tokenizer, version.Info, config.Analytics),
		config.StatsReporter.Provider(),
	)
	if err != nil {
		return nil, err
	}

	registry, err := factory.NewRegistry(
		ctx,
		instrumentation.Logger(),
		factory.NewNamedService(factory.MustNewName("instrumentation"), instrumentation),
		factory.NewNamedService(factory.MustNewName("pprof"), pprofService),
		factory.NewNamedService(factory.MustNewName("analytics"), analytics),
		factory.NewNamedService(factory.MustNewName("alertmanager"), alertmanager),
		factory.NewNamedService(factory.MustNewName("licensing"), licensing),
		factory.NewNamedService(factory.MustNewName("statsreporter"), statsReporter),
		factory.NewNamedService(factory.MustNewName("tokenizer"), tokenizer),
		factory.NewNamedService(factory.MustNewName("authz"), authz),
		factory.NewNamedService(factory.MustNewName("user"), userService, factory.MustNewName("authz")),
		factory.NewNamedService(factory.MustNewName("auditor"), auditor),
		factory.NewNamedService(factory.MustNewName("meterreporter"), meterReporter, factory.MustNewName("licensing")),
		factory.NewNamedService(factory.MustNewName("ruler"), rulerInstance),
	)
	if err != nil {
		return nil, err
	}

	// Initialize all handlers for the modules
	registryHandler := factory.NewHandler(registry)
	handlers := NewHandlers(modules, providerSettings, analytics, querierHandler, licensing, global, flagger, gateway, telemetryMetadataStore, authz, zeus, registryHandler, alertmanager, rulerInstance, statsAggregator)

	// Initialize the API server (after registry so it can access service health)
	apiserverInstance, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.APIServer,
		NewAPIServerProviderFactories(orgGetter, authz, modules, handlers, config.Global),
		"signoz",
	)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Registry:               registry,
		Analytics:              analytics,
		Instrumentation:        instrumentation,
		Cache:                  cache,
		Web:                    web,
		SQLStore:               sqlstore,
		TelemetryStore:         telemetrystore,
		TelemetryMetadataStore: telemetryMetadataStore,
		Prometheus:             prometheus,
		Alertmanager:           alertmanager,
		Querier:                querier,
		APIServer:              apiserverInstance,
		Zeus:                   zeus,
		Licensing:              licensing,
		Emailing:               emailing,
		Sharder:                sharder,
		Tokenizer:              tokenizer,
		IdentNResolver:         identNResolver,
		Authz:                  authz,
		Ruler:                  rulerInstance,
		Modules:                modules,
		Handlers:               handlers,
		QueryParser:            queryParser,
		Flagger:                flagger,
		Gateway:                gateway,
		Auditor:                auditor,
		MeterReporter:          meterReporter,
	}, nil
}
