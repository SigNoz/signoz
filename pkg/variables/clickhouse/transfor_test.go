package clickhouse

import (
	"testing"
)

func TestTransform(t *testing.T) {

	testCases := []struct {
		name      string
		sql       string
		variables []VariableValue
		expected  string
	}{
		{
			name: "Example 1: Only service_name is __all__",
			sql: `SELECT trace_id, name, kind, status 
FROM signoz_traces.signoz_index_v3
WHERE service_name = $service_name
  AND operation_name IN ($operation_names)
  AND duration >= $min_duration
  AND attributes['http.method'] = $http_method
  AND op IN (SELECT op FROM signoz_traces.operations WHERE service_name = $service_name AND kind = 'server')
  AND timestamp BETWEEN $start_time AND $end_time`,

			// Define our variables and their values/metadata
			variables: []VariableValue{
				{
					Name:        "service_name",
					Values:      []string{"__all__"}, // User selected "__all__"
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "operation_names",
					Values:      []string{"op1", "op2", "op3"},
					IsSelectAll: false, // User selected specific values
					FieldType:   "array",
				},
				{
					Name:        "min_duration",
					Values:      []string{"100"},
					IsSelectAll: false,
					FieldType:   "scalar",
				},
				{
					Name:        "http_method",
					Values:      []string{"GET", "POST"},
					IsSelectAll: false,
					FieldType:   "map", // This is a map lookup
				},
				{
					Name:        "start_time",
					Values:      []string{"2023-01-01 00:00:00"},
					IsSelectAll: false,
					FieldType:   "scalar",
				},
				{
					Name:        "end_time",
					Values:      []string{"2023-01-02 00:00:00"},
					IsSelectAll: false,
					FieldType:   "scalar",
				},
			},
			expected: `SELECT trace_id, name, kind, status FROM signoz_traces.signoz_index_v3 WHERE operation_name IN ($operation_names) AND duration >= $min_duration AND attributes['http.method'] = $http_method AND op IN (SELECT op FROM signoz_traces.operations WHERE kind = 'server') AND timestamp BETWEEN $start_time AND $end_time;`,
		},
		{
			name: "Example 2: Multiple __all__ selections and map lookups",
			sql: `SELECT trace_id, name, kind, status 
FROM signoz_traces.signoz_index_v3
WHERE service_name = $service_name
  AND operation_name IN ($operation_names)
  AND duration >= $min_duration
  AND attributes['http.method'] = $http_method
  AND op IN (SELECT op FROM signoz_traces.operations WHERE service_name = $service_name AND kind = 'server')
  AND timestamp BETWEEN $start_time AND $end_time`,

			variables: []VariableValue{
				{
					Name:        "service_name",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "operation_names",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "array",
				},
				{
					Name:        "min_duration",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "http_method",
					Values:      []string{"GET", "POST"},
					IsSelectAll: false,
					FieldType:   "map",
				},
				{
					Name:        "start_time",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "end_time",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
			},
			expected: `SELECT trace_id, name, kind, status FROM signoz_traces.signoz_index_v3 WHERE attributes['http.method'] = $http_method AND op IN (SELECT op FROM signoz_traces.operations WHERE kind = 'server') AND timestamp BETWEEN $start_time AND $end_time;`,
		},
		{
			name: "Example 3: Multiple __all__ selections and map lookups",
			sql: `SELECT trace_id, name, kind, status 
FROM signoz_traces.signoz_index_v3
WHERE service_name = $service_name 
  AND operation_name IN ($operation_names)
  AND duration >= $min_duration
  AND attributes['http.method'] = $http_method
  AND op IN (SELECT op FROM signoz_traces.operations WHERE service_name = $service_name AND kind = 'server')
  AND timestamp BETWEEN $start_time AND $end_time`,

			variables: []VariableValue{
				{
					Name:        "service_name",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "operation_names",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "array",
				},
				{
					Name:        "min_duration",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "http_method",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "map",
				},
			},
			expected: `SELECT trace_id, name, kind, status FROM signoz_traces.signoz_index_v3 WHERE op IN (SELECT op FROM signoz_traces.operations WHERE kind = 'server') AND timestamp BETWEEN $start_time AND $end_time;`,
		},
		{
			name: "Example 3: Multiple __all__ selections and map lookups",
			sql: `SELECT trace_id, name, kind, status 
FROM signoz_traces.signoz_index_v3
WHERE service_name = {{service_name}} 
  AND operation_name IN {{.operation_names}}
  AND duration >= {{min_duration}}
  AND attributes['http.method'] = $http_method
  AND op IN (SELECT op FROM signoz_traces.operations WHERE service_name = {{service_name}} AND kind = 'server')`,

			variables: []VariableValue{
				{
					Name:        "service_name",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "operation_names",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "array",
				},
				{
					Name:        "min_duration",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "scalar",
				},
				{
					Name:        "http_method",
					Values:      []string{"__all__"},
					IsSelectAll: true,
					FieldType:   "map",
				},
			},
			expected: `SELECT trace_id, name, kind, status FROM signoz_traces.signoz_index_v3 WHERE op IN (SELECT op FROM signoz_traces.operations WHERE kind = 'server');`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			transformer := NewQueryTransformer(testCase.sql, testCase.variables)
			modifiedQuery, err := transformer.Transform()
			if err != nil {
				t.Fatalf("Error transforming query: %v", err)
			}

			if modifiedQuery != testCase.expected {
				t.Errorf("Expected transformed query to be:\n%s\nBut got:\n%s", testCase.expected, modifiedQuery)
			}
		})
	}
}
