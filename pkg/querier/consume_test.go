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

func TestConsumeHeatmap(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]*float64{})},
	}

	// histogram format: [lower, upper, count]
	rowsData := [][]any{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			[][]*float64{
				{floatPtr(0), floatPtr(10), floatPtr(5)},  // 5 observations in [0, 10)
				{floatPtr(10), floatPtr(20), floatPtr(3)}, // 3 observations in [10, 20)
				{floatPtr(20), floatPtr(30), floatPtr(0)}, // 0 observations in [20, 30)
			},
		},
		{
			time.Date(2024, 1, 1, 10, 1, 0, 0, time.UTC),
			[][]*float64{
				{floatPtr(0), floatPtr(10), floatPtr(2)},  // 2 observations in [0, 10)
				{floatPtr(10), floatPtr(20), floatPtr(6)}, // 6 observations in [10, 20)
				{floatPtr(20), floatPtr(30), floatPtr(4)}, // 4 observations in [20, 30)
			},
		},
	}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	// Test heatmap consumption
	result, err := consume(rows, qbtypes.RequestTypeHeatmap, nil, qbtypes.Step{}, "test_native_bins")
	require.NoError(t, err)
	require.NotNil(t, result)

	timeSeriesData, ok := result.(*qbtypes.TimeSeriesData)
	require.True(t, ok, "expected *qbtypes.TimeSeriesData for heatmap")

	assert.Equal(t, "test_native_bins", timeSeriesData.QueryName)
	assert.Len(t, timeSeriesData.Aggregations, 1)

	agg := timeSeriesData.Aggregations[0]
	assert.Equal(t, "__result_0", agg.Alias)
	assert.Len(t, agg.Series, 1)

	series := agg.Series[0]
	assert.Len(t, series.Values, 2) // 2 timestamps

	// Bounds
	require.NotNil(t, series.Bounds, "bounds should be at series level")
	assert.Equal(t, 4, len(series.Bounds), "should have 4 boundary points for 3 bins")
	assert.Equal(t, 0.0, series.Bounds[0])
	assert.Equal(t, 10.0, series.Bounds[1])
	assert.Equal(t, 20.0, series.Bounds[2])
	assert.Equal(t, 30.0, series.Bounds[3])

	// First timestamp counts
	assert.Equal(t, 3, len(series.Values[0].Values))
	assert.Equal(t, 5.0, series.Values[0].Values[0], "first bin should have 5 counts")
	assert.Equal(t, 3.0, series.Values[0].Values[1], "second bin should have 3 counts")
	assert.Equal(t, 0.0, series.Values[0].Values[2], "third bin should have 0 counts")

	// Second timestamp counts
	assert.Equal(t, 3, len(series.Values[1].Values))
	assert.Equal(t, 2.0, series.Values[1].Values[0], "first bin should have 2 counts")
	assert.Equal(t, 6.0, series.Values[1].Values[1], "second bin should have 6 counts")
	assert.Equal(t, 4.0, series.Values[1].Values[2], "third bin should have 4 counts")
}

func TestConsumeHeatmapWithEmptyBuckets(t *testing.T) {
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
	// With empty buckets, we should still have aggregations but with empty series
	assert.Len(t, timeSeriesData.Aggregations, 1)
	assert.Len(t, timeSeriesData.Aggregations[0].Series, 1)
	assert.Len(t, timeSeriesData.Aggregations[0].Series[0].Values, 0)
}
