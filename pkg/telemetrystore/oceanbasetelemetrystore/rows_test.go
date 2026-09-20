package oceanbasetelemetrystore

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/require"
)

func TestRowsSQLTypesAndNulls(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()
	ts := time.Date(2026, 9, 10, 0, 0, 0, 123000000, time.UTC)
	mock.ExpectQuery("SELECT").WillReturnRows(sqlmock.NewRowsWithColumnDefinition(
		sqlmock.NewColumn("ts").OfType("DATETIME", ts).Nullable(true),
		sqlmock.NewColumn("__result_0").OfType("DECIMAL", "1.25").Nullable(true),
		sqlmock.NewColumn("label").OfType("VARCHAR", "x").Nullable(true),
		sqlmock.NewColumn("timestamp").OfType("UNSIGNED BIGINT", uint64(0)).Nullable(false),
		sqlmock.NewColumn("attributes").OfType("JSON", "{}").Nullable(false),
	).AddRow(ts, "1.25", "x", uint64(ts.UnixNano()), `{"a":1}`).AddRow(nil, nil, nil, uint64(1), `{"b":2}`))
	raw, err := db.QueryContext(context.Background(), "SELECT test")
	require.NoError(t, err)
	closed := 0
	rows, err := newRows(raw, time.Now(), func(err error) { require.NoError(t, err); closed++ })
	require.NoError(t, err)
	slots := make([]any, len(rows.columns))
	for i, typ := range rows.ColumnTypes() {
		slots[i] = reflect.New(typ.ScanType()).Interface()
	}
	require.True(t, rows.Next())
	require.NoError(t, rows.Scan(slots...))
	require.Equal(t, ts, **slots[0].(**time.Time))
	require.Equal(t, 1.25, **slots[1].(**float64))
	require.Equal(t, uint64(ts.UnixNano()), *slots[3].(*uint64))
	firstMap := *slots[4].(*telemetrystoretypes.JSONValue)
	require.Equal(t, float64(1), firstMap["a"])
	require.True(t, rows.Next())
	require.NoError(t, rows.Scan(slots...))
	require.Nil(t, *slots[0].(**time.Time))
	require.Nil(t, *slots[1].(**float64))
	require.Nil(t, *slots[2].(**string))
	require.Equal(t, float64(1), firstMap["a"])
	require.Equal(t, telemetrystoretypes.JSONValue{"b": float64(2)}, *slots[4].(*telemetrystoretypes.JSONValue))
	require.False(t, rows.Next())
	require.NoError(t, rows.Close())
	require.NoError(t, rows.Close())
	require.Equal(t, 1, closed)
	require.Zero(t, rows.QueryStats().RowsScanned)
	require.NoError(t, mock.ExpectationsWereMet())
}

type recordingHook struct {
	before, after int
	err           error
}

func (h *recordingHook) BeforeQuery(ctx context.Context, _ *telemetrystore.QueryEvent) context.Context {
	h.before++
	return ctx
}
func (h *recordingHook) AfterQuery(_ context.Context, event *telemetrystore.QueryEvent) {
	h.after++
	h.err = event.Err
}

func TestQueryLifecycleErrors(t *testing.T) {
	for _, mode := range []string{"query", "scan", "timeout"} {
		t.Run(mode, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()
			hook := &recordingHook{}
			p := &provider{db: db, config: telemetrystore.OceanBaseConfig{QueryTimeout: 10 * time.Millisecond}, hooks: []telemetrystore.TelemetryStoreHook{hook}}
			expect := mock.ExpectQuery("SELECT")
			switch mode {
			case "query":
				expect.WillReturnError(errors.New("query failure"))
			case "scan":
				expect.WillReturnRows(sqlmock.NewRows([]string{"v"}).AddRow("not a number"))
			case "timeout":
				expect.WillDelayFor(time.Second).WillReturnRows(sqlmock.NewRows([]string{"v"}).AddRow(1))
			}
			rows, err := p.QueryContext(context.Background(), "SELECT test")
			if mode == "scan" {
				require.NoError(t, err)
				require.True(t, rows.Next())
				var number int
				require.Error(t, rows.Scan(&number))
				require.NoError(t, rows.Close())
			} else {
				require.Error(t, err)
			}
			require.Equal(t, 1, hook.before)
			require.Equal(t, 1, hook.after)
			require.Error(t, hook.err)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
