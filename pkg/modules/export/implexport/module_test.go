package implexport

import (
	"context"
	"errors"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestModuleExportSuccess(t *testing.T) {
	// Test case 1: Successful export

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockQuerier := NewMockQuerier(ctrl)
	module := NewModule(mockQuerier)
	assert.NotNil(t, module)

	ctx := context.Background()
	orgID := valuer.GenerateUUID()

	// Create a query range request with log aggregation
	rangeRequest := &qbtypes.QueryRangeRequest{
		Start: uint64(time.Now().Add(-1 * time.Hour).Unix()),
		End:   uint64(time.Now().Unix()),
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal: telemetrytypes.SignalLogs,
						Name:   "A",
						Limit:  100,
					},
				},
			},
		},
	}

	// Mock response data
	mockResponse := &qbtypes.QueryRangeResponse{
		Data: qbtypes.QueryData{
			Results: []any{
				&qbtypes.RawData{
					QueryName: "A",
					Rows: []*qbtypes.RawRow{
						{
							Timestamp: time.Now(),
							Data:      map[string]interface{}{"key": "value"},
						},
					},
					NextCursor: "next-cursor",
				},
			},
		},
	}

	// Expect QueryRange to be called with appropriate parameters
	mockQuerier.EXPECT().QueryRange(gomock.Any(), orgID, rangeRequest).Do(func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) {
		assert.Equal(t, ctx.Value(CLICKHOUSE_CONTEXT_MAX_THREADS_KEY), CLICKHOUSE_CONTEXT_MAX_THREADS)
	}).Return(mockResponse, nil).AnyTimes()

	// Call Export and verify results
	rowChan, errChan := module.Export(ctx, orgID, rangeRequest)

	// Read from channels
	var rows []*qbtypes.RawRow
	var exportErr error

	// Collect rows and errors
	for row := range rowChan {
		rows = append(rows, row)
	}

	select {
	case err := <-errChan:
		exportErr = err
	default:
	}

	// Verify results
	assert.Nil(t, exportErr)
	assert.Len(t, rows, 100)
	assert.Equal(t, "value", rows[0].Data["key"])

}

func TestModuleExportFailure(t *testing.T) {
	// Test case 2: Failed export

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockQuerier := NewMockQuerier(ctrl)
	module := NewModule(mockQuerier)
	assert.NotNil(t, module)

	// Test case 2: Failed export
	ctx := context.Background()
	orgID := valuer.GenerateUUID()

	// Create a query range request with log aggregation
	rangeRequest := &qbtypes.QueryRangeRequest{
		Start: uint64(time.Now().Add(-1 * time.Hour).Unix()),
		End:   uint64(time.Now().Unix()),
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal: telemetrytypes.SignalLogs,
						Name:   "A",
						Limit:  100,
					},
				},
			},
		},
	}

	mockQuerier.EXPECT().
		QueryRange(gomock.Any(), orgID, rangeRequest).Do(func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) {
		assert.Equal(t, ctx.Value(CLICKHOUSE_CONTEXT_MAX_THREADS_KEY), CLICKHOUSE_CONTEXT_MAX_THREADS)
	}).Return(nil, errors.New("query failed"))

	rowChan, errChan := module.Export(ctx, orgID, rangeRequest)

	// Read from channels
	var rows []*qbtypes.RawRow
	var exportErr error

	for row := range rowChan {
		rows = append(rows, row)
	}

	select {
	case err := <-errChan:
		exportErr = err
	default:
	}

	// Verify error case
	assert.NotNil(t, exportErr)
	assert.Equal(t, "query failed", exportErr.Error())
	assert.Len(t, rows, 0)
}

func TestModuleExportPartialFailure(t *testing.T) {
	// Test case 3: Partial export

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockQuerier := NewMockQuerier(ctrl)
	module := NewModule(mockQuerier)
	assert.NotNil(t, module)

	ctx := context.Background()
	orgID := valuer.GenerateUUID()

	// Create a query range request with log aggregation
	rangeRequest := &qbtypes.QueryRangeRequest{
		Start: uint64(time.Now().Add(-1 * time.Hour).Unix()),
		End:   uint64(time.Now().Unix()),
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
						Signal: telemetrytypes.SignalLogs,
						Name:   "A",
						Limit:  2,
					},
				},
			},
		},
	}

	// Mock response data
	mockResponse := &qbtypes.QueryRangeResponse{
		Data: qbtypes.QueryData{
			Results: []any{
				&qbtypes.RawData{
					QueryName: "A",
					Rows: []*qbtypes.RawRow{
						{
							Timestamp: time.Now(),
							Data:      map[string]interface{}{"key": "value"},
						},
					},
					NextCursor: "next-cursor",
				},
			},
		},
	}

	mockQuerier.EXPECT().
		QueryRange(gomock.Any(), orgID, rangeRequest).Do(func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) {
		assert.Equal(t, ctx.Value(CLICKHOUSE_CONTEXT_MAX_THREADS_KEY), CLICKHOUSE_CONTEXT_MAX_THREADS)
	}).Return(mockResponse, nil).Times(1)

	mockQuerier.EXPECT().
		QueryRange(gomock.Any(), orgID, rangeRequest).Do(func(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) {
		assert.Equal(t, ctx.Value(CLICKHOUSE_CONTEXT_MAX_THREADS_KEY), CLICKHOUSE_CONTEXT_MAX_THREADS)
	}).Return(nil, errors.New("query failed")).Times(1)

	rowChan, errChan := module.Export(ctx, orgID, rangeRequest)

	// Read from channels
	var rows []*qbtypes.RawRow
	var exportErr error

	for row := range rowChan {
		rows = append(rows, row)
	}

	select {
	case err := <-errChan:
		exportErr = err
	default:
	}

	// Verify partial error case
	assert.NotNil(t, exportErr)
	assert.Equal(t, "query failed", exportErr.Error())
	assert.Len(t, rows, 1)
	assert.Equal(t, "value", rows[0].Data["key"])
}
