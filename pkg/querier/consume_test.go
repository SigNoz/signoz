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

func TestConsumeDistribution(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]float64{})},
	}

	rowsData := [][]any{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			[][]float64{
				{0, 10, 5},
				{10, 20, 3},
			},
		},
	}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	result, err := consume(rows, qbtypes.RequestTypeDistribution, nil, qbtypes.Step{}, "test_bucket_query")
	require.NoError(t, err)
	require.NotNil(t, result)

	distData, ok := result.(*qbtypes.DistributionData)
	require.True(t, ok, "expected *qbtypes.DistributionData for distribution")

	assert.Equal(t, "test_bucket_query", distData.QueryName)
	assert.Len(t, distData.Aggregations, 1)

	agg := distData.Aggregations[0]
	assert.Len(t, agg.Buckets, 2)

	// Native bins from ClickHouse histogram: [(0,10,5), (10,20,3)]
	// Bucket 0: lower=0, upper=10, count=5
	// Bucket 1: lower=10, upper=20, count=3

	assert.Equal(t, 0.0, agg.Buckets[0].LowerBound)
	assert.Equal(t, 10.0, agg.Buckets[0].UpperBound)
	assert.Equal(t, 5.0, agg.Buckets[0].Count)

	assert.Equal(t, 10.0, agg.Buckets[1].LowerBound)
	assert.Equal(t, 20.0, agg.Buckets[1].UpperBound)
	assert.Equal(t, 3.0, agg.Buckets[1].Count)
}

func TestConsumeDistributionWithEmptyBuckets(t *testing.T) {
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

	result, err := consume(rows, qbtypes.RequestTypeDistribution, nil, qbtypes.Step{}, "test_empty_distribution")
	require.NoError(t, err)
	require.NotNil(t, result)

	distData, ok := result.(*qbtypes.DistributionData)
	require.True(t, ok)

	if distData.Aggregations != nil {
		assert.Len(t, distData.Aggregations, 0)
	}
}

func TestConsumeDistributionWithNoRows(t *testing.T) {
	colTypes := []driver.ColumnType{
		mockColumnType{name: "ts", scanType: reflect.TypeOf(time.Time{})},
		mockColumnType{name: "__result_0", scanType: reflect.TypeOf([][]*float64{})},
	}

	rowsData := [][]any{}

	rows := &mockRows{colTypes: colTypes, values: rowsData}

	result, err := consume(rows, qbtypes.RequestTypeDistribution, nil, qbtypes.Step{}, "test_no_rows")
	require.NoError(t, err)
	require.NotNil(t, result)

	distData, ok := result.(*qbtypes.DistributionData)
	require.True(t, ok)
	assert.Nil(t, distData.Aggregations)
}
