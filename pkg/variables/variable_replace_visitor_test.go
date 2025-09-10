package variables

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestReplaceVariablesInExpression(t *testing.T) {
	tests := []struct {
		name       string
		expression string
		variables  map[string]qbtypes.VariableItem
		expected   string
		wantErr    bool
	}{
		{
			name:       "simple string variable replacement",
			expression: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "simple bool check",
			expression: "has_error = true",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
			},
			expected: "has_error = true",
		},
		{
			name:       "variable inside quotes",
			expression: "service.name ='$service'",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "IN clause with variable inside quotes",
			expression: "service.name IN '$service'",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: []string{"auth-service"},
				},
			},
			expected: "service.name IN ['auth-service']",
		},
		{
			name:       "simple string variable replacement",
			expression: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.QueryVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "simple string variable replacement",
			expression: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.CustomVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "simple string variable replacement",
			expression: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.TextBoxVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "variable with dollar sign prefix in map",
			expression: "service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"$service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
			},
			expected: "service.name = 'auth-service'",
		},
		{
			name:       "numeric variable replacement",
			expression: "http.status_code > $threshold",
			variables: map[string]qbtypes.VariableItem{
				"threshold": {
					Type:  qbtypes.DynamicVariableType,
					Value: 400,
				},
			},
			expected: "http.status_code > 400",
		},
		{
			name:       "boolean variable replacement",
			expression: "is_error = $error_flag",
			variables: map[string]qbtypes.VariableItem{
				"error_flag": {
					Type:  qbtypes.DynamicVariableType,
					Value: true,
				},
			},
			expected: "is_error = true",
		},
		{
			name:       "array variable in IN clause",
			expression: "service.name IN $services",
			variables: map[string]qbtypes.VariableItem{
				"services": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"auth", "api", "web"},
				},
			},
			expected: "service.name IN ['auth', 'api', 'web']",
		},
		{
			name:       "array variable with mixed types",
			expression: "id IN $ids",
			variables: map[string]qbtypes.VariableItem{
				"ids": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{1, 2, "three", 4.5},
				},
			},
			expected: "id IN [1, 2, 'three', 4.5]",
		},
		{
			name:       "multiple variables in expression",
			expression: "service.name = $service AND env = $environment AND status_code >= $min_code",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth-service",
				},
				"environment": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
				"min_code": {
					Type:  qbtypes.DynamicVariableType,
					Value: 400,
				},
			},
			expected: "service.name = 'auth-service' AND env = 'production' AND status_code >= 400",
		},
		{
			name:       "variable in complex expression with parentheses",
			expression: "(service.name = $service OR service.name = 'default') AND status_code > $threshold",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "auth",
				},
				"threshold": {
					Type:  qbtypes.DynamicVariableType,
					Value: 200,
				},
			},
			expected: "(service.name = 'auth' OR service.name = 'default') AND status_code > 200",
		},
		{
			name:       "variable not found - preserved as is",
			expression: "service.name = $unknown_service",
			variables:  map[string]qbtypes.VariableItem{},
			expected:   "service.name = $unknown_service",
		},
		{
			name:       "string with quotes needs escaping",
			expression: "message = $msg",
			variables: map[string]qbtypes.VariableItem{
				"msg": {
					Type:  qbtypes.DynamicVariableType,
					Value: "user's request",
				},
			},
			expected: "message = 'user\\'s request'",
		},
		{
			name:       "dynamic variable with __all__ value",
			expression: "service.name = $all_services",
			variables: map[string]qbtypes.VariableItem{
				"all_services": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected: "", // Special value preserved
		},
		{
			name:       "variable in NOT IN clause",
			expression: "service.name NOT IN $excluded",
			variables: map[string]qbtypes.VariableItem{
				"excluded": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"test", "debug"},
				},
			},
			expected: "service.name NOT IN ['test', 'debug']",
		},
		{
			name:       "variable in BETWEEN clause",
			expression: "latency BETWEEN $min AND $max",
			variables: map[string]qbtypes.VariableItem{
				"min": {
					Type:  qbtypes.DynamicVariableType,
					Value: 100,
				},
				"max": {
					Type:  qbtypes.DynamicVariableType,
					Value: 500,
				},
			},
			expected: "latency BETWEEN 100 AND 500",
		},
		{
			name:       "variable in LIKE expression",
			expression: "service.name LIKE $pattern",
			variables: map[string]qbtypes.VariableItem{
				"pattern": {
					Type:  qbtypes.DynamicVariableType,
					Value: "%auth%",
				},
			},
			expected: "service.name LIKE '%auth%'",
		},
		{
			name:       "variable in function call",
			expression: "has(tags, $tag)",
			variables: map[string]qbtypes.VariableItem{
				"tag": {
					Type:  qbtypes.DynamicVariableType,
					Value: "error",
				},
			},
			expected: "has(tags, 'error')",
		},
		{
			name:       "variable in hasAny function",
			expression: "hasAny(tags, $tags)",
			variables: map[string]qbtypes.VariableItem{
				"tags": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"error", "warning", "info"},
				},
			},
			expected: "hasAny(tags, ['error', 'warning', 'info'])",
		},
		{
			name:       "variable in hasToken function",
			expression: "hasToken(tags, $tags)",
			variables: map[string]qbtypes.VariableItem{
				"tags": {
					Type:  qbtypes.DynamicVariableType,
					Value: "test",
				},
			},
			expected: "hasToken(tags, 'test')",
		},
		{
			name:       "empty array variable",
			expression: "service.name IN $services",
			variables: map[string]qbtypes.VariableItem{
				"services": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{},
				},
			},
			expected: "service.name IN []",
		},
		{
			name:       "expression with OR and variables",
			expression: "env = $env1 OR env = $env2",
			variables: map[string]qbtypes.VariableItem{
				"env1": {
					Type:  qbtypes.DynamicVariableType,
					Value: "staging",
				},
				"env2": {
					Type:  qbtypes.DynamicVariableType,
					Value: "production",
				},
			},
			expected: "env = 'staging' OR env = 'production'",
		},
		{
			name:       "NOT expression with variable",
			expression: "NOT service.name = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {
					Type:  qbtypes.DynamicVariableType,
					Value: "test-service",
				},
			},
			expected: "NOT service.name = 'test-service'",
		},
		{
			name:       "variable in EXISTS clause",
			expression: "tags EXISTS",
			variables:  map[string]qbtypes.VariableItem{},
			expected:   "tags EXISTS",
		},
		{
			name:       "complex nested expression",
			expression: "(service.name IN $services AND env = $env) OR (status_code >= $error_code)",
			variables: map[string]qbtypes.VariableItem{
				"services": {
					Type:  qbtypes.DynamicVariableType,
					Value: []any{"auth", "api"},
				},
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "prod",
				},
				"error_code": {
					Type:  qbtypes.DynamicVariableType,
					Value: 500,
				},
			},
			expected: "(service.name IN ['auth', 'api'] AND env = 'prod') OR (status_code >= 500)",
		},
		{
			name:       "float variable",
			expression: "cpu_usage > $threshold",
			variables: map[string]qbtypes.VariableItem{
				"threshold": {
					Type:  qbtypes.DynamicVariableType,
					Value: 85.5,
				},
			},
			expected: "cpu_usage > 85.5",
		},
		{
			name:       "variable in REGEXP expression",
			expression: "message REGEXP $pattern",
			variables: map[string]qbtypes.VariableItem{
				"pattern": {
					Type:  qbtypes.DynamicVariableType,
					Value: "^ERROR.*",
				},
			},
			expected: "message REGEXP '^ERROR.*'",
		},
		{
			name:       "variable in NOT REGEXP expression",
			expression: "message NOT REGEXP $pattern",
			variables: map[string]qbtypes.VariableItem{
				"pattern": {
					Type:  qbtypes.DynamicVariableType,
					Value: "^DEBUG.*",
				},
			},
			expected: "message NOT REGEXP '^DEBUG.*'",
		},
		{
			name:       "invalid syntax",
			expression: "service.name = = $service",
			variables:  map[string]qbtypes.VariableItem{},
			wantErr:    true,
		},
		{
			name:       "full text search not affected by variables",
			expression: "'error message'",
			variables:  map[string]qbtypes.VariableItem{},
			expected:   "'error message'",
		},
		{
			name:       "comparison operators",
			expression: "a < $v1 AND b <= $v2 AND c > $v3 AND d >= $v4 AND e != $v5 AND f <> $v6",
			variables: map[string]qbtypes.VariableItem{
				"v1": {Type: qbtypes.DynamicVariableType, Value: 10},
				"v2": {Type: qbtypes.DynamicVariableType, Value: 20},
				"v3": {Type: qbtypes.DynamicVariableType, Value: 30},
				"v4": {Type: qbtypes.DynamicVariableType, Value: 40},
				"v5": {Type: qbtypes.DynamicVariableType, Value: "test"},
				"v6": {Type: qbtypes.DynamicVariableType, Value: "other"},
			},
			expected: "a < 10 AND b <= 20 AND c > 30 AND d >= 40 AND e != 'test' AND f <> 'other'",
		},
		{
			name:       "CONTAINS operator with variable",
			expression: "message CONTAINS $text",
			variables: map[string]qbtypes.VariableItem{
				"text": {
					Type:  qbtypes.DynamicVariableType,
					Value: "error",
				},
			},
			expected: "message CONTAINS 'error'",
		},
		{
			name:       "NOT CONTAINS operator with variable",
			expression: "message NOT CONTAINS $text",
			variables: map[string]qbtypes.VariableItem{
				"text": {
					Type:  qbtypes.DynamicVariableType,
					Value: "debug",
				},
			},
			expected: "message NOT CONTAINS 'debug'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ReplaceVariablesInExpression(tt.expression, tt.variables)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFormatVariableValue(t *testing.T) {
	visitor := &variableReplacementVisitor{}

	tests := []struct {
		name     string
		value    any
		expected string
	}{
		{
			name:     "string value",
			value:    "hello",
			expected: "'hello'",
		},
		{
			name:     "string with single quote",
			value:    "user's data",
			expected: "'user\\'s data'",
		},
		{
			name:     "integer value",
			value:    42,
			expected: "42",
		},
		{
			name:     "float value",
			value:    3.14,
			expected: "3.14",
		},
		{
			name:     "boolean true",
			value:    true,
			expected: "true",
		},
		{
			name:     "boolean false",
			value:    false,
			expected: "false",
		},
		{
			name:     "array of strings",
			value:    []any{"a", "b", "c"},
			expected: "['a', 'b', 'c']",
		},
		{
			name:     "array of mixed types",
			value:    []any{"string", 123, true, 45.6},
			expected: "['string', 123, true, 45.6]",
		},
		{
			name:     "empty array",
			value:    []any{},
			expected: "[]",
		},
		{
			name:     "nil value",
			value:    nil,
			expected: "<nil>",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := visitor.formatVariableValue(tt.value)
			assert.Equal(t, tt.expected, result)
		})
	}
}
