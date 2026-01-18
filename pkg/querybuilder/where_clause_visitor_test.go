package querybuilder

import (
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

// testFieldKey returns a mock TelemetryFieldKey for the given name
func testFieldKey(name string) *telemetrytypes.TelemetryFieldKey {
	return &telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
}

// TestInterpolateVariablesInString tests the embedded variable interpolation feature (GitHub issue #10008)
func TestInterpolateVariablesInString(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		variables map[string]qbtypes.VariableItem
		expected  string
	}{
		{
			name:  "pure variable reference - not interpolated",
			input: "$service",
			variables: map[string]qbtypes.VariableItem{
				"service": {Value: "auth-service"},
			},
			expected: "$service", // Pure variables are handled by existing code
		},
		{
			name:  "variable composed with suffix",
			input: "$environment-xyz",
			variables: map[string]qbtypes.VariableItem{
				"environment": {Value: "prod"},
			},
			expected: "prod-xyz",
		},
		{
			name:  "variable in quoted string with suffix",
			input: "$env-cluster",
			variables: map[string]qbtypes.VariableItem{
				"env": {Value: "staging"},
			},
			expected: "staging-cluster",
		},
		{
			name:  "variable with prefix and suffix",
			input: "prefix-$var-suffix",
			variables: map[string]qbtypes.VariableItem{
				"var": {Value: "middle"},
			},
			expected: "prefix-middle-suffix",
		},
		{
			name:  "multiple variables in one string",
			input: "$region-$env-cluster",
			variables: map[string]qbtypes.VariableItem{
				"region": {Value: "us-west"},
				"env":    {Value: "prod"},
			},
			expected: "us-west-prod-cluster",
		},
		{
			name:  "similar variable names - longer matches first",
			input: "$env-$environment",
			variables: map[string]qbtypes.VariableItem{
				"env":         {Value: "dev"},
				"environment": {Value: "production"},
			},
			expected: "dev-production",
		},
		{
			name:      "unknown variable - preserved as-is",
			input:     "$unknown-suffix",
			variables: map[string]qbtypes.VariableItem{},
			expected:  "$unknown-suffix",
		},
		{
			name:  "variable with underscore",
			input: "$my_var-test",
			variables: map[string]qbtypes.VariableItem{
				"my_var": {Value: "hello"},
			},
			expected: "hello-test",
		},
		{
			name:  "__all__ value returns skip marker",
			input: "$env-suffix",
			variables: map[string]qbtypes.VariableItem{
				"env": {
					Type:  qbtypes.DynamicVariableType,
					Value: "__all__",
				},
			},
			expected: specialSkipConditionMarker,
		},
		{
			name:  "multi-select takes first value",
			input: "$env-suffix",
			variables: map[string]qbtypes.VariableItem{
				"env": {Value: []any{"prod", "staging", "dev"}},
			},
			expected: "prod-suffix",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			visitor := &filterExpressionVisitor{
				variables: tt.variables,
			}
			result := visitor.interpolateVariablesInString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestPrepareWhereClause_EmptyVariableList ensures PrepareWhereClause errors when a variable has an empty list value
func TestPrepareWhereClause_EmptyVariableList(t *testing.T) {
	tests := []struct {
		name        string
		expr        string
		variables   map[string]qbtypes.VariableItem
		expectError bool
		wantInError string
	}{
		{
			name: "Empty []any for equality",
			expr: "service = $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {Value: []any{}},
			},
			expectError: true,
			wantInError: "Found 1 errors while parsing the search expression",
		},
		{
			name: "Empty []any for IN clause",
			expr: "service IN $service",
			variables: map[string]qbtypes.VariableItem{
				"service": {Value: []any{}},
			},
			expectError: true,
			wantInError: "Found 1 errors while parsing the search expression",
		},
	}

	keys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"service": {testFieldKey("service")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts := FilterExprVisitorOpts{
				FieldKeys: keys,
				Variables: tt.variables,
			}

			_, err := PrepareWhereClause(tt.expr, opts, 0, 0)

			if tt.expectError {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if tt.wantInError != "" && !strings.Contains(err.Error(), tt.wantInError) {
					t.Fatalf("expected error to contain %q, got %q", tt.wantInError, err.Error())
				}
			} else if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
