package signoz

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/emailing"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/instrumentation"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/SigNoz/signoz/pkg/zeus"

	"github.com/SigNoz/signoz/pkg/web"
)

type SigNoz struct {
	*factory.Registry
	Instrumentation instrumentation.Instrumentation
	Cache           cache.Cache
	Web             web.Web
	SQLStore        sqlstore.SQLStore
	TelemetryStore  telemetrystore.TelemetryStore
	Prometheus      prometheus.Prometheus
	Alertmanager    alertmanager.Alertmanager
	Zeus            zeus.Zeus
	Licensing       licensing.Licensing
	Emailing        emailing.Emailing
	Modules         Modules
	Handlers        Handlers
}

// TODO: clean up this
func newQuerier(
	logger *slog.Logger,
	telemetrystore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
) (qbtypes.Querier, error) {

	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		logger,
		telemetrystore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
	)
	traceFieldMapper := telemetrytraces.NewFieldMapper()
	traceConditionBuilder := telemetrytraces.NewConditionBuilder(traceFieldMapper)

	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)
	resourceFilterStmtBuilder := resourcefilter.NewTraceResourceFilterStatementBuilder(
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		telemetryMetadataStore,
	)

	traceAggExprRewriter := querybuilder.NewAggExprRewriter(nil, traceFieldMapper, traceConditionBuilder, "", nil)
	traceStmtBuilder := telemetrytraces.NewTraceQueryStatementBuilder(
		slog.Default(),
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		resourceFilterStmtBuilder,
		traceAggExprRewriter,
	)

	logFieldMapper := telemetrylogs.NewFieldMapper()
	logConditionBuilder := telemetrylogs.NewConditionBuilder(logFieldMapper)
	logResourceFilterStmtBuilder := resourcefilter.NewLogResourceFilterStatementBuilder(
		logFieldMapper,
		logConditionBuilder,
		telemetryMetadataStore,
	)
	logAggExprRewriter := querybuilder.NewAggExprRewriter(
		&telemetrytypes.TelemetryFieldKey{
			Name:          "body",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		logFieldMapper,
		logConditionBuilder,
		telemetrylogs.BodyJSONStringSearchPrefix,
		telemetrylogs.GetBodyJSONKey,
	)
	logStmtBuilder := telemetrylogs.NewLogQueryStatementBuilder(
		logger,
		telemetryMetadataStore,
		logFieldMapper,
		logConditionBuilder,
		logResourceFilterStmtBuilder,
		logAggExprRewriter,
	)

	querier := querier.NewQuerier(
		telemetrystore,
		telemetryMetadataStore,
		prometheus,
		traceStmtBuilder,
		logStmtBuilder,
		nil,
	)

	return querier, nil
}

func New(
	ctx context.Context,
	config Config,
	jwt *authtypes.JWT,
	zeusConfig zeus.Config,
	zeusProviderFactory factory.ProviderFactory[zeus.Zeus, zeus.Config],
	licenseConfig licensing.Config,
	licenseProviderFactoryCb func(sqlstore.SQLStore, zeus.Zeus) factory.ProviderFactory[licensing.Licensing, licensing.Config],
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

	// Initialize alertmanager from the available alertmanager provider factories
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

	licensingProviderFactory := licenseProviderFactoryCb(sqlstore, zeus)
	licensing, err := licensingProviderFactory.New(
		ctx,
		providerSettings,
		licenseConfig,
	)
	if err != nil {
		return nil, err
	}

	querier, err := newQuerier(instrumentation.Logger(), telemetrystore, prometheus)
	if err != nil {
		return nil, err
	}

	// Initialize all modules
	modules := NewModules(sqlstore, jwt, emailing, providerSettings, querier)

	// Initialize all handlers for the modules
	handlers := NewHandlers(modules)

	registry, err := factory.NewRegistry(
		instrumentation.Logger(),
		factory.NewNamedService(factory.MustNewName("instrumentation"), instrumentation),
		factory.NewNamedService(factory.MustNewName("alertmanager"), alertmanager),
		factory.NewNamedService(factory.MustNewName("licensing"), licensing),
	)
	if err != nil {
		return nil, err
	}

	return &SigNoz{
		Registry:        registry,
		Instrumentation: instrumentation,
		Cache:           cache,
		Web:             web,
		SQLStore:        sqlstore,
		TelemetryStore:  telemetrystore,
		Prometheus:      prometheus,
		Alertmanager:    alertmanager,
		Zeus:            zeus,
		Licensing:       licensing,
		Emailing:        emailing,
		Modules:         modules,
		Handlers:        handlers,
	}, nil
}
