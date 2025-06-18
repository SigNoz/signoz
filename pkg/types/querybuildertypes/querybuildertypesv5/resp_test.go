package querybuildertypesv5

import (
	"encoding/json"
	"math"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestTimeSeriesValue_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		value    TimeSeriesValue
		expected string
	}{
		{
			name: "normal value",
			value: TimeSeriesValue{
				Timestamp: 1234567890,
				Value:     42.5,
			},
			expected: `{"timestamp":1234567890,"value":42.5}`,
		},
		{
			name: "NaN value",
			value: TimeSeriesValue{
				Timestamp: 1234567890,
				Value:     math.NaN(),
			},
			expected: `{"timestamp":1234567890,"value":"NaN"}`,
		},
		{
			name: "positive infinity",
			value: TimeSeriesValue{
				Timestamp: 1234567890,
				Value:     math.Inf(1),
			},
			expected: `{"timestamp":1234567890,"value":"Inf"}`,
		},
		{
			name: "negative infinity",
			value: TimeSeriesValue{
				Timestamp: 1234567890,
				Value:     math.Inf(-1),
			},
			expected: `{"timestamp":1234567890,"value":"-Inf"}`,
		},
		{
			name: "values array with NaN",
			value: TimeSeriesValue{
				Timestamp: 1234567890,
				Value:     1.0,
				Values:    []float64{1.0, math.NaN(), 3.0, math.Inf(1)},
			},
			expected: `{"timestamp":1234567890,"value":1,"values":[1,"NaN",3,"Inf"]}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.value)
			if err != nil {
				t.Errorf("MarshalJSON() error = %v", err)
				return
			}
			if string(got) != tt.expected {
				t.Errorf("MarshalJSON() = %v, want %v", string(got), tt.expected)
			}
		})
	}
}

func TestTimeSeries_MarshalJSON_WithNaN(t *testing.T) {
	ts := &TimeSeries{
		Labels: []*Label{
			{Key: telemetrytypes.TelemetryFieldKey{Name: "test"}, Value: "value"},
		},
		Values: []*TimeSeriesValue{
			{Timestamp: 1000, Value: 1.0},
			{Timestamp: 2000, Value: math.NaN()},
			{Timestamp: 3000, Value: math.Inf(1)},
		},
	}

	data, err := json.Marshal(ts)
	if err != nil {
		t.Fatalf("Failed to marshal TimeSeries: %v", err)
	}

	// Verify the JSON is valid by unmarshaling into a generic structure
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal result: %v", err)
	}

	// The unmarshaling won't work directly since we're now using strings for special values
	// Just verify that the JSON contains the expected string representations
	jsonStr := string(data)
	if !strings.Contains(jsonStr, `"value":"NaN"`) {
		t.Errorf("Expected JSON to contain NaN as string, got %s", jsonStr)
	}
	if !strings.Contains(jsonStr, `"value":"Inf"`) {
		t.Errorf("Expected JSON to contain Inf as string, got %s", jsonStr)
	}
}
