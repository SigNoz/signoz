package querier

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

// TestAdjustTimeRangeForShift tests the time range adjustment logic
func TestAdjustTimeRangeForShift(t *testing.T) {
	tests := []struct {
		name           string
		spec           qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		timeRange      qbtypes.TimeRange
		requestType    qbtypes.RequestType
		expectedFromMS uint64
		expectedToMS   uint64
	}{
		{
			name: "no shift",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{},
			},
			timeRange: qbtypes.TimeRange{
				From: 1000000,
				To:   2000000,
			},
			requestType:    qbtypes.RequestTypeTimeSeries,
			expectedFromMS: 1000000,
			expectedToMS:   2000000,
		},
		{
			name: "shift by 60 seconds using timeShift function",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "60"},
						},
					},
				},
			},
			timeRange: qbtypes.TimeRange{
				From: 1000000,
				To:   2000000,
			},
			requestType:    qbtypes.RequestTypeTimeSeries,
			expectedFromMS: 940000,  // 1000000 - 60000
			expectedToMS:   1940000, // 2000000 - 60000
		},
		{
			name: "shift by negative 30 seconds (future shift)",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "-30"},
						},
					},
				},
			},
			timeRange: qbtypes.TimeRange{
				From: 1000000,
				To:   2000000,
			},
			requestType:    qbtypes.RequestTypeTimeSeries,
			expectedFromMS: 1030000, // 1000000 - (-30000)
			expectedToMS:   2030000, // 2000000 - (-30000)
		},
		{
			name: "no shift for raw request type even with timeShift function",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "3600"},
						},
					},
				},
			},
			timeRange: qbtypes.TimeRange{
				From: 1000000,
				To:   2000000,
			},
			requestType:    qbtypes.RequestTypeRaw,
			expectedFromMS: 1000000, // No shift for raw queries
			expectedToMS:   2000000,
		},
		{
			name: "shift applied for scalar request type with timeShift function",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "3600"},
						},
					},
				},
			},
			timeRange: qbtypes.TimeRange{
				From: 10000000,
				To:   20000000,
			},
			requestType:    qbtypes.RequestTypeScalar,
			expectedFromMS: 6400000,  // 10000000 - 3600000
			expectedToMS:   16400000, // 20000000 - 3600000
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adjustTimeRangeForShift(tt.spec, tt.timeRange, tt.requestType)
			assert.Equal(t, tt.expectedFromMS, result.From, "fromMS mismatch")
			assert.Equal(t, tt.expectedToMS, result.To, "toMS mismatch")
		})
	}
}

// TestExtractShiftFromBuilderQuery tests the shift extraction logic
func TestExtractShiftFromBuilderQuery(t *testing.T) {
	tests := []struct {
		name            string
		spec            qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]
		expectedShiftBy int64
	}{
		{
			name: "extract from timeShift function with float64",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: float64(3600)},
						},
					},
				},
			},
			expectedShiftBy: 3600,
		},
		{
			name: "extract from timeShift function with int64",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: int64(3600)},
						},
					},
				},
			},
			expectedShiftBy: 3600,
		},
		{
			name: "extract from timeShift function with string",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "3600"},
						},
					},
				},
			},
			expectedShiftBy: 3600,
		},
		{
			name: "no timeShift function",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameAbsolute,
					},
				},
			},
			expectedShiftBy: 0,
		},
		{
			name: "invalid timeShift value",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "invalid"},
						},
					},
				},
			},
			expectedShiftBy: 0,
		},
		{
			name: "multiple functions with timeShift",
			spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Functions: []qbtypes.Function{
					{
						Name: qbtypes.FunctionNameAbsolute,
					},
					{
						Name: qbtypes.FunctionNameTimeShift,
						Args: []qbtypes.FunctionArg{
							{Value: "1800"},
						},
					},
					{
						Name: qbtypes.FunctionNameClampMax,
						Args: []qbtypes.FunctionArg{
							{Value: "100"},
						},
					},
				},
			},
			expectedShiftBy: 1800,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			shiftBy := extractShiftFromBuilderQuery(tt.spec)
			assert.Equal(t, tt.expectedShiftBy, shiftBy)
		})
	}
}
