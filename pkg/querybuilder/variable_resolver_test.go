package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestVariableResolver_IsVariableReference(t *testing.T) {
	r := NewVariableResolver(nil)

	tests := []struct {
		name    string
		value   string
		isVar   bool
		varName string
	}{
		{
			name:    "double curly with dot",
			value:   "{{.myVar}}",
			isVar:   true,
			varName: "myVar",
		},
		{
			name:    "double curly without dot",
			value:   "{{myVar}}",
			isVar:   true,
			varName: "myVar",
		},
		{
			name:    "double square with dot",
			value:   "[[.myVar]]",
			isVar:   true,
			varName: "myVar",
		},
		{
			name:    "double square without dot",
			value:   "[[myVar]]",
			isVar:   true,
			varName: "myVar",
		},
		{
			name:    "dollar sign",
			value:   "$myVar",
			isVar:   true,
			varName: "myVar",
		},
		{
			name:    "not a variable",
			value:   "myVar",
			isVar:   false,
			varName: "",
		},
		{
			name:    "partial match",
			value:   "prefix{{myVar}}suffix",
			isVar:   false,
			varName: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isVar, varName := r.IsVariableReference(tt.value)
			assert.Equal(t, tt.isVar, isVar)
			assert.Equal(t, tt.varName, varName)
		})
	}
}

func TestVariableResolver_ResolveVariable(t *testing.T) {
	variables := map[string]qbtypes.VariableItem{
		"service": {
			Type:  qbtypes.QueryVariableType,
			Value: "payment-service",
		},
		"status": {
			Type:  qbtypes.CustomVariableType,
			Value: []string{"200", "201"},
		},
		"env": {
			Type:  qbtypes.TextBoxVariableType,
			Value: "production",
		},
		"all_services": {
			Type:  qbtypes.DynamicVariableType,
			Value: "__all__",
		},
		"all_array": {
			Type:  qbtypes.DynamicVariableType,
			Value: []string{"__all__"},
		},
	}

	r := NewVariableResolver(variables)

	tests := []struct {
		name      string
		varName   string
		wantValue any
		wantSkip  bool
		wantErr   bool
	}{
		{
			name:      "query variable",
			varName:   "service",
			wantValue: "payment-service",
			wantSkip:  false,
			wantErr:   false,
		},
		{
			name:      "custom variable array",
			varName:   "status",
			wantValue: []string{"200", "201"},
			wantSkip:  false,
			wantErr:   false,
		},
		{
			name:      "textbox variable",
			varName:   "env",
			wantValue: "production",
			wantSkip:  false,
			wantErr:   false,
		},
		{
			name:      "dynamic variable with __all__",
			varName:   "all_services",
			wantValue: nil,
			wantSkip:  true,
			wantErr:   false,
		},
		{
			name:      "dynamic variable with __all__ in array",
			varName:   "all_array",
			wantValue: nil,
			wantSkip:  true,
			wantErr:   false,
		},
		{
			name:      "non-existent variable",
			varName:   "unknown",
			wantValue: nil,
			wantSkip:  false,
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			value, skipFilter, err := r.ResolveVariable(tt.varName)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantValue, value)
				assert.Equal(t, tt.wantSkip, skipFilter)
			}
		})
	}
}

func TestVariableResolver_ResolveFilterExpression(t *testing.T) {
	variables := map[string]qbtypes.VariableItem{
		"service": {
			Type:  qbtypes.QueryVariableType,
			Value: "payment-service",
		},
		"status": {
			Type:  qbtypes.CustomVariableType,
			Value: []string{"200", "201"},
		},
		"env": {
			Type:  qbtypes.TextBoxVariableType,
			Value: "production",
		},
		"all": {
			Type:  qbtypes.DynamicVariableType,
			Value: "__all__",
		},
	}

	r := NewVariableResolver(variables)

	tests := []struct {
		name           string
		expression     string
		wantExpression string
		wantSkip       bool
		wantErr        bool
	}{
		{
			name:           "simple variable reference",
			expression:     "{{service}}",
			wantExpression: "'payment-service'",
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "expression with variable",
			expression:     `service.name = "{{service}}"`,
			wantExpression: `service.name = "'payment-service'"`,
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "expression with array variable",
			expression:     "status_code IN {{status}}",
			wantExpression: `status_code IN ['200', '201']`,
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "multiple variables",
			expression:     `service.name = "{{service}}" AND environment = "{{env}}"`,
			wantExpression: `service.name = "'payment-service'" AND environment = "'production'"`,
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "dollar variable syntax",
			expression:     `service.name = "$service"`,
			wantExpression: `service.name = "'payment-service'"`,
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "double square brackets",
			expression:     `service.name = "[[service]]"`,
			wantExpression: `service.name = "'payment-service'"`,
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "__all__ variable should skip filter",
			expression:     "service.name = {{all}}",
			wantExpression: "",
			wantSkip:       true,
			wantErr:        false,
		},
		{
			name:           "expression with unknown variable",
			expression:     "service.name = {{unknown}}",
			wantExpression: "service.name = {{unknown}}", // unchanged
			wantSkip:       false,
			wantErr:        false,
		},
		{
			name:           "no variables",
			expression:     "service.name = 'static-value'",
			wantExpression: "service.name = 'static-value'",
			wantSkip:       false,
			wantErr:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resolved, skipFilter, err := r.ResolveFilterExpression(tt.expression)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantExpression, resolved)
				assert.Equal(t, tt.wantSkip, skipFilter)
			}
		})
	}
}

func TestFormatValue(t *testing.T) {
	tests := []struct {
		name  string
		value any
		want  string
	}{
		{
			name:  "string value",
			value: "test",
			want:  "'test'",
		},
		{
			name:  "string with quotes",
			value: "test's value",
			want:  "'test''s value'",
		},
		{
			name:  "string array",
			value: []string{"a", "b", "c"},
			want:  "['a', 'b', 'c']",
		},
		{
			name:  "interface array",
			value: []any{"a", 123, "c"},
			want:  "['a', 123, 'c']",
		},
		{
			name:  "number",
			value: 123,
			want:  "123",
		},
		{
			name:  "boolean",
			value: true,
			want:  "true",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatValue(tt.value)
			assert.Equal(t, tt.want, got)
		})
	}
}
