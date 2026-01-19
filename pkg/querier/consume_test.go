package querier

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadAsBucketFromArray(t *testing.T) {
	columns := []cmock.ColumnType{
		{Name: "ts", Type: "DateTime"},
		{Name: "__result_0", Type: "Array(Array(Float64))"},
	}

	rowsData := [][]any{
		{
			time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
			[][]float64{
				{0, 10, 5},
				{10, 20, 3},
			},
		},
		{
			time.Date(2024, 1, 1, 10, 1, 0, 0, time.UTC),
			[][]float64{
				{0, 10, 2},
				{10, 20, 6},
				{20, 30, 4},
			},
		},
	}

	rows := cmock.NewRows(columns, rowsData)

	// Test regular consumption
	result, err := consume(rows, qbtypes.RequestTypeBucket, nil, qbtypes.Step{}, "test_bucket_query", 0)
	require.NoError(t, err)
	require.NotNil(t, result)

	bucketData, ok := result.(*qbtypes.BucketData)
	require.True(t, ok, "expected *qbtypes.BucketData")

	assert.Equal(t, "test_bucket_query", bucketData.QueryName)
	assert.Len(t, bucketData.Timestamps, 2)
	assert.Len(t, bucketData.Counts, 2)

	// Validate Timestamps
	expectedTs := []int64{
		time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC).UnixMilli(),
		time.Date(2024, 1, 1, 10, 1, 0, 0, time.UTC).UnixMilli(),
	}
	assert.Equal(t, expectedTs, bucketData.Timestamps)

	// Validate BucketBounds (sorted unique ends)
	expectedBounds := []float64{10, 20, 30}
	assert.Equal(t, expectedBounds, bucketData.BucketBounds)

	// Validate BucketStarts
	expectedStarts := []float64{0, 10, 20}
	assert.Equal(t, expectedStarts, bucketData.BucketStarts)

	// Validate Counts
	expectedCounts := [][]float64{
		{5, 3, 0}, // for 10:00
		{2, 6, 4}, // for 10:01
	}
	assert.Equal(t, expectedCounts, bucketData.Counts)
}
