package querybuilder

import (
	"log/slog"
	"strings"
	"testing"

	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

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
		"service": []*telemetrytypes.TelemetryFieldKey{
			{
				Name:          "service",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}},
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

// createTestVisitor creates a filterExpressionVisitor for testing VisitKey
func createTestVisitor(fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey, ignoreNotFoundKeys bool) *filterExpressionVisitor {
	return &filterExpressionVisitor{
		logger:             slog.Default(),
		fieldKeys:          fieldKeys,
		ignoreNotFoundKeys: ignoreNotFoundKeys,
		keysWithWarnings:   make(map[string]bool),
		builder:            sqlbuilder.NewSelectBuilder(),
	}
}

// parseKeyContext parses a key string and returns the KeyContext for testing
func parseKeyContext(keyText string) *grammar.KeyContext {
	input := antlr.NewInputStream(keyText + " = 1") // Add minimal expression to parse key
	lexer := grammar.NewFilterQueryLexer(input)
	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := grammar.NewFilterQueryParser(tokens)
	tree := parser.Query()

	// Navigate to the key context
	if tree.Expression() != nil {
		if orExpr := tree.Expression().OrExpression(); orExpr != nil {
			if andExprs := orExpr.AllAndExpression(); len(andExprs) > 0 {
				if unaryExprs := andExprs[0].AllUnaryExpression(); len(unaryExprs) > 0 {
					if primary := unaryExprs[0].Primary(); primary != nil {
						if comparison := primary.Comparison(); comparison != nil {
							if keyCtx, ok := comparison.Key().(*grammar.KeyContext); ok {
								return keyCtx
							}
						}
					}
				}
			}
		}
	}
	return nil
}

// TestVisitKey tests the VisitKey method of filterExpressionVisitor
func TestVisitKey(t *testing.T) {
	tests := []struct {
		name               string
		keyText            string
		fieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
		ignoreNotFoundKeys bool
		expectedKeys       []telemetrytypes.TelemetryFieldKey
		expectedErrors     []string
		expectedMainErrURL string
		expectedWarnings   []string
		expectedMainWrnURL string
	}{
		// Basic key lookup tests
		{
			name:    "Simple key found",
			keyText: "service",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service": {
					{
						Name:          "service",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "service",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Key not found",
			keyText: "unknown_key",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service": []*telemetrytypes.TelemetryFieldKey{
					{
						Name:          "service",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys:       []telemetrytypes.TelemetryFieldKey{},
			expectedErrors:     []string{"key `unknown_key` not found"},
			expectedMainErrURL: "https://signoz.io/docs/userguide/search-troubleshooting/#key-fieldname-not-found",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Multiple keys with same name different contexts",
			keyText: "service.name",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "service.name",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "service.name",
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   []string{"ambiguous"},
			expectedMainWrnURL: "https://signoz.io/docs/userguide/field-context-data-types/",
		},
		// Context prefixed keys tests
		{
			name:    "Attribute prefixed key",
			keyText: "attribute.user_id",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"user_id": {
					{
						Name:          "user_id",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "user_id",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Resource prefixed key",
			keyText: "resource.service.name",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {
					{
						Name:          "service.name",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "service.name",
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Attribute prefix filters to attribute context only",
			keyText: "attribute.host",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"host": {
					{
						Name:          "host",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "host",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "host",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		// Data type suffix tests
		{
			name:    "String type suffix",
			keyText: "status:string",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"status": {
					{
						Name:          "status",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "status",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeInt64,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "status",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Number type suffix (int64 maps to Number)",
			keyText: "count:int64",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"count": {
					{
						Name:          "count",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeNumber,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "count",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeNumber,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		// IgnoreNotFoundKeys tests
		{
			name:    "Unknown key with ignoreNotFoundKeys=false",
			keyText: "unknown_key",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service": []*telemetrytypes.TelemetryFieldKey{
					{
						Name:          "service",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			ignoreNotFoundKeys: false,
			expectedKeys:       []telemetrytypes.TelemetryFieldKey{},
			expectedErrors:     []string{"key `unknown_key` not found"},
			expectedMainErrURL: "https://signoz.io/docs/userguide/search-troubleshooting/#key-fieldname-not-found",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "Unknown key with ignoreNotFoundKeys=true",
			keyText: "unknown_key",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service": []*telemetrytypes.TelemetryFieldKey{
					{
						Name:          "service",
						Signal:        telemetrytypes.SignalLogs,
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			ignoreNotFoundKeys: true,
			expectedKeys:       []telemetrytypes.TelemetryFieldKey{},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		// Ambiguous keys tests
		{
			name:    "Ambiguous key with resource and attribute",
			keyText: "host",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"host": {
					{
						Name:          "host",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "host",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "host",
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   []string{"ambiguous"},
			expectedMainWrnURL: "https://signoz.io/docs/userguide/field-context-data-types/",
		},
		{
			name:    "Ambiguous key with different data types",
			keyText: "status_ambiguous",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"status_ambiguous": {
					{
						Name:          "status_ambiguous",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "status_ambiguous",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeInt64,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "status_ambiguous",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				{
					Name:          "status_ambiguous",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeInt64,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   []string{"ambiguous"},
			expectedMainWrnURL: "https://signoz.io/docs/userguide/field-context-data-types/",
		},
		// These 3 unit tests have both attibute.custom_field and custom_field in the map
		{
			name:    "only custom_field is selected",
			keyText: "custom_field",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"attribute.custom_field": {
					{
						Name:          "attribute.custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"custom_field": {
					{
						Name:          "custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "custom_field",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
				{
			name:    "only attribute.custom_field is selected",
			keyText: "attribute.attribute.custom_field",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"attribute.custom_field": {
					{
						Name:          "attribute.custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"custom_field": {
					{
						Name:          "custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "attribute.custom_field",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   nil,
			expectedMainWrnURL: "",
		},
		{
			name:    "both custom_field and attribute.custom_field are selected",
			keyText: "attribute.custom_field",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"attribute.custom_field": {
					{
						Name:          "attribute.custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
				"custom_field": {
					{
						Name:          "custom_field",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "attribute.custom_field",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
				{
					Name:          "custom_field",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   []string{"ambiguous"},
			expectedMainWrnURL: "https://signoz.io/docs/userguide/field-context-data-types/",
		},
		// Resource attribute ambiguity - resource context is preferred
		{
			name:    "Resource context preferred over attribute for ambiguous key",
			keyText: "deployment.environment",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"deployment.environment": {
					{
						Name:          "deployment.environment",
						FieldContext:  telemetrytypes.FieldContextResource,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
					{
						Name:          "deployment.environment",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedKeys: []telemetrytypes.TelemetryFieldKey{
				{
					Name:          "deployment.environment",
					FieldContext:  telemetrytypes.FieldContextResource,
					FieldDataType: telemetrytypes.FieldDataTypeString,
				},
			},
			expectedErrors:     nil,
			expectedMainErrURL: "",
			expectedWarnings:   []string{"ambiguous", "attribute.deployment.environment"},
			expectedMainWrnURL: "https://signoz.io/docs/userguide/field-context-data-types/",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			visitor := createTestVisitor(tt.fieldKeys, tt.ignoreNotFoundKeys)
			keyCtx := parseKeyContext(tt.keyText)

			if keyCtx == nil {
				t.Fatalf("failed to parse key context for %q", tt.keyText)
			}

			result := visitor.VisitKey(keyCtx)
			keys, ok := result.([]*telemetrytypes.TelemetryFieldKey)

			if !ok {
				t.Fatalf("expected []*TelemetryFieldKey, got %T", result)
			}

			// Check expected keys count
			if len(keys) != len(tt.expectedKeys) {
				t.Errorf("expected %d keys, got %d", len(tt.expectedKeys), len(keys))
			}

			// Check each expected key matches name, field context, and data type
			for _, expectedKey := range tt.expectedKeys {
				found := false
				for _, key := range keys {
					if key.Name == expectedKey.Name &&
						key.FieldContext == expectedKey.FieldContext &&
						key.FieldDataType == expectedKey.FieldDataType {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("expected key {Name: %q, FieldContext: %v, FieldDataType: %v} not found in results: %v",
						expectedKey.Name, expectedKey.FieldContext, expectedKey.FieldDataType, keys)
				}
			}

			// Check errors
			if tt.expectedErrors != nil {
				if len(visitor.errors) != len(tt.expectedErrors) {
					t.Errorf("expected %d errors, got %d: %v", len(tt.expectedErrors), len(visitor.errors), visitor.errors)
				}
				for _, expectedError := range tt.expectedErrors {
					found := false
					for _, err := range visitor.errors {
						if strings.Contains(err, expectedError) {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("expected error containing %q, got errors: %v", expectedError, visitor.errors)
					}
				}
			} else {
				if len(visitor.errors) != 0 {
					t.Errorf("expected no errors, got %d: %v", len(visitor.errors), visitor.errors)
				}
			}

			// Check mainErrorURL
			if visitor.mainErrorURL != tt.expectedMainErrURL {
				t.Errorf("expected mainErrorURL %q, got %q", tt.expectedMainErrURL, visitor.mainErrorURL)
			}

			// Check warnings
			if tt.expectedWarnings != nil {
				for _, expectedWarn := range tt.expectedWarnings {
					found := false
					for _, warn := range visitor.warnings {
						if strings.Contains(strings.ToLower(warn), strings.ToLower(expectedWarn)) {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("expected warning containing %q, got warnings: %v", expectedWarn, visitor.warnings)
					}
				}
			} else {
				if len(visitor.warnings) != 0 {
					t.Errorf("expected no warnings, got %d: %v", len(visitor.warnings), visitor.warnings)
				}
			}

			// Check mainWarnURL
			if visitor.mainWarnURL != tt.expectedMainWrnURL {
				t.Errorf("expected mainWarnURL %q, got %q", tt.expectedMainWrnURL, visitor.mainWarnURL)
			}
		})
	}
}
