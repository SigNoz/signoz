package querybuildertypesv5

import (
	"encoding/json"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
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

	// Just verify that the JSON contains the expected string representations
	jsonStr := string(data)
	if !strings.Contains(jsonStr, `"value":"NaN"`) {
		t.Errorf("Expected JSON to contain NaN as string, got %s", jsonStr)
	}
	if !strings.Contains(jsonStr, `"value":"Inf"`) {
		t.Errorf("Expected JSON to contain Inf as string, got %s", jsonStr)
	}
}

func TestScalarData_MarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		data     ScalarData
		expected string
	}{
		{
			name: "normal scalar data",
			data: ScalarData{
				QueryName: "test_query",
				Columns: []*ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "value"},
						QueryName:         "test_query",
						AggregationIndex:  0,
						Type:              ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{1.0, 2.0, 3.0},
					{4.0, 5.0, 6.0},
				},
			},
			expected: `{"queryName":"test_query","columns":[{"name":"value","signal":"","fieldContext":"","fieldDataType":"","queryName":"test_query","aggregationIndex":0,"meta":{},"columnType":"aggregation"}],"data":[[1,2,3],[4,5,6]]}`,
		},
		{
			name: "scalar data with NaN",
			data: ScalarData{
				QueryName: "test_query",
				Columns: []*ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "value"},
						QueryName:         "test_query",
						AggregationIndex:  0,
						Type:              ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{1.0, math.NaN(), 3.0},
					{math.Inf(1), 5.0, math.Inf(-1)},
				},
			},
			expected: `{"queryName":"test_query","columns":[{"name":"value","signal":"","fieldContext":"","fieldDataType":"","queryName":"test_query","aggregationIndex":0,"meta":{},"columnType":"aggregation"}],"data":[[1,"NaN",3],["Inf",5,"-Inf"]]}`,
		},
		{
			name: "scalar data with mixed types",
			data: ScalarData{
				QueryName: "test_query",
				Columns: []*ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "mixed"},
						QueryName:         "test_query",
						AggregationIndex:  0,
						Type:              ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{"string", 42, math.NaN(), true},
					{nil, math.Inf(1), 3.14, false},
				},
			},
			expected: `{"queryName":"test_query","columns":[{"name":"mixed","signal":"","fieldContext":"","fieldDataType":"","queryName":"test_query","aggregationIndex":0,"meta":{},"columnType":"aggregation"}],"data":[["string",42,"NaN",true],[null,"Inf",3.14,false]]}`,
		},
		{
			name: "scalar data with nested structures",
			data: ScalarData{
				QueryName: "test_query",
				Columns: []*ColumnDescriptor{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "nested"},
						QueryName:         "test_query",
						AggregationIndex:  0,
						Type:              ColumnTypeAggregation,
					},
				},
				Data: [][]any{
					{
						map[string]any{"value": math.NaN(), "count": 10},
						[]any{1.0, math.Inf(1), 3.0},
					},
				},
			},
			expected: `{"queryName":"test_query","columns":[{"name":"nested","signal":"","fieldContext":"","fieldDataType":"","queryName":"test_query","aggregationIndex":0,"meta":{},"columnType":"aggregation"}],"data":[[{"count":10,"value":"NaN"},[1,"Inf",3]]]}`,
		},
		{
			name: "empty scalar data",
			data: ScalarData{
				QueryName: "empty_query",
				Columns:   []*ColumnDescriptor{},
				Data:      [][]any{},
			},
			expected: `{"queryName":"empty_query","columns":[],"data":[]}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.data)
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

func TestSanitizeValue(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected interface{}
	}{
		{
			name:     "nil value",
			input:    nil,
			expected: nil,
		},
		{
			name:     "normal float64",
			input:    42.5,
			expected: 42.5,
		},
		{
			name:     "NaN float64",
			input:    math.NaN(),
			expected: "NaN",
		},
		{
			name:     "positive infinity float64",
			input:    math.Inf(1),
			expected: "Inf",
		},
		{
			name:     "negative infinity float64",
			input:    math.Inf(-1),
			expected: "-Inf",
		},
		{
			name:     "normal float32",
			input:    float32(42.5),
			expected: float32(42.5),
		},
		{
			name:     "NaN float32",
			input:    float32(math.NaN()),
			expected: "NaN",
		},
		{
			name:     "slice with NaN",
			input:    []interface{}{1.0, math.NaN(), 3.0},
			expected: []interface{}{1.0, "NaN", 3.0},
		},
		{
			name: "map with NaN",
			input: map[string]interface{}{
				"normal": 1.0,
				"nan":    math.NaN(),
				"inf":    math.Inf(1),
			},
			expected: map[string]interface{}{
				"normal": 1.0,
				"nan":    "NaN",
				"inf":    "Inf",
			},
		},
		{
			name: "nested structure",
			input: map[string]interface{}{
				"values": []interface{}{
					map[string]interface{}{
						"score": math.NaN(),
						"count": 10,
					},
				},
			},
			expected: map[string]interface{}{
				"values": []interface{}{
					map[string]interface{}{
						"score": "NaN",
						"count": 10,
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizeValue(tt.input)

			// For complex types, marshal to JSON and compare
			gotJSON, _ := json.Marshal(got)
			expectedJSON, _ := json.Marshal(tt.expected)

			if string(gotJSON) != string(expectedJSON) {
				t.Errorf("sanitizeValue() = %v, want %v", string(gotJSON), string(expectedJSON))
			}
		})
	}
}

func TestRawData_MarshalJSON(t *testing.T) {
	str1 := "val1"
	num1 := float64(1.1)

	tests := []struct {
		name     string
		data     RawData
		expected string
	}{
		{
			name: "ValidTimestamp_NoData",
			data: RawData{
				QueryName: "test_query",
				Rows: []*RawRow{
					{
						Timestamp: time.Unix(1717334400, 0).UTC(),
						Data:      map[string]any{},
					},
				},
			},
			expected: `{"nextCursor":"","queryName":"test_query","rows":[{"data":{},"timestamp":"2024-06-02T13:20:00Z"}]}`,
		},
		{
			name: "NoTimestamp_NoData",
			data: RawData{
				QueryName: "test_query",
				Rows: []*RawRow{
					{
						Data: map[string]any{},
					},
				},
			},
			expected: `{"nextCursor":"","queryName":"test_query","rows":[{"data":{}}]}`,
		},
		{
			name: "ZeroTimestamp_NoData",
			data: RawData{
				QueryName: "test_query",
				Rows: []*RawRow{
					{
						Timestamp: time.Time{},
						Data:      map[string]any{},
					},
				},
			},
			expected: `{"nextCursor":"","queryName":"test_query","rows":[{"data":{}}]}`,
		},
		{
			name: "NoTimestamp_WithData",
			data: RawData{
				QueryName: "test_query",
				Rows: []*RawRow{
					{
						Data: map[string]any{
							"value": "val1",
						},
					},
				},
			},
			expected: `{"nextCursor":"","queryName":"test_query","rows":[{"data":{"value":"val1"}}]}`,
		},
		{
			name: "WithTimestamp_WithPointerData",
			data: RawData{
				QueryName: "test_query",
				Rows: []*RawRow{
					{
						Timestamp: time.Unix(1717334400, 0).UTC(),
						Data:      map[string]any{"str1": &str1, "num1": &num1, "num2": nil},
					},
				},
			},
			expected: `{"nextCursor":"","queryName":"test_query","rows":[{"data":{"num1":1.1,"str1":"val1","num2":null},"timestamp":"2024-06-02T13:20:00Z"}]}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := json.Marshal(tt.data)
			assert.NoError(t, err)
			assert.JSONEq(t, tt.expected, string(got))
		})
	}
}
