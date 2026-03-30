package rules

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/telemetrymetrics"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func prepareQuerierForMetrics(t *testing.T, telemetryStore telemetrystore.TelemetryStore) querier.Querier {
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	flagger, err := flagger.New(
		context.Background(),
		instrumentationtest.New().ToProviderSettings(),
		flagger.Config{},
		flagger.MustNewRegistry(),
	)
	require.NoError(t, err)

	metricFieldMapper := telemetrymetrics.NewFieldMapper()
	metricConditionBuilder := telemetrymetrics.NewConditionBuilder(metricFieldMapper)
	metricStmtBuilder := telemetrymetrics.NewMetricQueryStatementBuilder(
		providerSettings,
		metadataStore,
		metricFieldMapper,
		metricConditionBuilder,
		flagger,
	)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil, // prometheus
		nil, // traceStmtBuilder
		nil, // logStmtBuilder
		metricStmtBuilder,
		nil, // meterStmtBuilder
		nil, // traceOperatorStmtBuilder
		nil, // bucketCache
	)
}

func prepareQuerierForLogs(telemetryStore telemetrystore.TelemetryStore, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) querier.Querier {

	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalLogs
		}
	}
	metadataStore.KeysMap = keysMap

	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)

	logFieldMapper := telemetrylogs.NewFieldMapper()
	logConditionBuilder := telemetrylogs.NewConditionBuilder(logFieldMapper)
	logResourceFilterStmtBuilder := resourcefilter.NewLogResourceFilterStatementBuilder(
		providerSettings,
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		metadataStore,
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.GetBodyJSONKey,
	)
	logAggExprRewriter := querybuilder.NewAggExprRewriter(
		providerSettings,
		telemetrylogs.DefaultFullTextColumn,
		logFieldMapper,
		logConditionBuilder,
		telemetrylogs.GetBodyJSONKey,
	)
	logStmtBuilder := telemetrylogs.NewLogQueryStatementBuilder(
		providerSettings,
		metadataStore,
		logFieldMapper,
		logConditionBuilder,
		logResourceFilterStmtBuilder,
		logAggExprRewriter,
		telemetrylogs.DefaultFullTextColumn,
		telemetrylogs.GetBodyJSONKey,
	)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil,            // prometheus
		nil,            // traceStmtBuilder
		logStmtBuilder, // logStmtBuilder
		nil,            // metricStmtBuilder
		nil,            // meterStmtBuilder
		nil,            // traceOperatorStmtBuilder
		nil,            // bucketCache
	)
}

func prepareQuerierForTraces(telemetryStore telemetrystore.TelemetryStore, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) querier.Querier {

	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalTraces
		}
	}
	metadataStore.KeysMap = keysMap

	// Create trace statement builder
	traceFieldMapper := telemetrytraces.NewFieldMapper()
	traceConditionBuilder := telemetrytraces.NewConditionBuilder(traceFieldMapper)

	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)
	resourceFilterStmtBuilder := resourcefilter.NewTraceResourceFilterStatementBuilder(
		providerSettings,
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		metadataStore,
	)

	traceAggExprRewriter := querybuilder.NewAggExprRewriter(providerSettings, nil, traceFieldMapper, traceConditionBuilder, nil)
	traceStmtBuilder := telemetrytraces.NewTraceQueryStatementBuilder(
		providerSettings,
		metadataStore,
		traceFieldMapper,
		traceConditionBuilder,
		resourceFilterStmtBuilder,
		traceAggExprRewriter,
		telemetryStore,
	)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil,              // prometheus
		traceStmtBuilder, // traceStmtBuilder
		nil,              // logStmtBuilder
		nil,              // metricStmtBuilder
		nil,              // meterStmtBuilder
		nil,              // traceOperatorStmtBuilder
		nil,              // bucketCache
	)
}
