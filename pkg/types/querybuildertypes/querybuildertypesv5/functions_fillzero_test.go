package querybuildertypesv5

import (
	"testing"
)

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
			step:  1000,
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
			step:  1000,
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
			step:  1000,
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
			step:  1000,
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
			step:  1000,
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
			step:  1000,
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
			step:  1000,
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
			step:  60000,  // 60 seconds
			expected: &TimeSeries{
				Values: []*TimeSeriesValue{
					{Timestamp: 0, Value: 0}, // Aligned start
					{Timestamp: 60000, Value: 1.0},
					{Timestamp: 120000, Value: 2.0},
					{Timestamp: 180000, Value: 0}, // Filled gap
					{Timestamp: 240000, Value: 4.0},
					{Timestamp: 300000, Value: 0}, // Aligned end
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
			{Value: 1000.0}, // step
		},
	}

	result := ApplyFunction(fn, input)

	// Verify the result has filled gaps
	expectedCount := 4 // 1000, 2000, 3000, 4000
	if len(result.Values) != expectedCount {
		t.Fatalf("Expected %d values after fillZero, got %d", expectedCount, len(result.Values))
	}

	// Check that the gap at 2000 was filled with 0
	if result.Values[1].Timestamp != 2000 || result.Values[1].Value != 0 {
		t.Errorf("Expected gap to be filled with 0 at timestamp 2000, got %v at %d",
			result.Values[1].Value, result.Values[1].Timestamp)
	}
}
