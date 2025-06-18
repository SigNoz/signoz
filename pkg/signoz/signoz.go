package signoz

import (
	"context"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/organization/implorganization"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/sharder"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/statsreporter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"

	"github.com/SigNoz/signoz/pkg/web"
)

type SigNoz struct {
	*factory.Registry
	Instrumentation instrumentation.Instrumentation
	Analytics       analytics.Analytics
	Cache           cache.Cache
	Web             web.Web
	SQLStore        sqlstore.SQLStore
	TelemetryStore  telemetrystore.TelemetryStore
	Prometheus      prometheus.Prometheus
	Alertmanager    alertmanager.Alertmanager
	Querier         querier.Querier
	Rules           ruler.Ruler
	Zeus            zeus.Zeus
	Licensing       licensing.Licensing
	Emailing        emailing.Emailing
	Sharder         sharder.Sharder
	StatsReporter   statsreporter.StatsReporter
	Modules         Modules
	Handlers        Handlers
}

func New(
	ctx context.Context,
	config Config,
	jwt *authtypes.JWT,
	zeusConfig zeus.Config,
	zeusProviderFactory factory.ProviderFactory[zeus.Zeus, zeus.Config],
	licenseConfig licensing.Config,
	licenseProviderFactory func(sqlstore.SQLStore, zeus.Zeus, organization.Getter, analytics.Analytics) factory.ProviderFactory[licensing.Licensing, licensing.Config],
	emailingProviderFactories factory.NamedMap[factory.ProviderFactory[emailing.Emailing, emailing.Config]],
	cacheProviderFactories factory.NamedMap[factory.ProviderFactory[cache.Cache, cache.Config]],
	webProviderFactories factory.NamedMap[factory.ProviderFactory[web.Web, web.Config]],
	sqlstoreProviderFactories factory.NamedMap[factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config]],
	telemetrystoreProviderFactories factory.NamedMap[factory.ProviderFactory[telemetrystore.TelemetryStore, telemetrystore.Config]],
) (*SigNoz, error) {
	// Initialize instrumentation
	instrumentation, err := instrumentation.New(ctx, config.Instrumentation, version.Info, "signoz")
	if err != nil {
		return nil, err
	}

	instrumentation.Logger().InfoContext(ctx, "starting signoz", "version", version.Info.Version(), "variant", version.Info.Variant(), "commit", version.Info.Hash(), "branch", version.Info.Branch(), "go", version.Info.GoVersion(), "time", version.Info.Time())
	instrumentation.Logger().DebugContext(ctx, "loaded signoz config", "config", config)

	// Get the provider settings from instrumentation
	providerSettings := instrumentation.ToProviderSettings()

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

	// Initialize querier from the available querier provider factories
	querier, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Querier,
		NewQuerierProviderFactories(telemetrystore, prometheus, cache),
		config.Querier.Provider(),
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

	// Initialize user getter
	userGetter := impluser.NewGetter(impluser.NewStore(sqlstore, providerSettings))

	// Initialize alertmanager from the available alertmanager provider factories
	alertmanager, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Alertmanager,
		NewAlertmanagerProviderFactories(sqlstore, orgGetter),
		config.Alertmanager.Provider,
	)
	if err != nil {
		return nil, err
	}

	// Initialize ruler from the available ruler provider factories
	ruler, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.Ruler,
		NewRulerProviderFactories(sqlstore),
		"signoz",
	)
	if err != nil {
		return nil, err
	}

	licensingProviderFactory := licenseProviderFactory(sqlstore, zeus, orgGetter, analytics)
	licensing, err := licensingProviderFactory.New(
		ctx,
		providerSettings,
		licenseConfig,
	)
	if err != nil {
		return nil, err
	}

	// Initialize all modules
	modules := NewModules(sqlstore, jwt, emailing, providerSettings, orgGetter, alertmanager, analytics)

	// Initialize all handlers for the modules
	handlers := NewHandlers(modules)

	// Create a list of all stats collectors
	statsCollectors := []statsreporter.StatsCollector{
		alertmanager,
		ruler,
		modules.Dashboard,
		modules.SavedView,
		modules.User,
		licensing,
	}

	// Initialize stats reporter from the available stats reporter provider factories
	statsReporter, err := factory.NewProviderFromNamedMap(
		ctx,
		providerSettings,
		config.StatsReporter,
		NewStatsReporterProviderFactories(telemetrystore, statsCollectors, orgGetter, userGetter, version.Info, config.Analytics),
		config.StatsReporter.Provider(),
	)
	if err != nil {
		return nil, err
	}

	registry, err := factory.NewRegistry(
		instrumentation.Logger(),
		factory.NewNamedService(factory.MustNewName("instrumentation"), instrumentation),
		factory.NewNamedService(factory.MustNewName("analytics"), analytics),
		factory.NewNamedService(factory.MustNewName("alertmanager"), alertmanager),
		factory.NewNamedService(factory.MustNewName("licensing"), licensing),
		factory.NewNamedService(factory.MustNewName("statsreporter"), statsReporter),
	)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Registry:        registry,
		Analytics:       analytics,
		Instrumentation: instrumentation,
		Cache:           cache,
		Web:             web,
		SQLStore:        sqlstore,
		TelemetryStore:  telemetrystore,
		Prometheus:      prometheus,
		Alertmanager:    alertmanager,
		Querier:         querier,
		Zeus:            zeus,
		Licensing:       licensing,
		Emailing:        emailing,
		Sharder:         sharder,
		Modules:         modules,
		Handlers:        handlers,
	}, nil
}
