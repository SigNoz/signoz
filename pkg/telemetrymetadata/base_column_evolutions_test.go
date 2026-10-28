package telemetrymetadata

import (
	"context"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetBaseColumnEvolutions(t *testing.T) {
	mockTelemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &regexMatcher{})
	mock := mockTelemetryStore.Mock()
	metadata := NewTelemetryMetaStore(instrumentationtest.New().ToProviderSettings(), mockTelemetryStore, flaggertest.New(t))

	releaseTime := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	expectFetch := func() {
		mock.ExpectQuery(`SELECT signal, column_name, column_type, field_context, field_name, version, release_time FROM signoz_metadata\.distributed_column_evolution_metadata`).
			WithArgs(telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute, "__all__", "__all__").
			WillReturnRows(cmock.NewRows([]cmock.ColumnType{
				{Name: "signal", Type: "String"},
				{Name: "column_name", Type: "String"},
				{Name: "column_type", Type: "String"},
				{Name: "field_context", Type: "String"},
				{Name: "field_name", Type: "String"},
				{Name: "version", Type: "UInt32"},
				{Name: "release_time", Type: "Float64"},
			}, [][]any{
				{"traces", "attributes", "JSON()", "attribute", "__all__", uint32(0), float64(releaseTime.UnixNano())},
			}))
	}

	t.Run("SecondCall_ReadsCache", func(t *testing.T) {
		expectFetch()
		for range 2 {
			entries, err := metadata.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
			require.NoError(t, err)
			require.Len(t, entries, 1)
			assert.Equal(t, "attributes", entries[0].ColumnName)
			assert.Equal(t, releaseTime, entries[0].ReleaseTime.UTC())
		}
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ExpiredCache_Refetches", func(t *testing.T) {
		store := metadata.(*telemetryMetaStore)
		for name, cached := range store.baseColumnEvolutions {
			cached.fetchedAt = time.Now().Add(-2 * baseColumnEvolutionsTTL)
			store.baseColumnEvolutions[name] = cached
		}
		expectFetch()
		_, err := metadata.GetBaseColumnEvolutions(context.Background(), telemetrytypes.SignalTraces, telemetrytypes.FieldContextAttribute)
		require.NoError(t, err)
		require.NoError(t, mock.ExpectationsWereMet())
	})
}
