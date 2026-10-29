package telemetrymetadata

import (
	"context"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
	store := NewSchemaMetadataStore(mockTelemetryStore)

	releaseTime := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	expectBaseColumnEvolutionsQuery(mock, [][]any{
		{"traces", "attributes", "JSON()", "attribute", "__all__", uint32(0), float64(releaseTime.UnixNano())},
	})

	for range 2 {
		entries, err := store.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
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
	store := NewSchemaMetadataStore(mockTelemetryStore)
	get := func() []*telemetrytypes.EvolutionEntry {
		entries, err := store.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
		require.NoError(t, err)
		return entries
	}

	expectBaseColumnEvolutionsQuery(mock, nil)
	assert.Empty(t, get())

	expectBaseColumnEvolutionsQuery(mock, [][]any{
		{"traces", "attributes", "JSON()", "attribute", "__all__", uint32(0), float64(time.Now().UnixNano())},
	})
	assert.Len(t, get(), 1)
	assert.Len(t, get(), 1, "a found result is cached")
	require.NoError(t, mock.ExpectationsWereMet())
}
