package signozquerier

import (
	"context"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymeter"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
)

// NewFactory creates a new factory for the signoz querier provider
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cache cache.Cache,
) factory.ProviderFactory[querier.Querier, querier.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("signoz"),
		func(
			ctx context.Context,
			settings factory.ProviderSettings,
			cfg querier.Config,
		) (querier.Querier, error) {
			return newProvider(ctx, settings, cfg, telemetryStore, prometheus, cache)
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
		telemetrymetadata.DBName,
		telemetrymetadata.AttributesMetadataLocalTableName,
	)

	// Create trace statement builder
	traceFieldMapper := telemetrytraces.NewFieldMapper()
	traceConditionBuilder := telemetrytraces.NewConditionBuilder(traceFieldMapper)

	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)
	resourceFilterStmtBuilder := resourcefilter.NewTraceResourceFilterStatementBuilder(
		settings,
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		telemetryMetadataStore,
	)

	traceAggExprRewriter := querybuilder.NewAggExprRewriter(settings, nil, traceFieldMapper, traceConditionBuilder, "", nil)
	traceStmtBuilder := telemetrytraces.NewTraceQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		resourceFilterStmtBuilder,
		traceAggExprRewriter,
		telemetryStore,
	)

	// ADD: Create trace operator statement builder
	traceOperatorStmtBuilder := telemetrytraces.NewTraceOperatorStatementBuilder(
		settings,
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		traceStmtBuilder,          // Pass the regular trace statement builder
		resourceFilterStmtBuilder, // Pass the resource filter statement builder
		traceAggExprRewriter,
	)

	// Create log statement builder
	logFieldMapper := telemetrylogs.NewFieldMapper()
	logConditionBuilder := telemetrylogs.NewConditionBuilder(logFieldMapper)
	logResourceFilterStmtBuilder := resourcefilter.NewLogResourceFilterStatementBuilder(
		settings,
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		telemetryMetadataStore,
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.BodyJSONStringSearchPrefix,
		telemetrylogs.GetBodyJSONKey,
	)
	logAggExprRewriter := querybuilder.NewAggExprRewriter(
		settings,
		telemetrylogs.DefaultFullTextColumn,
		logFieldMapper,
		logConditionBuilder,
		telemetrylogs.BodyJSONStringSearchPrefix,
		telemetrylogs.GetBodyJSONKey,
	)
	logStmtBuilder := telemetrylogs.NewLogQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		logFieldMapper,
		logConditionBuilder,
		logResourceFilterStmtBuilder,
		logAggExprRewriter,
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.BodyJSONStringSearchPrefix,
		telemetrylogs.GetBodyJSONKey,
	)

	// Create metric statement builder
	metricFieldMapper := telemetrymetrics.NewFieldMapper()
	metricConditionBuilder := telemetrymetrics.NewConditionBuilder(metricFieldMapper)
	metricStmtBuilder := telemetrymetrics.NewMetricQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		metricFieldMapper,
		metricConditionBuilder,
	)

	// Create meter statement builder
	meterStmtBuilder := telemetrymeter.NewMeterQueryStatementBuilder(
		settings,
		telemetryMetadataStore,
		metricFieldMapper,
		metricConditionBuilder,
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
		metricStmtBuilder,
		meterStmtBuilder,
		traceOperatorStmtBuilder,
		bucketCache,
	), nil
}
