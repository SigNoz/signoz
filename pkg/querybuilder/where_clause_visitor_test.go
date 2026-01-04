package querybuilder

import (
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
