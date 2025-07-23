package querybuildertypesv5

import (
	"math"
	"testing"
)

// Helper function to create test time series data
func createTestTimeSeriesData(values []float64) *TimeSeries {
	timeSeriesValues := make([]*TimeSeriesValue, len(values))
	for i, val := range values {
		timeSeriesValues[i] = &TimeSeriesValue{
			Timestamp: int64(i + 1),
			Value:     val,
		}
	}

	series := &TimeSeries{
		Values: timeSeriesValues,
	}

	return series
}

// Helper function to extract values from result for comparison
func extractValues(result *TimeSeries) []float64 {
	values := make([]float64, len(result.Values))
	for i, point := range result.Values {
		values[i] = point.Value
	}
	return values
}

func TestFuncCutOffMin(t *testing.T) {
	tests := []struct {
		name      string
		values    []float64
		threshold float64
		want      []float64
	}{
		{
			name:      "test funcCutOffMin",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0.3,
			want:      []float64{0.5, 0.4, 0.3, math.NaN(), math.NaN()},
		},
		{
			name:      "test funcCutOffMin with threshold 0",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0,
			want:      []float64{0.5, 0.4, 0.3, 0.2, 0.1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcCutOffMin(result, tt.threshold)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcCutOffMin() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(got[i]) {
						t.Errorf("funcCutOffMin() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				} else {
					if got[i] != tt.want[i] {
						t.Errorf("funcCutOffMin() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestFuncCutOffMax(t *testing.T) {
	tests := []struct {
		name      string
		values    []float64
		threshold float64
		want      []float64
	}{
		{
			name:      "test funcCutOffMax",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0.3,
			want:      []float64{math.NaN(), math.NaN(), 0.3, 0.2, 0.1},
		},
		{
			name:      "test funcCutOffMax with threshold 0",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0,
			want:      []float64{math.NaN(), math.NaN(), math.NaN(), math.NaN(), math.NaN()},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcCutOffMax(result, tt.threshold)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcCutOffMax() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(got[i]) {
						t.Errorf("funcCutOffMax() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				} else {
					if got[i] != tt.want[i] {
						t.Errorf("funcCutOffMax() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestCutOffMinCumSum(t *testing.T) {
	tests := []struct {
		name      string
		values    []float64
		threshold float64
		want      []float64
	}{
		{
			name:      "test funcCutOffMin followed by funcCumulativeSum",
			values:    []float64{0.5, 0.2, 0.1, 0.4, 0.3},
			threshold: 0.3,
			want:      []float64{0.5, 0.5, 0.5, 0.9, 1.2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcCutOffMin(result, tt.threshold)
			newResult = funcCumulativeSum(newResult)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("CutOffMin+CumSum got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(got[i]) {
						t.Errorf("CutOffMin+CumSum at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				} else {
					if got[i] != tt.want[i] {
						t.Errorf("CutOffMin+CumSum at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestFuncMedian3(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "Values",
			values: []float64{5, 3, 8, 2, 7},
			want:   []float64{5, 5, 3, 7, 7}, // edge values unchanged, middle values are median of 3
		},
		{
			name:   "NaNHandling",
			values: []float64{math.NaN(), 3, math.NaN(), 7, 9},
			want:   []float64{math.NaN(), 3, 5, 8, 9}, // median of available values
		},
		{
			name:   "UniformValues",
			values: []float64{7, 7, 7, 7, 7},
			want:   []float64{7, 7, 7, 7, 7},
		},
		{
			name:   "SingleValueSeries",
			values: []float64{9},
			want:   []float64{9},
		},
		{
			name:   "EmptySeries",
			values: []float64{},
			want:   []float64{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			got := funcMedian3(result)
			gotValues := extractValues(got)

			if len(gotValues) != len(tt.want) {
				t.Errorf("funcMedian3() got length %d, want length %d", len(gotValues), len(tt.want))
				return
			}

			for i := range gotValues {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(gotValues[i]) {
						t.Errorf("funcMedian3() at index %d = %v, want %v", i, gotValues[i], tt.want[i])
					}
				} else {
					if gotValues[i] != tt.want[i] {
						t.Errorf("funcMedian3() at index %d = %v, want %v", i, gotValues[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestFuncMedian5(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "Values",
			values: []float64{5, 3, 8, 2, 7, 9, 1, 4, 6, 10},
			want:   []float64{5, 3, 5, 7, 7, 4, 6, 6, 6, 10}, // edge values unchanged
		},
		{
			name:   "NaNHandling",
			values: []float64{math.NaN(), 3, math.NaN(), 7, 9, 1, 4, 6, 10, 2},
			want:   []float64{math.NaN(), 3, 7, 5, 5.5, 6, 6, 4, 10, 2}, // median of available values
		},
		{
			name:   "UniformValues",
			values: []float64{7, 7, 7, 7, 7},
			want:   []float64{7, 7, 7, 7, 7},
		},
		{
			name:   "SingleValueSeries",
			values: []float64{9},
			want:   []float64{9},
		},
		{
			name:   "EmptySeries",
			values: []float64{},
			want:   []float64{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			got := funcMedian5(result)
			gotValues := extractValues(got)

			if len(gotValues) != len(tt.want) {
				t.Errorf("funcMedian5() got length %d, want length %d", len(gotValues), len(tt.want))
				return
			}

			for i := range gotValues {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(gotValues[i]) {
						t.Errorf("funcMedian5() at index %d = %v, want %v", i, gotValues[i], tt.want[i])
					}
				} else {
					if gotValues[i] != tt.want[i] {
						t.Errorf("funcMedian5() at index %d = %v, want %v", i, gotValues[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestFuncRunningDiff(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "test funcRunningDiff",
			values: []float64{1, 2, 3},
			want:   []float64{1, 1}, // diff removes first element
		},
		{
			name:   "test funcRunningDiff with start number as 8",
			values: []float64{8, 8, 8},
			want:   []float64{0, 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			got := funcRunningDiff(result)
			gotValues := extractValues(got)

			if len(gotValues) != len(tt.want) {
				t.Errorf("funcRunningDiff() got length %d, want length %d", len(gotValues), len(tt.want))
				return
			}

			for i := range gotValues {
				if gotValues[i] != tt.want[i] {
					t.Errorf("funcRunningDiff() at index %d = %v, want %v", i, gotValues[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncClampMin(t *testing.T) {
	tests := []struct {
		name      string
		values    []float64
		threshold float64
		want      []float64
	}{
		{
			name:      "test funcClampMin",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0.3,
			want:      []float64{0.5, 0.4, 0.3, 0.3, 0.3},
		},
		{
			name:      "test funcClampMin with threshold 0",
			values:    []float64{-0.5, -0.4, 0.3, 0.2, 0.1},
			threshold: 0,
			want:      []float64{0, 0, 0.3, 0.2, 0.1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcClampMin(result, tt.threshold)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcClampMin() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("funcClampMin() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncClampMax(t *testing.T) {
	tests := []struct {
		name      string
		values    []float64
		threshold float64
		want      []float64
	}{
		{
			name:      "test funcClampMax",
			values:    []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			threshold: 0.3,
			want:      []float64{0.3, 0.3, 0.3, 0.2, 0.1},
		},
		{
			name:      "test funcClampMax with threshold 1.0",
			values:    []float64{2.5, 0.4, 1.3, 0.2, 0.1},
			threshold: 1.0,
			want:      []float64{1.0, 0.4, 1.0, 0.2, 0.1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcClampMax(result, tt.threshold)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcClampMax() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("funcClampMax() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncAbsolute(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "test funcAbsolute",
			values: []float64{-0.5, 0.4, -0.3, 0.2, -0.1},
			want:   []float64{0.5, 0.4, 0.3, 0.2, 0.1},
		},
		{
			name:   "test funcAbsolute with all positive",
			values: []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			want:   []float64{0.5, 0.4, 0.3, 0.2, 0.1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcAbsolute(result)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcAbsolute() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("funcAbsolute() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncLog2(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "test funcLog2",
			values: []float64{1, 2, 4, 8, 16},
			want:   []float64{0, 1, 2, 3, 4},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcLog2(result)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcLog2() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.Abs(got[i]-tt.want[i]) > 1e-10 {
					t.Errorf("funcLog2() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncLog10(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "test funcLog10",
			values: []float64{1, 10, 100, 1000},
			want:   []float64{0, 1, 2, 3},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcLog10(result)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcLog10() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.Abs(got[i]-tt.want[i]) > 1e-10 {
					t.Errorf("funcLog10() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncCumSum(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		want   []float64
	}{
		{
			name:   "test funcCumSum",
			values: []float64{1, 2, 3, 4, 5},
			want:   []float64{1, 3, 6, 10, 15},
		},
		{
			name:   "test funcCumSum with NaN",
			values: []float64{1, math.NaN(), 3, 4, 5},
			want:   []float64{1, 1, 4, 8, 13}, // NaN is ignored
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcCumulativeSum(result)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("funcCumSum() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("funcCumSum() at index %d = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestFuncTimeShift(t *testing.T) {
	tests := []struct {
		name   string
		values []float64
		shift  float64
		want   []int64 // expected timestamps
	}{
		{
			name:   "test funcTimeShift positive",
			values: []float64{1, 2, 3},
			shift:  5.0,                       // 5 seconds
			want:   []int64{5001, 5002, 5003}, // original timestamps (1,2,3) + 5000ms
		},
		{
			name:   "test funcTimeShift negative",
			values: []float64{1, 2, 3},
			shift:  -2.0,                         // -2 seconds
			want:   []int64{-1999, -1998, -1997}, // original timestamps (1,2,3) - 2000ms
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := funcTimeShift(result, tt.shift)

			got := make([]int64, len(newResult.Values))
			for i, point := range newResult.Values {
				got[i] = point.Timestamp
			}

			if len(got) != len(tt.want) {
				t.Errorf("funcTimeShift() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("funcTimeShift() at index %d timestamp = %v, want %v", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestApplyFunction(t *testing.T) {
	tests := []struct {
		name     string
		function Function
		values   []float64
		want     []float64
	}{
		{
			name: "cutOffMin function",
			function: Function{
				Name: FunctionNameCutOffMin,
				Args: []FunctionArg{
					{Value: "0.3"},
				},
			},
			values: []float64{0.5, 0.4, 0.3, 0.2, 0.1},
			want:   []float64{0.5, 0.4, 0.3, math.NaN(), math.NaN()},
		},
		{
			name: "absolute function",
			function: Function{
				Name: FunctionNameAbsolute,
			},
			values: []float64{-0.5, 0.4, -0.3, 0.2, -0.1},
			want:   []float64{0.5, 0.4, 0.3, 0.2, 0.1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := createTestTimeSeriesData(tt.values)
			newResult := ApplyFunction(tt.function, result)
			got := extractValues(newResult)

			if len(got) != len(tt.want) {
				t.Errorf("ApplyFunction() got length %d, want length %d", len(got), len(tt.want))
				return
			}

			for i := range got {
				if math.IsNaN(tt.want[i]) {
					if !math.IsNaN(got[i]) {
						t.Errorf("ApplyFunction() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				} else {
					if got[i] != tt.want[i] {
						t.Errorf("ApplyFunction() at index %d = %v, want %v", i, got[i], tt.want[i])
					}
				}
			}
		})
	}
}

func TestApplyFunctions(t *testing.T) {
	functions := []Function{
		{
			Name: FunctionNameCutOffMin,
			Args: []FunctionArg{
				{Value: "0.3"},
			},
		},
		{
			Name: FunctionNameCumulativeSum,
		},
	}

	values := []float64{0.5, 0.2, 0.1, 0.4, 0.3}
	want := []float64{0.5, 0.5, 0.5, 0.9, 1.2}

	result := createTestTimeSeriesData(values)
	newResult := ApplyFunctions(functions, result)
	got := extractValues(newResult)

	if len(got) != len(want) {
		t.Errorf("ApplyFunctions() got length %d, want length %d", len(got), len(want))
		return
	}

	for i := range got {
		if got[i] != want[i] {
			t.Errorf("ApplyFunctions() at index %d = %v, want %v", i, got[i], want[i])
		}
	}
}

func TestFuncFillZero(t *testing.T) {
	tests := []struct {
		name     string
		input    *TimeSeries
		start    int64
		end      int64
		step     int64
		expected *TimeSeries
	}{
		{
			name: "no gaps",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 3000, Value: 3.0},
				},
			},
			start: 1000,
			end:   3000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 3000, Value: 3.0},
				},
			},
		},
		{
			name: "single gap",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 3000, Value: 3.0},
				},
			},
			start: 1000,
			end:   3000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 0},
					{Timestamp: 3000, Value: 3.0},
				},
			},
		},
		{
			name: "multiple gaps",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 3000, Value: 3.0},
					{Timestamp: 6000, Value: 6.0},
				},
			},
			start: 1000,
			end:   6000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 0},
					{Timestamp: 3000, Value: 3.0},
					{Timestamp: 4000, Value: 0},
					{Timestamp: 5000, Value: 0},
					{Timestamp: 6000, Value: 6.0},
				},
			},
		},
		{
			name: "irregular gaps",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 5000, Value: 5.0},
					{Timestamp: 6000, Value: 6.0},
				},
			},
			start: 1000,
			end:   6000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 3000, Value: 0},
					{Timestamp: 4000, Value: 0},
					{Timestamp: 5000, Value: 5.0},
					{Timestamp: 6000, Value: 6.0},
				},
			},
		},
		{
			name: "empty series",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{},
			},
			start: 1000,
			end:   3000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 0},
					{Timestamp: 2000, Value: 0},
					{Timestamp: 3000, Value: 0},
				},
			},
		},
		{
			name: "single value",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
				},
			},
			start: 1000,
			end:   3000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 0},
					{Timestamp: 3000, Value: 0},
				},
			},
		},
		{
			name: "values outside range",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 500, Value: 0.5},
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 4000, Value: 4.0},
					{Timestamp: 5000, Value: 5.0},
				},
			},
			start: 1000,
			end:   4000,
			step:  1,
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 1000, Value: 1.0},
					{Timestamp: 2000, Value: 2.0},
					{Timestamp: 3000, Value: 0},
					{Timestamp: 4000, Value: 4.0},
				},
			},
		},
		{
			name: "unaligned start and end",
			input: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 60000, Value: 1.0},
					{Timestamp: 120000, Value: 2.0},
					{Timestamp: 240000, Value: 4.0},
				},
			},
			start: 50000,  // Not aligned to 60s
			end:   250000, // Not aligned to 60s
			step:  60,     // 60 seconds
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 0, Value: 0}, // Aligned start
					{Timestamp: 60000, Value: 1.0},
					{Timestamp: 120000, Value: 2.0},
					{Timestamp: 180000, Value: 0}, // Filled gap
					{Timestamp: 240000, Value: 4.0},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := funcFillZero(tt.input, tt.start, tt.end, tt.step)

			if len(result.Values) != len(tt.expected.Values) {
				t.Fatalf("Expected %d values, got %d", len(tt.expected.Values), len(result.Values))
			}

			for i, val := range result.Values {
				if val.Timestamp != tt.expected.Values[i].Timestamp {
					t.Errorf("At index %d: expected timestamp %d, got %d",
						i, tt.expected.Values[i].Timestamp, val.Timestamp)
				}
				if val.Value != tt.expected.Values[i].Value {
					t.Errorf("At index %d: expected value %f, got %f",
						i, tt.expected.Values[i].Value, val.Value)
				}
			}
		})
	}
}

func TestApplyFunction_FillZero(t *testing.T) {
	input := &TimeSeries{
		Values: []*TimeSeriesValue{
			{Timestamp: 1000, Value: 10.0},
			{Timestamp: 3000, Value: 30.0},
			{Timestamp: 4000, Value: 40.0},
		},
	}

	fn := Function{
		Name: FunctionNameFillZero,
		Args: []FunctionArg{
			{Value: 1000.0}, // start
			{Value: 4000.0}, // end
			{Value: 1.0},    // step
		},
	}

	result := ApplyFunction(fn, input)

	expectedCount := 4 // 1000, 2000, 3000, 4000
	if len(result.Values) != expectedCount {
		t.Fatalf("Expected %d values after fillZero, got %d", expectedCount, len(result.Values))
	}

	if result.Values[1].Timestamp != 2000 || result.Values[1].Value != 0 {
		t.Errorf("Expected gap to be filled with 0 at timestamp 2000, got %v at %d",
			result.Values[1].Value, result.Values[1].Timestamp)
	}
}
