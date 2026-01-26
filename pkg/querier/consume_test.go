package querier

import (
	"reflect"
	"testing"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Mock implementations for driver.Rows and driver.ColumnType
type mockColumnType struct {
	name     string
	scanType reflect.Type
}

func (m mockColumnType) Name() string             { return m.name }
func (m mockColumnType) DatabaseTypeName() string { return "Mock" }
func (m mockColumnType) ScanType() reflect.Type   { return m.scanType }
func (m mockColumnType) Nullable() bool           { return false }
func (m mockColumnType) Precision() (int64, bool) { return 0, false }
func (m mockColumnType) Scale() (int64, bool)     { return 0, false }

type mockRows struct {
	colTypes []driver.ColumnType
	values   [][]any
	cursor   int
}

func (m *mockRows) Next() bool {
	m.cursor++
	return m.cursor <= len(m.values)
}

func (m *mockRows) Scan(dest ...any) error {
	row := m.values[m.cursor-1]
	for i, d := range dest {
		v := reflect.ValueOf(d).Elem()
		val := reflect.ValueOf(row[i])
		if val.IsValid() {
			if val.Type().AssignableTo(v.Type()) {
				v.Set(val)
			} else {
				v.Set(val)
			}
		}
	}
	return nil
}

func (m *mockRows) Columns() []string {
	names := make([]string, len(m.colTypes))
	for i, c := range m.colTypes {
		names[i] = c.Name()
	}
	return names
}

func (m *mockRows) ColumnTypes() []driver.ColumnType {
	return m.colTypes
}
func (m *mockRows) Close() error              { return nil }
func (m *mockRows) Err() error                { return nil }
func (m *mockRows) Totals(dest ...any) error  { return nil }
func (m *mockRows) ScanStruct(dest any) error { return nil }

func floatPtr(v float64) *float64 { return &v }

func TestReadAsBucketFromArray(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]*float64{})},
	}

	rowsData := [][]any{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			[][]*float64{
				{floatPtr(0), floatPtr(10), floatPtr(5)},
				{floatPtr(10), floatPtr(20), floatPtr(3)},
			},
		},
		{
			time.Date(2024, 1, 1, 10, 1, 0, 0, time.UTC),
			[][]*float64{
				{floatPtr(0), floatPtr(10), floatPtr(2)},
				{floatPtr(10), floatPtr(20), floatPtr(6)},
				{floatPtr(20), floatPtr(30), floatPtr(4)},
			},
		},
	}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	// Test heatmap consumption
	result, err := consume(rows, qbtypes.RequestTypeHeatmap, nil, qbtypes.Step{}, "test_bucket_query")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok, "expected *qbtypes.TimeSeriesData for heatmap")

	assert.Equal(t, "test_bucket_query", timeSeriesData.QueryName)
	assert.Len(t, timeSeriesData.Aggregations, 1)

	agg := timeSeriesData.Aggregations[0]
	assert.Equal(t, "__result_0", agg.Alias)
	assert.Len(t, agg.Series, 1)

	series := agg.Series[0]
	assert.Len(t, series.Values, 2) // 2 timestamps

	// Validate first timestamp
	expectedTs1 := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC).UnixMilli()
	assert.Equal(t, expectedTs1, series.Values[0].Timestamp)
}

func TestReadAsHeatmapWithEmptyBuckets(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]*float64{})},
	}

	rowsData := [][]any{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			[][]*float64{}, // Empty histogram
		},
	}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	result, err := consume(rows, qbtypes.RequestTypeHeatmap, nil, qbtypes.Step{}, "test_empty_heatmap")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok, "expected *qbtypes.TimeSeriesData for heatmap")

	assert.Equal(t, "test_empty_heatmap", timeSeriesData.QueryName)
	assert.Len(t, timeSeriesData.Aggregations, 1) // Should have aggregations even with empty buckets
}

func TestReadAsHeatmapWithNoRows(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]*float64{})},
	}

	rowsData := [][]any{}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	result, err := consume(rows, qbtypes.RequestTypeHeatmap, nil, qbtypes.Step{}, "test_no_rows")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok, "expected *qbtypes.TimeSeriesData for heatmap")
	assert.Nil(t, timeSeriesData.Aggregations)
}
