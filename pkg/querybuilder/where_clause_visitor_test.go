package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
)

// TestPrepareWhereClause_EmptyVariableList ensures PrepareWhereClause errors when a variable has an empty list value.
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
		"service": {
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
				Context:   context.Background(),
				FieldKeys: keys,
				Variables: tt.variables,
			}

			_, err := PrepareWhereClause(tt.expr, opts)

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

// createTestVisitor creates a filterExpressionVisitor for testing VisitKey.
func createTestVisitor(fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey, ignoreNotFoundKeys bool) *filterExpressionVisitor {
	return &filterExpressionVisitor{
		logger:             slog.Default(),
		fieldKeys:          fieldKeys,
		ignoreNotFoundKeys: ignoreNotFoundKeys,
		keysWithWarnings:   make(map[string]bool),
		builder:            sqlbuilder.NewSelectBuilder(),
	}
}

// parseKeyContext parses a key string and returns the KeyContext for testing.
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

// TestVisitKey tests the VisitKey method of filterExpressionVisitor.
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

// ---------------------------------------------------------------------------
// TestVisitComparison
// ---------------------------------------------------------------------------
//
// This suite exercises the visitor with two different configurations
// side-by-side for each expression, asserting both expected outputs:
//
//   resourceConditionBuilder (wantRSB) — returns TrueConditionLiteral for
//   non-resource keys and "{name}_cond" for resource keys (x, y, z).
//   Opts: SkipFullTextFilter:true, SkipFunctionCalls:true, IgnoreNotFoundKeys:true.
//
//   conditionBuilder (wantSB) — returns "{name}_cond" for every key regardless
//   of FieldContext. Opts: SkipFullTextFilter:false, SkipFunctionCalls:false,
//   IgnoreNotFoundKeys:false, FullTextColumn:bodyCol.
//
// Key behavioral rules:
//
//   resourceConditionBuilder:
//     attr key (a,b,c)          → SkipConditionLiteral (no resource match)
//     resource key (x,y,z)      → "{name}_cond"
//     full-text / function call → SkipConditionLiteral (skipped)
//     unknown key               → SkipConditionLiteral (ignored; IgnoreNotFoundKeys=true)
//
//   conditionBuilder:
//     any key (a,b,c,x,y,z)    → "{name}_cond"
//     full-text ('hello')       → "body_cond"  (bodyCol.Name="body")
//     function call (non-body)  → error (only body JSON search supported)
//     unknown key               → error (IgnoreNotFoundKeys=false)
//
//   __all__ variable (IN/NOT IN $service where service="__all__"):
//     → SkipConditionLiteral in both configurations
//     (PrepareWhereClause converts the final SkipConditionLiteral to TrueConditionLiteral)
//
//   SkipConditionLiteral propagation rules (both configs):
//     • In AND: filtered out as no-op; if ALL branches are SkipConditionLiteral
//               → AND returns SkipConditionLiteral which propagates upward
//     • In OR:  short-circuits the entire OR immediately (returns SkipConditionLiteral)
//     • NOT(SkipConditionLiteral) → SkipConditionLiteral (guard in VisitUnaryExpression)
//     • PrepareWhereClause converts a top-level SkipConditionLiteral to nil
//
// Test cases with wantErrSB=true use PrepareWhereClause directly to verify
// that SB returns an error (instead of calling buildSQLOpts which fatalf's).

// "a", "b", "c" are attribute-context fields; "x", "y", "z" are resource-context field.
var visitTestKeys = map[string][]*telemetrytypes.TelemetryFieldKey{
	"a": {{Name: "a", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"b": {{Name: "b", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"c": {{Name: "c", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"x": {{Name: "x", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"y": {{Name: "y", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"z": {{Name: "z", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"ax": {{Name: "ax", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
		{Name: "ax", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"by": {{Name: "by", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
		{Name: "by", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
	"cz": {{Name: "cz", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
		{Name: "cz", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
}

type resourceConditionBuilder struct{}

func (b *resourceConditionBuilder) ConditionFor(
	_ context.Context,
	_ uint64,
	_ uint64,
	key *telemetrytypes.TelemetryFieldKey,
	_ qbtypes.FilterOperator,
	_ any,
	_ *sqlbuilder.SelectBuilder,
) (string, error) {

	if key.FieldContext != telemetrytypes.FieldContextResource {
		return SkipConditionLiteral, nil
	}

	return fmt.Sprintf("%s_cond", key.Name), nil
}

type conditionBuilder struct{}

func (b *conditionBuilder) ConditionFor(
	_ context.Context,
	_ uint64,
	_ uint64,
	key *telemetrytypes.TelemetryFieldKey,
	_ qbtypes.FilterOperator,
	_ any,
	_ *sqlbuilder.SelectBuilder,
) (string, error) {

	return fmt.Sprintf("%s_cond", key.Name), nil
}

// visitComparisonCase is a single test case for the TestVisitComparison_* family.
// Each case is run under two independent configurations:
//
//   - rsbOpts (resourceConditionBuilder): skips full-text and function calls,
//     ignores unknown keys, produces conditions only for resource-context keys.
//
//   - sbOpts (conditionBuilder): skips resource-context keys (unless OR is present),
//     evaluates full-text, errors on unknown keys.
type visitComparisonCase struct {
	name       string
	expr       string
	wantRSB    string // expected SQL from resourceConditionBuilder
	wantSB     string // expected SQL from conditionBuilder
	wantErrSB  bool   // when true, conditionBuilder is expected to return an error
	wantErrRSB bool   // when true, resourceConditionBuilder is expected to return an error
}

// visitComparisonOpts builds the two FilterExprVisitorOpts shared by all
// TestVisitComparison_* tests.
func visitComparisonOpts() (rsbOpts, sbOpts FilterExprVisitorOpts) {
	allVariable := map[string]qbtypes.VariableItem{
		"service": {
			Type:  qbtypes.DynamicVariableType,
			Value: "__all__",
		},
	}
	// bodyCol is the full-text column; conditionBuilder returns "body_cond" for it.
	bodyCol := &telemetrytypes.TelemetryFieldKey{
		Name:          "body",
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	rsbOpts = FilterExprVisitorOpts{
		FieldKeys:          visitTestKeys,
		ConditionBuilder:   &resourceConditionBuilder{},
		Variables:          allVariable,
		SkipResourceFilter: false,
		SkipFullTextFilter: true,
		SkipFunctionCalls:  true,
		IgnoreNotFoundKeys: true,
	}
	sbOpts = FilterExprVisitorOpts{
		FieldKeys:          visitTestKeys,
		ConditionBuilder:   &conditionBuilder{},
		Variables:          allVariable,
		SkipResourceFilter: true,
		SkipFullTextFilter: false,
		SkipFunctionCalls:  false,
		IgnoreNotFoundKeys: false,
		FullTextColumn:     bodyCol,
	}
	return
}

// TestVisitComparison_AND covers AND expressions with attribute keys (a, b, c →
// TrueConditionLiteral in RSB) and resource keys (x, y, z → "{name}_cond" in RSB).
func TestVisitComparison_AND(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			name:    "single attribute key",
			expr:    "a = 'v'",
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			name:    "single resource key",
			expr:    "x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "",
		},
		{
			// RSB: both attribute keys → true; AND propagates TrueConditionLiteral.
			name:    "two attribute keys AND",
			expr:    "a = 'a' AND b = 'b'",
			wantRSB: "",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			name:    "two resource keys AND",
			expr:    "x = 'x' AND y = 'y'",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "",
		},
		{
			// RSB: attribute → true stripped by AND; resource key survives.
			name:    "attribute AND resource",
			expr:    "a = 'a' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE a_cond",
		},
		{
			// RSB: a, b → true stripped; x_cond remains.
			name:    "three mixed keys AND",
			expr:    "a = 'a' AND b = 'b' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			// RSB: a, b → true stripped; x, y survive.
			name:    "four mixed keys in AND",
			expr:    "a = 'a' AND b = 'b' AND x = 'x' AND y = 'y'",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_NOT covers the NOT operator in two positions:
//   - unary NOT wrapping a comparison: structural NOT emitted by the visitor.
//   - NOT inside a comparison (e.g. NOT LIKE, NOT EXISTS): the inner NOT is folded
//     into the operator token; conditionBuilder ignores it, so no extra NOT is emitted.
func TestVisitComparison_NOT(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			// Unary NOT on an attribute key: NOT(SkipConditionLiteral) → SkipConditionLiteral (guard).
			name:    "NOT attribute key",
			expr:    "NOT a = 'a'",
			wantRSB: "",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			name:    "NOT resource key",
			expr:    "NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "",
		},
		{
			// RSB: NOT(SkipConditionLiteral) → SkipConditionLiteral; stripped from AND; x_cond survives.
			name:    "NOT attribute AND resource",
			expr:    "NOT a = 'a' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// NOT inside comparison (op=NotLike): conditionBuilder ignores it → same as LIKE.
			name:    "NOT inside LIKE comparison",
			expr:    "a NOT LIKE '%a%'",
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			// Unary NOT wrapping LIKE: structural NOT emitted around a_cond.
			name:    "NOT at unary level wrapping LIKE",
			expr:    "NOT a LIKE '%a%'",
			wantRSB: "",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// NOT inside comparison on resource key in OR: no outer NOT, builder ignores inner op.
			name:    "NOT inside LIKE OR resource",
			expr:    "x NOT LIKE '%x%' OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			name:    "NOT at unary level wrapping LIKE OR resource",
			expr:    "NOT x LIKE '%x%' OR y = 'y'",
			wantRSB: "WHERE (NOT (x_cond) OR y_cond)",
			wantSB:  "WHERE (NOT (x_cond) OR y_cond)",
		},
		{
			// RSB: a, b → true stripped; NOT(x_cond) remains.
			name:    "three NOTs in AND",
			expr:    "NOT a = 'a' AND NOT b = 'b' AND NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE (NOT (a_cond) AND NOT (b_cond))",
		},
		{
			// Unary NOT wraps a comparison that itself has NOT (op=NotLike).
			// The inner NOT is an operator token; the outer NOT is structural.
			name:    "unary NOT wrapping comparison NOT LIKE",
			expr:    "NOT (a NOT LIKE '%a%')",
			wantRSB: "",
			wantSB:  "WHERE NOT ((a_cond))",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_OR covers OR expressions. PrepareWhereClause auto-resets
// SkipResourceFilter to false when an OR token is detected in the expression,
// so resource keys become visible in sbOpts for all cases in this suite.
func TestVisitComparison_OR(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			name:    "resource OR resource",
			expr:    "x = 'x' OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			name:    "three resource keys OR",
			expr:    "x = 'x' OR y = 'y' OR z = 'z'",
			wantRSB: "WHERE (x_cond OR y_cond OR z_cond)",
			wantSB:  "WHERE (x_cond OR y_cond OR z_cond)",
		},
		{
			// RSB: attribute → TrueConditionLiteral short-circuits OR.
			name:    "attribute OR resource",
			expr:    "a = 'a' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (a_cond OR x_cond)",
		},
		{
			name:    "AND sub-expression OR resource",
			expr:    "x = 'x' AND y = 'y' OR z = 'z'",
			wantRSB: "WHERE ((x_cond AND y_cond) OR z_cond)",
			wantSB:  "WHERE ((x_cond AND y_cond) OR z_cond)",
		},
		{
			name:    "parenthesized OR AND resource",
			expr:    "(x = 'x' OR y = 'y') AND z = 'z'",
			wantRSB: "WHERE (((x_cond OR y_cond)) AND z_cond)",
			wantSB:  "WHERE (((x_cond OR y_cond)) AND z_cond)",
		},
		{
			name:    "NOT resource OR resource",
			expr:    "NOT x = 'x' OR y = 'y'",
			wantRSB: "WHERE (NOT (x_cond) OR y_cond)",
			wantSB:  "WHERE (NOT (x_cond) OR y_cond)",
		},
		{
			name:    "NOT of parenthesized OR",
			expr:    "NOT (x = 'x' OR y = 'y')",
			wantRSB: "WHERE NOT (((x_cond OR y_cond)))",
			wantSB:  "WHERE NOT (((x_cond OR y_cond)))",
		},
		{
			// RSB: left (a→true, x_cond) → x_cond; right (b→true, y_cond) → y_cond.
			name:    "two mixed AND groups in OR",
			expr:    "a = 'a' AND x = 'x' OR b = 'b' AND y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE ((a_cond AND x_cond) OR (b_cond AND y_cond))",
		},
		{
			// RSB: NOT(a→SkipConditionLiteral) → SkipConditionLiteral → OR short-circuits.
			name:    "NOT attr OR resource with OR override",
			expr:    "NOT a = 'a' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (NOT (a_cond) OR x_cond)",
		},
		{
			// RSB: a → TrueConditionLiteral → OR short-circuits.
			name:    "all attribute keys OR",
			expr:    "a = 'a' OR b = 'b' OR c = 'c'",
			wantRSB: "",
			wantSB:  "WHERE (a_cond OR b_cond OR c_cond)",
		},
		{
			// RSB: a→SkipConditionLiteral → OR short-circuits; paren passes through; NOT(SkipConditionLiteral) → SkipConditionLiteral.
			name:    "NOT of three-way OR",
			expr:    "NOT (a = 'a' OR b = 'b' OR x = 'x')",
			wantRSB: "",
			wantSB:  "WHERE NOT (((a_cond OR b_cond OR x_cond)))",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_Precedence covers AND/OR/NOT operator precedence
// (AND binds tighter than OR; NOT binds tightest).
func TestVisitComparison_Precedence(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			// a→true short-circuits OR.
			name:    "attr OR attr OR resource",
			expr:    "a = 'a' OR b = 'b' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (a_cond OR b_cond OR x_cond)",
		},
		{
			// AND before OR: (a AND b)→true short-circuits OR.
			name:    "attr AND attr OR resource",
			expr:    "a = 'a' AND b = 'b' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE ((a_cond AND b_cond) OR x_cond)",
		},
		{
			// AND tighter: a as own OR branch; (b AND x) as second.
			name:    "attr OR attr AND resource",
			expr:    "a = 'a' OR b = 'b' AND x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (a_cond OR (b_cond AND x_cond))",
		},
		{
			// Left AND group (a,b)→true short-circuits OR.
			name:    "two AND groups OR",
			expr:    "a = 'a' AND b = 'b' OR x = 'x' AND y = 'y'",
			wantRSB: "",
			wantSB:  "WHERE ((a_cond AND b_cond) OR (x_cond AND y_cond))",
		},
		{
			// RSB: NOT(a→SkipConditionLiteral)→SkipConditionLiteral stripped from AND; NOT(x_cond) remains.
			name:    "NOT attr AND NOT resource",
			expr:    "NOT a = 'a' AND NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// RSB: NOT(a→SkipConditionLiteral)→SkipConditionLiteral → OR short-circuits.
			name:    "NOT attr OR NOT resource",
			expr:    "NOT a = 'a' OR NOT x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (NOT (a_cond) OR NOT (x_cond))",
		},
		{
			// Parses as: (NOT a='a') OR (b='b' AND x='x')
			// RSB: NOT(a→SkipConditionLiteral)→SkipConditionLiteral; (SkipConditionLiteral AND x_cond)→x_cond;
			//      SkipConditionLiteral OR x_cond → SkipConditionLiteral short-circuits OR.
			name:    "complex NOT OR AND",
			expr:    "NOT a = 'a' OR b = 'b' AND x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (NOT (a_cond) OR (b_cond AND x_cond))",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_Parens covers parenthesized sub-expressions.
// VisitPrimary adds one extra layer of parens around real conditions;
// TrueConditionLiteral passes through unwrapped.
func TestVisitComparison_Parens(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			// RSB: SkipConditionLiteral passes through unwrapped. SB: VisitPrimary wraps in parens.
			name:    "single attribute key in parens",
			expr:    "(a = 'a')",
			wantRSB: "",
			wantSB:  "WHERE (a_cond)",
		},
		{
			// RSB: a→true stripped; VisitPrimary wraps x_cond → "(x_cond)".
			name:    "AND in parens with mixed keys",
			expr:    "(a = 'a' AND x = 'x')",
			wantRSB: "WHERE (x_cond)",
			wantSB:  "WHERE (a_cond)",
		},
		{
			name:    "NOT of paren-AND with mixed keys",
			expr:    "NOT (a = 'a' AND x = 'x')",
			wantRSB: "WHERE NOT ((x_cond))",
			wantSB:  "WHERE NOT ((a_cond))",
		},
		{
			// RSB: left (a OR b)→true stripped by AND; right (x OR y) survives.
			name:    "two paren-OR groups ANDed",
			expr:    "(a = 'a' OR b = 'b') AND (x = 'x' OR y = 'y')",
			wantRSB: "WHERE ((x_cond OR y_cond))",
			wantSB:  "WHERE (((a_cond OR b_cond)) AND ((x_cond OR y_cond)))",
		},
		{
			// RSB: left (a OR b)→true → OR short-circuits.
			name:    "two paren-OR groups ORed",
			expr:    "(a = 'a' OR b = 'b') OR (x = 'x' OR y = 'y')",
			wantRSB: "",
			wantSB:  "WHERE (((a_cond OR b_cond)) OR ((x_cond OR y_cond)))",
		},
		{
			// RSB: a→true stripped; (b OR x) b→true→short-circuits→true stripped; y_cond survives.
			name:    "paren-OR in middle of three-way AND",
			expr:    "a = 'a' AND (b = 'b' OR x = 'x') AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "WHERE (a_cond AND ((b_cond OR x_cond)) AND y_cond)",
		},
		{
			// Each VisitPrimary(paren) adds one extra "()" layer.
			name:    "deeply nested parentheses",
			expr:    "(((x = 'x')))",
			wantRSB: "WHERE (((x_cond)))",
			wantSB:  "",
		},
		{
			// RSB: inner NOT(a→SkipConditionLiteral)→SkipConditionLiteral; paren passes through;
			//      outer NOT(SkipConditionLiteral)→SkipConditionLiteral.
			// SB: structural parens accumulate around each NOT.
			name:    "double NOT via parens",
			expr:    "NOT (NOT a = 'a')",
			wantRSB: "",
			wantSB:  "WHERE NOT ((NOT (a_cond)))",
		},
		{
			// RSB: all attrs → SkipConditionLiteral filtered from AND → AND returns SkipConditionLiteral;
			//      paren passes through; NOT(SkipConditionLiteral) → SkipConditionLiteral.
			name:    "NOT of parenthesized all-attribute AND",
			expr:    "NOT (a = 'a' AND b = 'b')",
			wantRSB: "",
			wantSB:  "WHERE NOT (((a_cond AND b_cond)))",
		},
		{
			// RSB: a→SkipConditionLiteral short-circuits OR; paren passes through; NOT(SkipConditionLiteral)→SkipConditionLiteral.
			name:    "NOT of parenthesized mixed OR attr short-circuits",
			expr:    "NOT (a = 'a' OR x = 'x')",
			wantRSB: "",
			wantSB:  "WHERE NOT (((a_cond OR x_cond)))",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_FullText covers full-text (bare string literal) expressions.
// rsbOpts has SkipFullTextFilter=true → TrueConditionLiteral.
// sbOpts has SkipFullTextFilter=false, FullTextColumn=bodyCol → "body_cond".
func TestVisitComparison_FullText(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			name:    "standalone full-text term",
			expr:    "'hello'",
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
		{
			// RSB: FT→true, a→true; AND propagates true.
			name:    "full-text AND attribute",
			expr:    "'hello' AND a = 'a'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond AND a_cond)",
		},
		{
			// RSB: FT→true stripped; x_cond survives.
			name:    "full-text AND resource",
			expr:    "'hello' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			// RSB: NOT(FT→SkipConditionLiteral)→SkipConditionLiteral. SB: structural NOT applied.
			name:    "NOT full-text term",
			expr:    "NOT 'hello'",
			wantRSB: "",
			wantSB:  "WHERE NOT (body_cond)",
		},
		{
			// RSB: FT→true short-circuits OR.
			name:    "full-text OR resource",
			expr:    "'hello' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond OR x_cond)",
		},
		{
			name:    "full-text OR attribute",
			expr:    "'hello' OR a = 'a'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond OR a_cond)",
		},
		{
			name:    "two full-text terms ANDed",
			expr:    "'hello' AND 'world'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond AND body_cond)",
		},
		{
			name:    "two full-text terms ORed",
			expr:    "'hello' OR 'world'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond OR body_cond)",
		},
		{
			name:    "full-text in parentheses",
			expr:    "('hello')",
			wantRSB: "",
			wantSB:  "WHERE (body_cond)",
		},
		{
			name:    "two full-text AND attribute",
			expr:    "'hello' AND 'world' AND a = 'a'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond AND body_cond AND a_cond)",
		},
		{
			name:    "full-text OR attr OR resource all types",
			expr:    "'hello' OR a = 'a' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (body_cond OR a_cond OR x_cond)",
		},
		{
			name:    "NOT of paren full-text AND attr",
			expr:    "NOT ('hello' AND a = 'a')",
			wantRSB: "",
			wantSB:  "WHERE NOT (((body_cond AND a_cond)))",
		},
		{
			// RSB: NOT(FT→SkipConditionLiteral)→SkipConditionLiteral stripped from AND; x_cond survives.
			name:    "NOT full-text AND resource",
			expr:    "NOT 'hello' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE NOT (body_cond)",
		},
		{
			name:    "NOT full-text OR resource",
			expr:    "NOT 'hello' OR x = 'x'",
			wantRSB: "",
			wantSB:  "WHERE (NOT (body_cond) OR x_cond)",
		},
		{
			// RSB: FT→true stripped; x_cond survives.
			name:    "full-text AND BETWEEN",
			expr:    "'hello' AND x BETWEEN 1 AND 3",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			name:    "full-text AND EXISTS",
			expr:    "'hello' AND x EXISTS",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			// RSB: FT→true and allVariable→true; AND propagates true.
			// SB: allVariable→TrueConditionLiteral stripped; body_cond survives.
			name:    "full-text AND allVariable",
			expr:    "'hello' AND x IN $service",
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
		{
			// SB: body_cond added first; then allVariable→TrueConditionLiteral short-circuits OR.
			name:    "full-text OR allVariable",
			expr:    "'hello' OR x IN $service",
			wantRSB: "",
			wantSB:  "",
		},
		{
			// SB: body_cond
			name:    "full-text with sentinel value",
			expr:    SkipConditionLiteral,
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_AllVariable covers the __all__ dynamic variable.
// IN/NOT IN $service where service="__all__" resolves to TrueConditionLiteral in both
// RSB and SB, short-circuiting OR and being stripped from AND.
// Equality with __all__ does NOT short-circuit — the variable resolves to the literal
// "__all__" string and ConditionFor is called normally.
func TestVisitComparison_AllVariable(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			name:    "IN allVariable alone",
			expr:    "x IN $service",
			wantRSB: "",
			wantSB:  "",
		},
		{
			// TrueConditionLiteral stripped from AND; y_cond remains.
			name:    "IN allVariable AND resource",
			expr:    "x IN $service AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "",
		},
		{
			// TrueConditionLiteral short-circuits OR.
			name:    "IN allVariable OR resource",
			expr:    "x IN $service OR y = 'y'",
			wantRSB: "",
			wantSB:  "",
		},
		{
			// RSB: a IN __all__→true stripped; x_cond remains.
			// SB (no OR): a IN __all__→true; x filtered → ""; AND: no real conds → true.
			name:    "attr IN allVariable AND resource",
			expr:    "a IN $service AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "",
		},
		{
			// NOT IN also resolves __all__ to TrueConditionLiteral.
			name:    "NOT IN allVariable alone",
			expr:    "x NOT IN $service",
			wantRSB: "",
			wantSB:  "",
		},
		{
			name:    "NOT IN allVariable AND resource",
			expr:    "x NOT IN $service AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "",
		},
		{
			// NOT (x IN $service): __all__ → SkipConditionLiteral; VisitPrimary passes through;
			// NOT(SkipConditionLiteral) → SkipConditionLiteral.
			name:    "NOT of allVariable IN",
			expr:    "NOT (x IN $service)",
			wantRSB: "",
			wantSB:  "",
		},
		{
			name:    "allVariable IN AND allVariable IN",
			expr:    "x IN $service AND y IN $service",
			wantRSB: "",
			wantSB:  "",
		},
		{
			// SB: allVariable→TrueConditionLiteral stripped; body_cond survives.
			name:    "allVariable IN AND full-text",
			expr:    "x IN $service AND 'hello'",
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
		{
			// Equality does not trigger __all__ short-circuit; ConditionFor called normally.
			name:    "equality with __all__ variable no shortcircuit",
			expr:    "a = $service",
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			// __all__→TrueConditionLiteral stripped in AND; y_cond wrapped in paren; NOT wraps.
			name:    "NOT of paren with __all__ AND resource",
			expr:    "NOT (x IN $service AND y = 'y')",
			wantRSB: "WHERE NOT ((y_cond))",
			wantSB:  "",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_FunctionCalls covers function call expressions (has, hasAny, hasAll).
// rsbOpts has SkipFunctionCalls=true → TrueConditionLiteral (function never evaluated).
// sbOpts has SkipFunctionCalls=false; has/hasAny/hasAll only support FieldContextBody,
// so calls on attribute/resource keys return an error.
func TestVisitComparison_FunctionCalls(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			name:      "has on attribute key",
			expr:      "has(a, 'hello')",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			name:      "has on resource key",
			expr:      "has(x, 'hello')",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			// RSB: TrueConditionLiteral stripped by AND; x_cond remains.
			name:      "has AND resource key",
			expr:      "has(a, 'hello') AND x = 'x'",
			wantRSB:   "WHERE x_cond",
			wantErrSB: true,
		},
		{
			// RSB: TrueConditionLiteral short-circuits OR.
			name:      "has OR resource key",
			expr:      "has(a, 'hello') OR x = 'x'",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			name:      "NOT of has",
			expr:      "NOT has(a, 'hello')",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			// RSB: NOT(has→SkipConditionLiteral)→SkipConditionLiteral stripped from AND; y_cond remains.
			name:      "NOT of has AND resource key",
			expr:      "NOT has(a, 'hello') AND y = 'y'",
			wantRSB:   "WHERE y_cond",
			wantErrSB: true,
		},
		{
			// AND binds tighter: (has AND x) OR y.
			// RSB: (true AND x_cond)→x_cond; OR y_cond → (x_cond OR y_cond).
			name:      "has AND resource OR resource",
			expr:      "has(a, 'hello') AND x = 'x' OR y = 'y'",
			wantRSB:   "WHERE (x_cond OR y_cond)",
			wantErrSB: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_UnknownKeys covers unknown key handling.
// rsbOpts has IgnoreNotFoundKeys=true → VisitComparison returns SkipConditionLiteral
// (no keys resolved); SkipConditionLiteral short-circuits OR and is stripped from AND.
// sbOpts has IgnoreNotFoundKeys=false → key lookup appends an error.
func TestVisitComparison_UnknownKeys(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()
	tests := []visitComparisonCase{
		{
			// RSB: unknown_key → SkipConditionLiteral (no keys resolved); stripped from AND; x_cond survives.
			name:      "unknown key AND resource",
			expr:      "unknown_key = 'val' AND x = 'x'",
			wantRSB:   "WHERE x_cond",
			wantErrSB: true,
		},
		{
			// RSB: unknown_key not found (IgnoreNotFoundKeys=true) → SkipConditionLiteral;
			//      SkipConditionLiteral short-circuits OR → x_cond never evaluated → WHERE true.
			name:      "unknown key OR resource",
			expr:      "unknown_key = 'val' OR x = 'x'",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			// RSB: unknown_key → SkipConditionLiteral short-circuits OR → WHERE true (a=a never evaluated).
			name:      "unknown key OR attribute",
			expr:      "unknown_key = 'val' OR a = 'a'",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			// RSB: both → SkipConditionLiteral; all stripped from AND → AND returns SkipConditionLiteral → WHERE true.
			name:      "all unknown keys in AND",
			expr:      "unk1 = 'v' AND unk2 = 'v'",
			wantRSB:   "",
			wantErrSB: true,
		},
		{
			// RSB: unknown_key → SkipConditionLiteral; NOT(SkipConditionLiteral) → SkipConditionLiteral (guard);
			//      PrepareWhereClause converts to WHERE true.
			name:      "NOT of unknown key",
			expr:      "NOT unknown_key = 'val'",
			wantRSB:   "",
			wantErrSB: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}

// TestVisitComparison_SkippableLiteralValues guards against two distinct collision risks
// involving SkippableConditionLiterals ("true", "__skip__", "__skip_because_of_error__"):.
func TestVisitComparison_SkippableLiteralValues(t *testing.T) {
	rsbOpts, sbOpts := visitComparisonOpts()

	tests := []visitComparisonCase{
		{
			// rsbOpts: a is attr → SkipConditionLiteral → WHERE true.
			// sbOpts:  conditionBuilder ignores value → WHERE a_cond.
			name:    "value equals TrueConditionLiteral",
			expr:    fmt.Sprintf("a = '%s'", TrueConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			name:    "value equals SkipConditionLiteral",
			expr:    fmt.Sprintf("a = '%s'", SkipConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			name:    "value equals ErrorConditionLiteral",
			expr:    fmt.Sprintf("a = '%s'", ErrorConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			// IN list whose members are all sentinel literals.
			name:    "IN list containing all sentinel literals",
			expr:    fmt.Sprintf("a IN ('%s', '%s', '%s')", TrueConditionLiteral, SkipConditionLiteral, ErrorConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE a_cond",
		},
		{
			// Both a and b are attribute keys → rsbOpts → WHERE true.
			// sbOpts → two real conditions joined by AND.
			name:    "AND with sentinel value on one branch",
			expr:    fmt.Sprintf("a = '%s' AND b = 'real_value'", SkipConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			// rsbOpts: NOT(SkipConditionLiteral) → SkipConditionLiteral → WHERE true.
			// sbOpts: NOT wraps the real condition.
			name:    "NOT with sentinel value",
			expr:    fmt.Sprintf("NOT a = '%s'", TrueConditionLiteral),
			wantRSB: "",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// SkipConditionLiteral as a bare full-text search term.
			// rsbOpts: SkipFullTextFilter=true → SkipConditionLiteral → WHERE true.
			// sbOpts:  full-text search on body column → WHERE body_cond.
			name:    "full text search with SkipConditionLiteral",
			expr:    SkipConditionLiteral,
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
		{
			// TrueConditionLiteral as a bare full-text search term.
			// rsbOpts: SkipFullTextFilter=true → SkipConditionLiteral → WHERE true.
			// sbOpts:  full-text search on body column → WHERE body_cond.
			name:    "full text search with TrueConditionLiteral",
			expr:    TrueConditionLiteral,
			wantRSB: "",
			wantSB:  "WHERE body_cond",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := PrepareWhereClause(tt.expr, rsbOpts)
			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}
			result, err = PrepareWhereClause(tt.expr, sbOpts)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")
			if err == nil {
				var expr string
				if result != nil {
					expr, _ = result.WhereClause.Build()
				}
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}
		})
	}
}
