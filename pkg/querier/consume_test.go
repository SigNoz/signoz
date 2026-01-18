package querier

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadAsBucketFromRows(t *testing.T) {
	columns := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "le", Type: "Float64"},
		{Name: "bucket_start", Type: "Float64"},
		{Name: "value", Type: "Float64"},
	}

	ts1 := time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC)
	ts2 := time.Date(2024, 1, 1, 10, 1, 0, 0, time.UTC)

	rowsData := [][]any{
		// Timestamp 1 buckets
		{ts1, 10.0, 0.0, 5.0},
		{ts1, 20.0, 10.0, 3.0},
		// Timestamp 2 buckets
		{ts2, 10.0, 0.0, 2.0},
		{ts2, 20.0, 10.0, 6.0},
		{ts2, 30.0, 20.0, 4.0},
	}

	rows := cmock.NewRows(columns, rowsData)

	// Test regular consumption
	result, err := consume(rows, qbtypes.RequestTypeBucket, nil, qbtypes.Step{}, "test_bucket_query")
	require.NoError(t, err)
	require.NotNil(t, result)

	bucketData, ok := result.(*qbtypes.BucketData)
	require.True(t, ok, "expected *qbtypes.BucketData")

	assert.Equal(t, "test_bucket_query", bucketData.QueryName)
	assert.Len(t, bucketData.Timestamps, 2)
	assert.Len(t, bucketData.Counts, 2)

	// Validate Timestamps
	expectedTs := []int64{
		ts1.UnixMilli(),
		ts2.UnixMilli(),
	}
	assert.Equal(t, expectedTs, bucketData.Timestamps)

	// Validate BucketBounds
	expectedBounds := []float64{10, 20, 30}
	assert.Equal(t, expectedBounds, bucketData.BucketBounds)

	// Validate BucketStarts
	expectedStarts := []float64{0, 10, 20}
	assert.Equal(t, expectedStarts, bucketData.BucketStarts)

	// Validate Counts
	expectedCounts := [][]float64{
		{5, 3, 0},
		{2, 6, 4},
	}
	assert.Equal(t, expectedCounts, bucketData.Counts)
}
