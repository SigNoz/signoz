package rules

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	alertmanagermock "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/querier/signozquerier"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type queryMatcherAny struct {
}

func (m *queryMatcherAny) Match(x string, y string) error {
	return nil
}

// TestManagerOptions provides options for customizing the test manager creation.
type TestManagerOptions struct {
	// AlertmanagerHook is a function that will be called with the Alertmanager mock
	// after it's created but before it's used. This allows customizing the mock behavior.
	AlertmanagerHook func(alertmanager.Alertmanager)

	// SqlStoreHook is a function that will be called with the SQLStore mock
	// after it's created but before it's used. This allows customizing the mock behavior.
	SqlStoreHook func(sqlstore.SQLStore)

	// TelemetryStoreHook is a function that will be called with the TelemetryStore mock
	// after it's created but before it's used. This allows customizing the mock behavior.
	TelemetryStoreHook func(telemetrystore.TelemetryStore)

	// ManagerOptionsHook is a function that will be called with the ManagerOptions
	// before the manager is created. This allows customizing the manager options (e.g., setting Prometheus).
	ManagerOptionsHook func(*ManagerOptions)
}

// NewTestManager creates a Manager instance for testing purposes.
// It sets up all the necessary mocks and dependencies required for testing.
// Options can be provided to customize the manager behavior. If nil, default options are used.
func NewTestManager(t *testing.T, testOpts *TestManagerOptions) *Manager {
	// mocking the alertmanager + capturing the triggered test alerts
	fAlert := alertmanagermock.NewMockAlertmanager(t)

	// Call the Alertmanager hook if provided
	if testOpts != nil && testOpts.AlertmanagerHook != nil {
		testOpts.AlertmanagerHook(fAlert)
	}

	cacheObj, err := cachetest.New(cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 1000,
			MaxCost:     1 << 20,
		},
	})
	require.NoError(t, err)

	// Create SQLStore mock
	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)

	// Call the SqlStore hook if provided
	if testOpts != nil && testOpts.SqlStoreHook != nil {
		testOpts.SqlStoreHook(sqlStore)
	}

	// Create TelemetryStore mock
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	// Call the TelemetryStore hook if provided
	if testOpts != nil && testOpts.TelemetryStoreHook != nil {
		testOpts.TelemetryStoreHook(telemetryStore)
	}

	// Create reader with mocked telemetry store
	readerCache, err := cachetest.New(cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 1000,
			MaxCost:     1 << 26,
		},
	})
	require.NoError(t, err)

	options := clickhouseReader.NewOptions("", "", "archiveNamespace")
	providerSettings := instrumentationtest.New().ToProviderSettings()
	prometheus := prometheustest.New(context.Background(), providerSettings, prometheus.Config{}, telemetryStore)
	reader := clickhouseReader.NewReader(
		nil,
		telemetryStore,
		prometheus,
		"",
		time.Duration(time.Second),
		nil,
		readerCache,
		options,
	)

	flagger, err := flagger.New(context.Background(), instrumentationtest.New().ToProviderSettings(), flagger.Config{}, flagger.MustNewRegistry())
	if err != nil {
		t.Fatalf("failed to create flagger: %v", err)
	}

	// Create mock querierV5 with test values
	providerFactory := signozquerier.NewFactory(telemetryStore, prometheus, readerCache, flagger)
	mockQuerier, err := providerFactory.New(context.Background(), providerSettings, querier.Config{})
	require.NoError(t, err)

	mgrOpts := &ManagerOptions{
		Logger:         zap.NewNop(),
		SLogger:        instrumentationtest.New().Logger(),
		Cache:          cacheObj,
		Alertmanager:   fAlert,
		Querier:        mockQuerier,
		TelemetryStore: telemetryStore,
		Reader:         reader,
		SqlStore:       sqlStore, // SQLStore needed for SendAlerts to query organizations
	}

	// Call the ManagerOptions hook if provided to allow customization
	if testOpts != nil && testOpts.ManagerOptionsHook != nil {
		testOpts.ManagerOptionsHook(mgrOpts)
	}

	mgr, err := NewManager(mgrOpts)
	require.NoError(t, err)

	return mgr
}
