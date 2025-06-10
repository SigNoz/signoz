package signozquerier

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetadata"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// NewFactory creates a new factory for the signoz querier provider
func NewFactory(
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cache cache.Cache,
) factory.ProviderFactory[qbtypes.Querier, querier.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("signoz"),
		func(
			ctx context.Context,
			settings factory.ProviderSettings,
			cfg querier.Config,
		) (qbtypes.Querier, error) {
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
) (qbtypes.Querier, error) {
	logger := settings.Logger

	// Create telemetry metadata store
	telemetryMetadataStore := telemetrymetadata.NewTelemetryMetaStore(
		logger,
		telemetryStore,
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

	// Create trace statement builder
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
		logger,
		telemetryMetadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		resourceFilterStmtBuilder,
		traceAggExprRewriter,
	)

	// Create log statement builder
	logFieldMapper := telemetrylogs.NewFieldMapper()
	logConditionBuilder := telemetrylogs.NewConditionBuilder(logFieldMapper)
	logResourceFilterStmtBuilder := resourcefilter.NewLogResourceFilterStatementBuilder(
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		telemetryMetadataStore,
	)
	logAggExprRewriter := querybuilder.NewAggExprRewriter(
		telemetrylogs.DefaultFullTextColumn,
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
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.BodyJSONStringSearchPrefix,
		telemetrylogs.GetBodyJSONKey,
	)

	// Create metric statement builder
	metricFieldMapper := telemetrymetrics.NewFieldMapper()
	metricConditionBuilder := telemetrymetrics.NewConditionBuilder(metricFieldMapper)
	metricStmtBuilder := telemetrymetrics.NewMetricQueryStatementBuilder(
		logger,
		telemetryMetadataStore,
		metricFieldMapper,
		metricConditionBuilder,
	)

	// Create bucket cache
	bucketCache := querier.NewBucketCache(
		logger.With(slog.String("component", "bucket-cache")),
		cache,
		cfg.CacheTTL,
		cfg.FluxInterval,
	)

	// Create and return the querier
	return querier.New(
		logger,
		telemetryStore,
		telemetryMetadataStore,
		prometheus,
		traceStmtBuilder,
		logStmtBuilder,
		metricStmtBuilder,
		bucketCache,
	), nil
}
