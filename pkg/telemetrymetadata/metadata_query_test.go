package telemetrymetadata

import (
	"context"
	"regexp"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type regexMatcher struct {
}

func (m *regexMatcher) Match(expectedSQL, actualSQL string) error {
	re, err := regexp.Compile(expectedSQL)
	if err != nil {
		return err
	}
	if !re.MatchString(actualSQL) {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "expected query to contain %s, got %s", expectedSQL, actualSQL)
	}
	return nil
}

func TestGetFirstSeenFromMetricMetadata(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()

	metadata := NewTelemetryMetaStore(
		instrumentationtest.New().ToProviderSettings(),
		mockTelemetryStore,
		flaggertest.New(t),
	)

	lookupKeys := []telemetrytypes.MetricMetadataLookupKey{
		{
			MetricName:     "metric1",
			AttributeName:  "attr1",
			AttributeValue: "val1",
		},
		{
			MetricName:     "metric2",
			AttributeName:  "attr2",
			AttributeValue: "val2",
		},
	}

	// ClickHouse tuple syntax is (x, y, z)
	// the structure should lead to:
	// SELECT ... WHERE (metric_name, attr_name, attr_string_value) IN ((?, ?, ?), (?, ?, ?)) ...

	expectedQuery := `SELECT metric_name, attr_name, attr_string_value, min\(first_reported_unix_milli\) AS first_seen FROM signoz_metrics.distributed_metadata WHERE \(metric_name, attr_name, attr_string_value\) IN \(\(\?, \?, \?\), \(\?, \?, \?\)\) GROUP BY metric_name, attr_name, attr_string_value ORDER BY first_seen`

	// Note: regexMatcher uses regexp.MatchString, so we escape parens and ?

	mock.ExpectQuery(expectedQuery).
		WithArgs("metric1", "attr1", "val1", "metric2", "attr2", "val2").
		WillReturnRows(cmock.NewRows([]cmock.ColumnType{
			{Name: "metric_name", Type: "String"},
			{Name: "attr_name", Type: "String"},
			{Name: "attr_string_value", Type: "String"},
			{Name: "first_seen", Type: "UInt64"},
		}, [][]any{
			{"metric1", "attr1", "val1", uint64(1000)},
			{"metric2", "attr2", "val2", uint64(2000)},
		}))

	result, err := metadata.GetFirstSeenFromMetricMetadata(context.Background(), lookupKeys)
	require.NoError(t, err)

	assert.Equal(t, int64(1000), result[lookupKeys[0]])
	assert.Equal(t, int64(2000), result[lookupKeys[1]])

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}

var evolutionColumns = []cmock.ColumnType{
	{Name: "signal", Type: "String"},
	{Name: "column_name", Type: "String"},
	{Name: "column_type", Type: "String"},
	{Name: "field_context", Type: "String"},
	{Name: "field_name", Type: "String"},
	{Name: "version", Type: "UInt32"},
	{Name: "release_time", Type: "Float64"},
}

func expectBaseColumnEvolutionsQuery(mock cmock.ClickConnMockCommon, rows [][]any) {
	mock.ExpectQuery(`SELECT signal, column_name, column_type, field_context, field_name, version, release_time FROM signoz_metadata\.distributed_column_evolution_metadata`).
		WithArgs(telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute, "__all__", "__all__").
		WillReturnRows(cmock.NewRows(evolutionColumns, rows))
}

func TestGetBaseColumnEvolutionsReadsCache(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()
	metadata := NewTelemetryMetaStore(instrumentationtest.New().ToProviderSettings(), mockTelemetryStore, flaggertest.New(t))

	releaseTime := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	expectBaseColumnEvolutionsQuery(mock, [][]any{
		{"traces", "attributes", "JSON()", "attribute", "__all__", uint32(0), float64(releaseTime.UnixNano())},
	})

	for range 2 {
		entries, err := metadata.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
		require.NoError(t, err)
		require.Len(t, entries, 1)
		assert.Equal(t, "attributes", entries[0].ColumnName)
		assert.Equal(t, releaseTime, entries[0].ReleaseTime.UTC())
	}
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetBaseColumnEvolutionsRefetchesEmptyResult(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()
	store := NewTelemetryMetaStore(instrumentationtest.New().ToProviderSettings(), mockTelemetryStore, flaggertest.New(t))
	metadata := store.(*telemetryMetaStore)
	get := func() []*telemetrytypes.EvolutionEntry {
		entries, err := metadata.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
		require.NoError(t, err)
		return entries
	}

	expectBaseColumnEvolutionsQuery(mock, nil)
	assert.Empty(t, get())
	assert.Empty(t, get(), "an empty result is cached within the TTL")

	for name, cached := range metadata.baseColumnEvolutions {
		cached.fetchedAt = cached.fetchedAt.Add(-emptyBaseColumnEvolutionsTTL)
		metadata.baseColumnEvolutions[name] = cached
	}
	expectBaseColumnEvolutionsQuery(mock, [][]any{
		{"traces", "attributes", "JSON()", "attribute", "__all__", uint32(0), float64(time.Now().UnixNano())},
	})
	assert.Len(t, get(), 1)
	require.NoError(t, mock.ExpectationsWereMet())
}
