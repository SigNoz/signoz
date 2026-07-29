package rules

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/statementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/logsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/metricsstatementbuilder"
	"github.com/SigNoz/signoz/pkg/statementbuilder/tracesstatementbuilder"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
)

func prepareQuerierForMetrics(t *testing.T, telemetryStore telemetrystore.TelemetryStore) (querier.Querier, *telemetrytypestest.MockMetadataStore) {
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	fl, err := flagger.New(
		context.Background(),
		instrumentationtest.New().ToProviderSettings(),
		flagger.Config{},
		flagger.MustNewRegistry(),
	)
	require.NoError(t, err)

	metricStmtBuilder, err := metricsstatementbuilder.NewFactory(metadataStore, fl).New(context.Background(), providerSettings, statementbuilder.Config{})
	require.NoError(t, err)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil, // prometheus
		&statementbuilder.Builders{Metric: metricStmtBuilder},
		nil, // bucketCache
		fl,
		0,
		0, // maxConcurrentQueries (0 means default)
	), metadataStore
}

func prepareQuerierForLogs(t *testing.T, telemetryStore telemetrystore.TelemetryStore, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) querier.Querier {
	t.Helper()
	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalLogs
		}
	}
	metadataStore.KeysMap = keysMap

	fl := flaggertest.New(t)
	logStmtBuilder, err := logsstatementbuilder.NewFactory(nil, metadataStore, fl).New(context.Background(), providerSettings, statementbuilder.Config{})
	require.NoError(t, err)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil, // prometheus
		&statementbuilder.Builders{Log: logStmtBuilder},
		nil, // bucketCache
		fl,
		5*time.Minute, // logTraceIDWindowPadding
		0,             // maxConcurrentQueries (0 means default)
	)
}

func prepareQuerierForTraces(t *testing.T, telemetryStore telemetrystore.TelemetryStore, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) querier.Querier {
	t.Helper()

	providerSettings := instrumentationtest.New().ToProviderSettings()
	metadataStore := telemetrytypestest.NewMockMetadataStore()

	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalTraces
		}
	}
	metadataStore.KeysMap = keysMap

	fl := flaggertest.New(t)
	traceStmtBuilder, err := tracesstatementbuilder.NewFactory(telemetryStore, metadataStore, fl).New(context.Background(), providerSettings, statementbuilder.Config{})
	require.NoError(t, err)

	return querier.New(
		providerSettings,
		telemetryStore,
		metadataStore,
		nil, // prometheus
		&statementbuilder.Builders{Trace: traceStmtBuilder},
		nil, // bucketCache
		fl,
		0,
		0, // maxConcurrentQueries (0 means default)
	)
}
