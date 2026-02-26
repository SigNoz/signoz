package querier

import (
	"math"
	"reflect"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── minimal in-package mocks ──────────────────────────────────────────────────

type mockColType struct {
	name     string
	dbType   string
	scanType reflect.Type
}

func (c *mockColType) Name() string             { return c.name }
func (c *mockColType) Nullable() bool           { return false }
func (c *mockColType) ScanType() reflect.Type   { return c.scanType }
func (c *mockColType) DatabaseTypeName() string  { return c.dbType }

type mockRows struct {
	cols     []string
	colTypes []driver.ColumnType
	data     [][]any
	pos      int
	rowErr   error
}

func newMockRows(cols []string, colTypes []driver.ColumnType, data [][]any) *mockRows {
	return &mockRows{cols: cols, colTypes: colTypes, data: data, pos: -1}
}

func (m *mockRows) Columns() []string               { return m.cols }
func (m *mockRows) ColumnTypes() []driver.ColumnType { return m.colTypes }
func (m *mockRows) Err() error                       { return m.rowErr }
func (m *mockRows) Close() error                     { return nil }
func (m *mockRows) ScanStruct(any) error             { return nil }
func (m *mockRows) Totals(...any) error              { return nil }

func (m *mockRows) Next() bool {
	m.pos++
	return m.pos < len(m.data)
}

// Scan sets each dest pointer to the corresponding row value via reflection.
// row[i] must be the same concrete type as the element pointed to by dest[i].
// When row[i] is nil, the destination is zeroed rather than skipped — this
// matches real driver behaviour and prevents prior row values leaking into
// subsequent rows when callers reuse the same scan buffer.
func (m *mockRows) Scan(dest ...any) error {
	row := m.data[m.pos]
	for i, d := range dest {
		dv := reflect.ValueOf(d)
		if dv.Kind() != reflect.Ptr || dv.IsNil() {
			continue
		}
		if i >= len(row) || row[i] == nil {
			dv.Elem().Set(reflect.Zero(dv.Elem().Type()))
			continue
		}
		dv.Elem().Set(reflect.ValueOf(row[i]))
	}
	return nil
}

// ── helpers ────────────────────────────────────────────────────────────────────

func col(name, dbType string, scanType reflect.Type) driver.ColumnType {
	return &mockColType{name: name, dbType: dbType, scanType: scanType}
}

// tsMs returns a UTC time for the given Unix millisecond value.
func tsMs(ms int64) time.Time { return time.UnixMilli(ms).UTC() }

func emptyRows() *mockRows {
	return newMockRows(nil, nil, nil)
}

// ── numericAsFloat ─────────────────────────────────────────────────────────────

func TestNumericAsFloat(t *testing.T) {
	tests := []struct {
		name  string
		input any
		want  float64
	}{
		{"float64", float64(1.5), 1.5},
		{"float32", float32(2.5), 2.5},
		{"int64", int64(10), 10},
		{"int32", int32(20), 20},
		{"uint64", uint64(30), 30},
		{"uint32", uint32(40), 40},
		{"int", int(50), 50},
		{"uint", uint(60), 60},
		{"int16", int16(70), 70},
		{"int8", int8(80), 80},
		{"uint16", uint16(90), 90},
		{"uint8", uint8(100), 100},
		{"unknown type returns NaN", "not a number", math.NaN()},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := numericAsFloat(tt.input)
			if math.IsNaN(tt.want) {
				assert.True(t, math.IsNaN(got))
			} else {
				assert.InDelta(t, tt.want, got, 1e-9)
			}
		})
	}
}

// ── numericKind ────────────────────────────────────────────────────────────────

func TestNumericKind(t *testing.T) {
	numeric := []reflect.Kind{
		reflect.Float32, reflect.Float64,
		reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
	}
	for _, k := range numeric {
		assert.True(t, numericKind(k), "expected true for kind %s", k)
	}

	nonNumeric := []reflect.Kind{reflect.String, reflect.Bool, reflect.Slice, reflect.Struct, reflect.Ptr}
	for _, k := range nonNumeric {
		assert.False(t, numericKind(k), "expected false for kind %s", k)
	}
}

// ── derefValue ─────────────────────────────────────────────────────────────────

func TestDerefValue(t *testing.T) {
	t.Run("nil input returns nil", func(t *testing.T) {
		assert.Nil(t, derefValue(nil))
	})

	t.Run("single pointer is unwrapped", func(t *testing.T) {
		v := int64(42)
		assert.Equal(t, int64(42), derefValue(&v))
	})

	t.Run("double pointer is fully unwrapped", func(t *testing.T) {
		s := "hello"
		p := &s
		assert.Equal(t, "hello", derefValue(&p))
	})

	t.Run("pointer to nil pointer returns nil", func(t *testing.T) {
		var p *string
		// &p is non-nil, but p itself is nil — derefValue should return nil.
		assert.Nil(t, derefValue(&p))
	})
}

// ── consume dispatcher ─────────────────────────────────────────────────────────

func TestConsume_Dispatch(t *testing.T) {
	step := qbtypes.Step{}

	t.Run("time_series yields *TimeSeriesData", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeTimeSeries, nil, step, "A")
		require.NoError(t, err)
		_, ok := result.(*qbtypes.TimeSeriesData)
		assert.True(t, ok)
	})

	t.Run("scalar yields *ScalarData", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeScalar, nil, step, "A")
		require.NoError(t, err)
		_, ok := result.(*qbtypes.ScalarData)
		assert.True(t, ok)
	})

	t.Run("raw yields *RawData", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeRaw, nil, step, "A")
		require.NoError(t, err)
		_, ok := result.(*qbtypes.RawData)
		assert.True(t, ok)
	})

	t.Run("trace yields *RawData", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeTrace, nil, step, "A")
		require.NoError(t, err)
		_, ok := result.(*qbtypes.RawData)
		assert.True(t, ok)
	})

	t.Run("raw_stream yields *RawData", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeRawStream, nil, step, "A")
		require.NoError(t, err)
		_, ok := result.(*qbtypes.RawData)
		assert.True(t, ok)
	})

	t.Run("unknown type yields nil payload without error", func(t *testing.T) {
		result, err := consume(emptyRows(), qbtypes.RequestTypeUnknown, nil, step, "A")
		require.NoError(t, err)
		assert.Nil(t, result)
	})
}

// ── readAsTimeSeries ───────────────────────────────────────────────────────────

// tsOnlyRow builds a mock rows object with a single timestamp column
// and a single __result_0 Float64 column for straightforward tests.
func tsSeriesRows(data [][]any) *mockRows {
	return newMockRows(
		[]string{"timestamp", "__result_0"},
		[]driver.ColumnType{
			col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
		},
		data,
	)
}

func TestReadAsTimeSeries_Empty(t *testing.T) {
	got, err := readAsTimeSeries(tsSeriesRows(nil), nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	assert.Equal(t, "Q", got.QueryName)
	assert.Empty(t, got.Aggregations)
}

func TestReadAsTimeSeries_SinglePoint(t *testing.T) {
	rows := tsSeriesRows([][]any{
		{tsMs(1_000_000), float64(42)},
	})
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	require.Len(t, got.Aggregations, 1)
	require.Len(t, got.Aggregations[0].Series, 1)
	require.Len(t, got.Aggregations[0].Series[0].Values, 1)
	v := got.Aggregations[0].Series[0].Values[0]
	assert.Equal(t, int64(1_000_000), v.Timestamp)
	assert.Equal(t, float64(42), v.Value)
}

func TestReadAsTimeSeries_NaNSkipped(t *testing.T) {
	rows := tsSeriesRows([][]any{{tsMs(1_000_000), math.NaN()}})
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	assert.Empty(t, got.Aggregations)
}

func TestReadAsTimeSeries_InfSkipped(t *testing.T) {
	rows := tsSeriesRows([][]any{{tsMs(1_000_000), math.Inf(1)}})
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	assert.Empty(t, got.Aggregations)
}

func TestReadAsTimeSeries_SameLabelGroupedIntoOneSeries(t *testing.T) {
	rows := newMockRows(
		[]string{"timestamp", "service", "__result_0"},
		[]driver.ColumnType{
			col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
			col("service", "String", reflect.TypeOf("")),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
		},
		[][]any{
			{tsMs(1_000_000), "frontend", float64(1)},
			{tsMs(2_000_000), "frontend", float64(2)},
		},
	)
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	require.Len(t, got.Aggregations, 1)
	require.Len(t, got.Aggregations[0].Series, 1, "same label should produce one series")
	assert.Len(t, got.Aggregations[0].Series[0].Values, 2)
}

func TestReadAsTimeSeries_DifferentLabelsFormSeparateSeries(t *testing.T) {
	rows := newMockRows(
		[]string{"timestamp", "service", "__result_0"},
		[]driver.ColumnType{
			col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
			col("service", "String", reflect.TypeOf("")),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
		},
		[][]any{
			{tsMs(1_000_000), "frontend", float64(1)},
			{tsMs(1_000_000), "backend", float64(2)},
		},
	)
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	require.Len(t, got.Aggregations, 1)
	assert.Len(t, got.Aggregations[0].Series, 2, "different labels should produce separate series")
}

func TestReadAsTimeSeries_MultipleAggResultColumns(t *testing.T) {
	// __result_0 and __result_1 should map to two separate AggregationBuckets.
	rows := newMockRows(
		[]string{"timestamp", "__result_0", "__result_1"},
		[]driver.ColumnType{
			col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
			col("__result_1", "Float64", reflect.TypeOf(float64(0))),
		},
		[][]any{
			{tsMs(1_000_000), float64(10), float64(20)},
		},
	)
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	assert.Len(t, got.Aggregations, 2, "each __result_N should produce a separate aggregation bucket")
}

func TestReadAsTimeSeries_SingleNumericColumnFallback(t *testing.T) {
	// When there are no __result_N columns and only one numeric column, it should be
	// treated as the fallback aggregation value (aggValues[0]).
	rows := newMockRows(
		[]string{"timestamp", "value"},
		[]driver.ColumnType{
			col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
			col("value", "Float64", reflect.TypeOf(float64(0))),
		},
		[][]any{
			{tsMs(1_000_000), float64(99)},
		},
	)
	got, err := readAsTimeSeries(rows, nil, qbtypes.Step{}, "Q")
	require.NoError(t, err)
	require.Len(t, got.Aggregations, 1)
	require.Len(t, got.Aggregations[0].Series, 1)
	assert.Equal(t, float64(99), got.Aggregations[0].Series[0].Values[0].Value)
}

// ── isPartialValue (exercised via readAsTimeSeries) ───────────────────────────

func TestReadAsTimeSeries_PartialValues(t *testing.T) {
	step := qbtypes.Step{Duration: 60_000 * time.Millisecond} // 60 s step

	cols := []string{"timestamp", "__result_0"}
	colTypes := []driver.ColumnType{
		col("timestamp", "DateTime64(3)", reflect.TypeOf(time.Time{})),
		col("__result_0", "Float64", reflect.TypeOf(float64(0))),
	}

	row := func(ms int64) []any { return []any{tsMs(ms), float64(1.0)} }

	partial := func(t *testing.T, got *qbtypes.TimeSeriesData) bool {
		t.Helper()
		require.Len(t, got.Aggregations, 1)
		require.Len(t, got.Aggregations[0].Series, 1)
		require.Len(t, got.Aggregations[0].Series[0].Values, 1)
		return got.Aggregations[0].Series[0].Values[0].Partial
	}

	t.Run("zero step never marks partial", func(t *testing.T) {
		r := newMockRows(cols, colTypes, [][]any{row(90_000)})
		got, _ := readAsTimeSeries(r, &qbtypes.TimeRange{From: 90_000, To: 240_000}, qbtypes.Step{}, "Q")
		assert.False(t, partial(t, got))
	})

	t.Run("nil queryWindow never marks partial", func(t *testing.T) {
		r := newMockRows(cols, colTypes, [][]any{row(90_000)})
		got, _ := readAsTimeSeries(r, nil, step, "Q")
		assert.False(t, partial(t, got))
	})

	t.Run("misaligned From marks first point partial", func(t *testing.T) {
		// From=90_000, step=60_000 → firstComplete=120_000; ts=90_000 < 120_000 → partial
		r := newMockRows(cols, colTypes, [][]any{row(90_000)})
		got, _ := readAsTimeSeries(r, &qbtypes.TimeRange{From: 90_000, To: 300_000}, step, "Q")
		assert.True(t, partial(t, got))
	})

	t.Run("aligned From does not mark first point partial", func(t *testing.T) {
		// From=120_000, step=60_000 → From%step==0 → firstComplete=120_000; ts=120_000 not partial
		r := newMockRows(cols, colTypes, [][]any{row(120_000)})
		got, _ := readAsTimeSeries(r, &qbtypes.TimeRange{From: 120_000, To: 300_000}, step, "Q")
		assert.False(t, partial(t, got))
	})

	t.Run("last point partial when To is misaligned", func(t *testing.T) {
		// ts=240_000, ts+step=300_000 > To=250_000, and 250_000%60_000≠0 → partial
		r := newMockRows(cols, colTypes, [][]any{row(240_000)})
		got, _ := readAsTimeSeries(r, &qbtypes.TimeRange{From: 120_000, To: 250_000}, step, "Q")
		assert.True(t, partial(t, got))
	})

	t.Run("last point not partial when To is aligned", func(t *testing.T) {
		// ts=240_000, ts+step=300_000, To=300_000 → 300_000 not > 300_000 → not partial
		r := newMockRows(cols, colTypes, [][]any{row(240_000)})
		got, _ := readAsTimeSeries(r, &qbtypes.TimeRange{From: 120_000, To: 300_000}, step, "Q")
		assert.False(t, partial(t, got))
	})
}

// ── readAsScalar ───────────────────────────────────────────────────────────────

func TestReadAsScalar_Empty(t *testing.T) {
	rows := newMockRows(
		[]string{"__result_0"},
		[]driver.ColumnType{col("__result_0", "Float64", reflect.TypeOf(float64(0)))},
		nil,
	)
	got, err := readAsScalar(rows, "Q")
	require.NoError(t, err)
	assert.Equal(t, "Q", got.QueryName)
	assert.Empty(t, got.Data)
	require.Len(t, got.Columns, 1)
	assert.Equal(t, qbtypes.ColumnTypeAggregation, got.Columns[0].Type)
}

func TestReadAsScalar_ColumnTypes(t *testing.T) {
	rows := newMockRows(
		[]string{"service_name", "__result_0"},
		[]driver.ColumnType{
			col("service_name", "String", reflect.TypeOf("")),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
		},
		nil,
	)
	got, err := readAsScalar(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Columns, 2)
	assert.Equal(t, qbtypes.ColumnTypeGroup, got.Columns[0].Type, "non-result column should be Group")
	assert.Equal(t, qbtypes.ColumnTypeAggregation, got.Columns[1].Type, "__result_N should be Aggregation")
}

func TestReadAsScalar_RowData(t *testing.T) {
	rows := newMockRows(
		[]string{"service_name", "__result_0"},
		[]driver.ColumnType{
			col("service_name", "String", reflect.TypeOf("")),
			col("__result_0", "Float64", reflect.TypeOf(float64(0))),
		},
		[][]any{
			{"frontend", float64(100)},
			{"backend", float64(200)},
		},
	)
	got, err := readAsScalar(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Data, 2)
	assert.Equal(t, "frontend", got.Data[0][0])
	assert.Equal(t, float64(100), got.Data[0][1])
	assert.Equal(t, "backend", got.Data[1][0])
	assert.Equal(t, float64(200), got.Data[1][1])
}

// ── readAsRaw ──────────────────────────────────────────────────────────────────

func TestReadAsRaw_Empty(t *testing.T) {
	rows := newMockRows(
		[]string{"body"},
		[]driver.ColumnType{col("body", "String", reflect.TypeOf(""))},
		nil,
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	assert.Equal(t, "Q", got.QueryName)
	assert.Empty(t, got.Rows)
}

func TestReadAsRaw_TimestampColumn_SetsTimestamp(t *testing.T) {
	expected := tsMs(1_700_000_000_000)
	rows := newMockRows(
		[]string{"timestamp"},
		[]driver.ColumnType{col("timestamp", "DateTime64(9)", reflect.TypeOf(time.Time{}))},
		[][]any{{expected}},
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Rows, 1)
	assert.Equal(t, expected.UnixNano(), got.Rows[0].Timestamp.UnixNano())
}

func TestReadAsRaw_TimestampDatetimeColumn_SetsTimestamp(t *testing.T) {
	expected := tsMs(1_700_000_000_000)
	rows := newMockRows(
		[]string{"timestamp_datetime"},
		[]driver.ColumnType{col("timestamp_datetime", "DateTime", reflect.TypeOf(time.Time{}))},
		[][]any{{expected}},
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Rows, 1)
	assert.Equal(t, expected.UnixNano(), got.Rows[0].Timestamp.UnixNano())
}

func TestReadAsRaw_StringColumn_InDataMap(t *testing.T) {
	rows := newMockRows(
		[]string{"body"},
		[]driver.ColumnType{col("body", "String", reflect.TypeOf(""))},
		[][]any{{"hello world"}},
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Rows, 1)
	assert.Equal(t, "hello world", got.Rows[0].Data["body"])
}

func TestReadAsRaw_JSONColumn_Unmarshalled(t *testing.T) {
	// JSON columns are scanned into *[]byte then unmarshalled into structured values.
	rows := newMockRows(
		[]string{"attributes"},
		[]driver.ColumnType{col("attributes", "JSON", reflect.TypeOf([]byte{}))},
		[][]any{{[]byte(`{"key":"value","count":3}`)}},
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Rows, 1)
	m, ok := got.Rows[0].Data["attributes"].(map[string]any)
	require.True(t, ok, "JSON column should be unmarshalled to map[string]any")
	assert.Equal(t, "value", m["key"])
	assert.Equal(t, float64(3), m["count"])
}

func TestReadAsRaw_EmptyJSONColumn_NotUnmarshalled(t *testing.T) {
	// An empty JSON byte slice should not cause an error and should leave the value as-is.
	rows := newMockRows(
		[]string{"attributes"},
		[]driver.ColumnType{col("attributes", "JSON", reflect.TypeOf([]byte{}))},
		[][]any{{[]byte{}}},
	)
	got, err := readAsRaw(rows, "Q")
	require.NoError(t, err)
	require.Len(t, got.Rows, 1)
	// Empty JSON bytes — not unmarshalled, raw []byte stays in Data.
	assert.Equal(t, []byte{}, got.Rows[0].Data["attributes"])
}

func TestReadAsRaw_QueryName(t *testing.T) {
	got, err := readAsRaw(emptyRows(), "myQuery")
	require.NoError(t, err)
	assert.Equal(t, "myQuery", got.QueryName)
}
