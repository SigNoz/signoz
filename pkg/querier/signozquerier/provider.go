package signozquerier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryaudit"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
)

// NewFactory creates a new factory for the signoz querier provider.
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cache cache.Cache,
	flagger flagger.Flagger,
) factory.ProviderFactory[querier.Querier, querier.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("signoz"),
		func(
			ctx context.Context,
			settings factory.ProviderSettings,
			cfg querier.Config,
		) (querier.Querier, error) {
			return newProvider(ctx, settings, cfg, telemetryStore, prometheus, cache, flagger)
		},
	)
}

func newProvider(
	_ context.Context,
	settings factory.ProviderSettings,
	cfg querier.Config,
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cache cache.Cache,
	flagger flagger.Flagger,
) (querier.Querier, error) {

	// Create telemetry metadata store
	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		settings,
		telemetryStore,
		telemetrytraces.DBName,
		telemetrytraces.TagAttributesV2TableName,
		telemetrytraces.SpanAttributesKeysTblName,
		telemetrytraces.SpanIndexV3TableName,
		telemetrymetrics.DBName,
		telemetrymetrics.AttributesMetadataTableName,
		telemetrymeter.DBName,
		telemetrymeter.SamplesAgg1dTableName,
		telemetrylogs.DBName,
		telemetrylogs.LogsV2TableName,
		telemetrylogs.TagAttributesV2TableName,
		telemetrylogs.LogAttributeKeysTblName,
		telemetrylogs.LogResourceKeysTblName,
		telemetryaudit.DBName,
		telemetryaudit.AuditLogsTableName,
		telemetryaudit.TagAttributesTableName,
		telemetryaudit.LogAttributeKeysTblName,
		telemetryaudit.LogResourceKeysTblName,
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
		telemetrymetadata.ColumnEvolutionMetadataTableName,
		flagger,
	)

	// Create trace statement builder
	traceFieldMapper := telemetrytraces.NewFieldMapper()
	traceConditionBuilder := telemetrytraces.NewConditionBuilder(traceFieldMapper)

	traceAggExprRewriter := querybuilder.NewAggExprRewriter(settings, nil, traceFieldMapper, traceConditionBuilder, nil, flagger)
	traceStmtBuilder := telemetrytraces.NewTraceQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		traceAggExprRewriter,
		telemetryStore,
		flagger,
	)

	// Create trace operator statement builder
	traceOperatorStmtBuilder := telemetrytraces.NewTraceOperatorStatementBuilder(
		settings,
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		traceStmtBuilder,
		traceAggExprRewriter,
		flagger,
	)

	// Create log statement builder
	logFieldMapper := telemetrylogs.NewFieldMapper(flagger)
	logConditionBuilder := telemetrylogs.NewConditionBuilder(logFieldMapper, flagger)
	logAggExprRewriter := querybuilder.NewAggExprRewriter(
		settings,
		telemetrylogs.DefaultFullTextColumn,
		logFieldMapper,
		logConditionBuilder,
		telemetrylogs.GetBodyJSONKey,
		flagger,
	)
	logStmtBuilder := telemetrylogs.NewLogQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		logFieldMapper,
		logConditionBuilder,
		logAggExprRewriter,
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.GetBodyJSONKey,
		flagger,
	)

	// Create audit statement builder
	auditFieldMapper := telemetryaudit.NewFieldMapper()
	auditConditionBuilder := telemetryaudit.NewConditionBuilder(auditFieldMapper)
	auditAggExprRewriter := querybuilder.NewAggExprRewriter(
		settings,
		telemetryaudit.DefaultFullTextColumn,
		auditFieldMapper,
		auditConditionBuilder,
		nil,
		flagger,
	)
	auditStmtBuilder := telemetryaudit.NewAuditQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		auditFieldMapper,
		auditConditionBuilder,
		auditAggExprRewriter,
		telemetryaudit.DefaultFullTextColumn,
		nil,
		flagger,
	)

	// Create metric statement builder
	metricFieldMapper := telemetrymetrics.NewFieldMapper()
	metricConditionBuilder := telemetrymetrics.NewConditionBuilder(metricFieldMapper)
	metricStmtBuilder := telemetrymetrics.NewMetricQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		metricFieldMapper,
		metricConditionBuilder,
		flagger,
	)

	// Create meter statement builder
	meterStmtBuilder := telemetrymeter.NewMeterQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		metricFieldMapper,
		metricConditionBuilder,
		metricStmtBuilder,
	)

	// Create bucket cache
	bucketCache := querier.NewBucketCache(
		settings,
		cache,
		cfg.CacheTTL,
		cfg.FluxInterval,
	)

	// Create and return the querier
	return querier.New(
		settings,
		telemetryStore,
		telemetryMetadataStore,
		prometheus,
		traceStmtBuilder,
		logStmtBuilder,
		auditStmtBuilder,
		metricStmtBuilder,
		meterStmtBuilder,
		traceOperatorStmtBuilder,
		bucketCache,
		flagger,
	), nil
}
