package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
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
//     attr key (a,b,c)          → TrueConditionLiteral
//     resource key (x,y,z)      → "{name}_cond"
//     full-text / function call → TrueConditionLiteral (skipped)
//     unknown key               → "" (ignored; IgnoreNotFoundKeys=true)
//
//   conditionBuilder:
//     any key (a,b,c,x,y,z)    → "{name}_cond"
//     full-text ('hello')       → "body_cond"  (bodyCol.Name="body")
//     function call (non-body)  → error (only body JSON search supported)
//     unknown key               → error (IgnoreNotFoundKeys=false)
//
//   __all__ variable (IN/NOT IN $service where service="__all__"):
//     → TrueConditionLiteral in both configurations
//
//   TrueConditionLiteral ("true") propagation rules (both configs):
//     • In AND: stripped as no-op; if ALL branches are TrueConditionLiteral
//               → propagates upward
//     • In OR:  short-circuits the entire OR immediately
//     • NOT(TrueConditionLiteral) → TrueConditionLiteral (guard)
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

type resourceConditionBuilder struct{ m map[string]string }

func (b *resourceConditionBuilder) ConditionFor(
	_ context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	_ qbtypes.FilterOperator,
	_ any,
	_ *sqlbuilder.SelectBuilder,
	_ uint64,
	_ uint64,
) (string, error) {

	if key.FieldContext != telemetrytypes.FieldContextResource {
		return TrueConditionLiteral, nil
	}
	if b.m != nil {
		if result, ok := b.m[key.Name]; ok {
			return result, nil
		}
	}
	return fmt.Sprintf("%s_cond", key.Name), nil
}

type conditionBuilder struct{ m map[string]string }

func (b *conditionBuilder) ConditionFor(
	_ context.Context,
	key *telemetrytypes.TelemetryFieldKey,
	_ qbtypes.FilterOperator,
	_ any,
	_ *sqlbuilder.SelectBuilder,
	_ uint64,
	_ uint64,
) (string, error) {

	if b.m != nil {
		if result, ok := b.m[key.Name]; ok {
			return result, nil
		}
	}
	return fmt.Sprintf("%s_cond", key.Name), nil
}

func TestVisitComparison(t *testing.T) {
	// allVariable is used in __all__ test cases.
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

	rsbOpts := FilterExprVisitorOpts{
		FieldKeys:          visitTestKeys,
		ConditionBuilder:   &resourceConditionBuilder{},
		Variables:          allVariable,
		SkipResourceFilter: false,
		SkipFullTextFilter: true,
		SkipFunctionCalls:  true,
		IgnoreNotFoundKeys: true,
	}
	sbOpts := FilterExprVisitorOpts{
		FieldKeys:          visitTestKeys,
		ConditionBuilder:   &conditionBuilder{},
		Variables:          allVariable,
		SkipResourceFilter: true,
		SkipFullTextFilter: false,
		SkipFunctionCalls:  false,
		IgnoreNotFoundKeys: false,
		FullTextColumn:     bodyCol,
	}

	tests := []struct {
		name       string
		expr       string
		wantRSB    string // resourceConditionBuilder expected
		wantSB     string // conditionBuilder expected
		wantErrSB  bool   // when true, SB is expected to return an error
		wantErrRSB bool   // when true, RSB is expected to return an error
	}{
		// ------------------------------------------------------------------
		// Basic single-key and AND comparisons
		//
		// RSB: attr (a,b,c) → TrueConditionLiteral; resource (x,y,z) → "{name}_cond"
		// SB:  every key → "{name}_cond"
		// ------------------------------------------------------------------
		{
			// Single attribute key.
			// RSB: a→TrueConditionLiteral → "true"
			// SB:  a→a_cond
			name:    "single attribute key",
			expr:    "a = 'v'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Single resource key
			// RSB: x→x_cond
			// SB:	x→TrueConditionLiteral → "true"
			name:    "single resource key",
			expr:    "x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// Two attribute keys in AND.
			// RSB: both→true; AND propagates TrueConditionLiteral → "true"
			// SB:  (a_cond AND b_cond)
			name:    "two attribute keys AND",
			expr:    "a = 'a' AND b = 'b'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			// Two resource keys in AND. Both configs agree.
			name:    "two resource keys AND",
			expr:    "x = 'x' AND y = 'y'",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "WHERE true",
		},
		{
			// Mixed AND: attribute + resource.
			// RSB: a→true stripped by AND; x_cond survives alone
			// SB:  (a_cond AND x_cond)
			name:    "attribute AND resource",
			expr:    "a = 'a' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE a_cond",
		},
		{
			// Three mixed keys in AND.
			// RSB: a,b→true stripped; x_cond remains
			// SB:  (a_cond AND b_cond AND x_cond)
			name:    "three mixed keys AND",
			expr:    "a = 'a' AND b = 'b' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},

		// ------------------------------------------------------------------
		// NOT operator — unary level vs. inside-comparison
		// ------------------------------------------------------------------
		{
			// NOT at unary level on attribute.
			// RSB: NOT(TrueConditionLiteral)→TrueConditionLiteral → "true"
			// SB:  NOT (a_cond)
			name:    "NOT attribute key",
			expr:    "NOT a = 'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// NOT at unary level on resource key.
			name:    "NOT resource key",
			expr:    "NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE true",
		},
		{
			// NOT attribute AND resource.
			// RSB: NOT(true)→true stripped; x_cond remains
			// SB:  (NOT (a_cond) AND x_cond)
			name:    "NOT attribute AND resource",
			expr:    "NOT a = 'a' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// NOT is inside the comparison (grammar: key NOT LIKE value):
			// VisitComparison sets op=NotLike; builder ignores the inner NOT-op.
			// RSB: a→TrueConditionLiteral (attr); no outer NOT
			// SB:  a_cond (conditionBuilder ignores the NOT-inside-comparison op)
			name:    "NOT inside LIKE comparison",
			expr:    "a NOT LIKE '%a%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// NOT at unary level wrapping LIKE.
			// RSB: NOT(TrueConditionLiteral)→TrueConditionLiteral → "true"
			// SB:  NOT (a_cond)
			name:    "NOT at unary level wrapping LIKE",
			expr:    "NOT a LIKE '%a%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// NOT inside comparison (resource key) OR resource. Both configs agree:
			// no outer NOT emitted; builder ignores inner NOT-op.
			name:    "NOT inside LIKE OR resource",
			expr:    "x NOT LIKE '%x%' OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// NOT at unary level wrapping LIKE on resource key, OR another resource.
			// Both configs agree.
			name:    "NOT at unary level wrapping LIKE OR resource",
			expr:    "NOT x LIKE '%x%' OR y = 'y'",
			wantRSB: "WHERE (NOT (x_cond) OR y_cond)",
			wantSB:  "WHERE (NOT (x_cond) OR y_cond)",
		},

		// ------------------------------------------------------------------
		// OR expressions
		// ------------------------------------------------------------------
		{
			// Two resource keys OR'd. Both configs agree.
			name:    "resource OR resource",
			expr:    "x = 'x' OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// Three resource keys OR'd. Both configs agree.
			name:    "three resource keys OR",
			expr:    "x = 'x' OR y = 'y' OR z = 'z'",
			wantRSB: "WHERE (x_cond OR y_cond OR z_cond)",
			wantSB:  "WHERE (x_cond OR y_cond OR z_cond)",
		},
		{
			// Attribute and resource in OR.
			// RSB: a→TrueConditionLiteral short-circuits OR → "true"
			// SB:  (a_cond OR x_cond)
			name:    "attribute OR resource",
			expr:    "a = 'a' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR x_cond)",
		},
		{
			// AND sub-expression as one OR branch. All resource keys; both agree.
			name:    "AND sub-expression OR resource",
			expr:    "x = 'x' AND y = 'y' OR z = 'z'",
			wantRSB: "WHERE ((x_cond AND y_cond) OR z_cond)",
			wantSB:  "WHERE ((x_cond AND y_cond) OR z_cond)",
		},
		{
			// Parenthesized OR AND'd with a resource key. All resource; both agree.
			name:    "parenthesized OR AND resource",
			expr:    "(x = 'x' OR y = 'y') AND z = 'z'",
			wantRSB: "WHERE (((x_cond OR y_cond)) AND z_cond)",
			wantSB:  "WHERE (((x_cond OR y_cond)) AND z_cond)",
		},
		{
			// NOT at unary level combined with OR. Both configs agree.
			name:    "NOT resource OR resource",
			expr:    "NOT x = 'x' OR y = 'y'",
			wantRSB: "WHERE (NOT (x_cond) OR y_cond)",
			wantSB:  "WHERE (NOT (x_cond) OR y_cond)",
		},
		{
			// NOT of parenthesized OR sub-expression. All resource; both agree.
			name:    "NOT of parenthesized OR",
			expr:    "NOT (x = 'x' OR y = 'y')",
			wantRSB: "WHERE NOT (((x_cond OR y_cond)))",
			wantSB:  "WHERE NOT (((x_cond OR y_cond)))",
		},
		// Note: when SB has SkipResourceFilter=true but the expression contains
		// OR, the flag is overridden to false, so resource keys become visible.
		{
			// OR present → SB override → resource keys visible in SB.
			// RSB: a→true short-circuits OR.
			name:    "attr eq OR resource EXISTS with OR override",
			expr:    "a = 'a' OR x EXISTS",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR x_cond)",
		},
		{
			// OR present → SB sees all keys; different operators in each branch.
			// RSB: a→true short-circuits OR.
			name:    "attr ILIKE OR resource REGEXP with OR override",
			expr:    "a ILIKE '%a%' OR x REGEXP '^x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR x_cond)",
		},
		{
			// OR triggers override; two mixed AND groups as OR branches.
			// RSB: left (a→true, x_cond) → x_cond; right (b→true, y_cond) → y_cond; OR.
			// SB:  left (a_cond AND x_cond); right (b_cond AND y_cond); OR.
			name:    "two mixed AND groups in OR",
			expr:    "a = 'a' AND x = 'x' OR b = 'b' AND y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE ((a_cond AND x_cond) OR (b_cond AND y_cond))",
		},
		{
			// OR present → SB sees resource key.
			// RSB: NOT(a→true)→true short-circuits OR.
			name:    "NOT attr OR resource with OR override",
			expr:    "NOT a = 'a' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (a_cond) OR x_cond)",
		},
		{
			// a NOT EXISTS inside comparison → a_cond; OR triggers override.
			// RSB: a→true short-circuits OR.
			name:    "attr NOT EXISTS OR resource with OR override",
			expr:    "a NOT EXISTS OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR x_cond)",
		},

		// ------------------------------------------------------------------
		// Full-text search
		//
		// RSB: SkipFullTextFilter=true → TrueConditionLiteral
		// SB:  SkipFullTextFilter=false, FullTextColumn=bodyCol → "body_cond"
		// ------------------------------------------------------------------
		{
			// Standalone full-text term.
			name:    "standalone full-text term",
			expr:    "'hello'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE body_cond",
		},
		{
			// Full-text AND attribute.
			// RSB: FT→true, a→true; AND propagates true → "true"
			// SB:  (body_cond AND a_cond)
			name:    "full-text AND attribute",
			expr:    "'hello' AND a = 'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond AND a_cond)",
		},
		{
			// Full-text AND resource.
			// RSB: FT→true stripped; x_cond survives
			// SB:  (body_cond AND x_cond)
			name:    "full-text AND resource",
			expr:    "'hello' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			// NOT of full-text.
			// RSB: NOT(TrueConditionLiteral)→TrueConditionLiteral → "true"
			// SB:  NOT (body_cond)
			name:    "NOT full-text term",
			expr:    "NOT 'hello'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (body_cond)",
		},
		{
			// Full-text OR resource.
			// RSB: FT→true short-circuits OR → "true"
			// SB:  (body_cond OR x_cond)
			name:    "full-text OR resource",
			expr:    "'hello' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond OR x_cond)",
		},
		{
			// Full-text OR attribute.
			// RSB: FT→true short-circuits OR → "true"
			// SB:  (body_cond OR a_cond)
			name:    "full-text OR attribute",
			expr:    "'hello' OR a = 'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond OR a_cond)",
		},
		{
			// Two full-text terms AND'd.
			// RSB: both→true; AND propagates true → "true"
			// SB:  (body_cond AND body_cond)
			name:    "two full-text terms ANDed",
			expr:    "'hello' AND 'world'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond AND body_cond)",
		},
		{
			// Two full-text terms OR'd.
			// RSB: FT→true short-circuits OR.
			// SB:  OR override → (body_cond OR body_cond).
			name:    "two full-text terms ORed",
			expr:    "'hello' OR 'world'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond OR body_cond)",
		},
		{
			// Single FT in parens.
			// RSB: FT→true passes through paren.
			// SB:  (body_cond).
			name:    "full-text in parentheses",
			expr:    "('hello')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond)",
		},
		{
			// Three-way AND: two FT + attribute.
			// RSB: all→true; AND propagates true.
			// SB:  (body_cond AND body_cond AND a_cond).
			name:    "two full-text AND attribute",
			expr:    "'hello' AND 'world' AND a = 'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond AND body_cond AND a_cond)",
		},
		{
			// Three-way OR: FT + attr + resource. All three key types.
			// RSB: FT→true short-circuits OR.
			// SB:  OR override → (body_cond OR a_cond OR x_cond).
			name:    "full-text OR attr OR resource all types",
			expr:    "'hello' OR a = 'a' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (body_cond OR a_cond OR x_cond)",
		},
		{
			// NOT of parenthesized FT AND attr.
			// RSB: FT→true AND a→true → true; paren passes; NOT(true)→true.
			// SB:  (body_cond AND a_cond); paren wraps; NOT wraps.
			name:    "NOT of paren full-text AND attr",
			expr:    "NOT ('hello' AND a = 'a')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (((body_cond AND a_cond)))",
		},

		// ------------------------------------------------------------------
		// Operators: BETWEEN, EXISTS, IN/NOT IN
		// ------------------------------------------------------------------
		{
			// BETWEEN on resource key. Both configs agree.
			name:    "BETWEEN resource key",
			expr:    "x BETWEEN 1 AND 3",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// BETWEEN OR resource. Both configs agree.
			name:    "BETWEEN OR resource",
			expr:    "x BETWEEN 1 AND 3 OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// EXISTS on resource key. Both configs agree.
			name:    "EXISTS resource key",
			expr:    "x EXISTS",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// NOT EXISTS (NOT inside comparison): builder ignores inner NOT-op.
			// Both configs agree.
			name:    "NOT EXISTS inside comparison",
			expr:    "x NOT EXISTS",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// NOT EXISTS at unary level. Both configs agree.
			name:    "NOT EXISTS at unary level",
			expr:    "NOT x EXISTS",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE true",
		},
		{
			// EXISTS OR resource. Both configs agree.
			name:    "EXISTS OR resource",
			expr:    "x EXISTS OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// IN with literal list on resource key. Both configs agree.
			name:    "IN literal list resource key",
			expr:    "x IN ['x1', 'x2']",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// IN literal list OR resource. Both configs agree.
			name:    "IN literal list OR resource",
			expr:    "x IN ['x1', 'x2'] OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// EXISTS + LIKE in AND — two different comparison types.
			// RSB: both attr → true.
			// SB:  (a_cond AND b_cond).
			name:    "EXISTS AND LIKE in AND",
			expr:    "a EXISTS AND b LIKE '%b%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			// BETWEEN + CONTAINS in OR — two operators in OR branches.
			// OR override → both resource keys visible.
			name:    "BETWEEN OR CONTAINS resource keys",
			expr:    "x BETWEEN 1 AND 3 OR y CONTAINS 'hello'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},

		// ------------------------------------------------------------------
		// __all__ dynamic variable — both configs return TrueConditionLiteral
		// for IN/NOT IN $service where service="__all__"
		// ------------------------------------------------------------------
		{
			// IN $service alone. Both configs agree.
			name:    "IN allVariable alone",
			expr:    "x IN $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},
		{
			// IN $service AND resource: TrueConditionLiteral stripped; y_cond remains.
			// Both configs agree.
			name:    "IN allVariable AND resource",
			expr:    "x IN $service AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "WHERE true",
		},
		{
			// IN $service OR resource: TrueConditionLiteral short-circuits OR.
			// Both configs agree.
			name:    "IN allVariable OR resource",
			expr:    "x IN $service OR y = 'y'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},
		{
			// Attribute IN __all__ + resource AND.
			// RSB: a IN __all__ → true; x→x_cond; AND: true stripped → x_cond.
			// SB (no OR): a IN __all__ → true; x filtered → "";
			//   AND: true, no real conds → true.
			name:    "attr IN allVariable AND resource",
			expr:    "a IN $service AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},

		// ------------------------------------------------------------------
		// AND/OR precedence — AND binds tighter than OR
		// ------------------------------------------------------------------
		{
			// Three-way OR: all keys produce conditions.
			// RSB: a→TrueConditionLiteral → first OR branch short-circuits → "true"
			// SB:  (a_cond OR b_cond OR x_cond)
			name:    "attr OR attr OR resource precedence",
			expr:    "a = 'a' OR b = 'b' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR b_cond OR x_cond)",
		},
		{
			// AND before OR: (a AND b) as one OR branch; x is the other.
			// RSB: (a AND b)→true; true OR x_cond → true (short-circuits) → "true"
			// SB:  ((a_cond AND b_cond) OR x_cond)
			name:    "attr AND attr OR resource precedence",
			expr:    "a = 'a' AND b = 'b' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE ((a_cond AND b_cond) OR x_cond)",
		},
		{
			// AND tighter than OR: a is its own OR branch; (b AND x) is the second.
			// RSB: a→TrueConditionLiteral first in OR → short-circuits → "true"
			// SB:  (a_cond OR (b_cond AND x_cond))
			name:    "attr OR attr AND resource precedence",
			expr:    "a = 'a' OR b = 'b' AND x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR (b_cond AND x_cond))",
		},
		{
			// Two AND groups joined by OR.
			// RSB: left AND group (a,b)→true; true OR right group → short-circuits → "true"
			// SB:  ((a_cond AND b_cond) OR (x_cond AND y_cond))
			name:    "two AND groups OR precedence",
			expr:    "a = 'a' AND b = 'b' OR x = 'x' AND y = 'y'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE ((a_cond AND b_cond) OR (x_cond AND y_cond))",
		},
		{
			// Both NOT-wrapped conditions appear as real conditions in AND.
			// RSB: NOT(a→true)→true stripped; NOT(x_cond) remains
			// SB:  (NOT (a_cond) AND NOT (x_cond))
			name:    "NOT attr AND NOT resource precedence",
			expr:    "NOT a = 'a' AND NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// Both NOT-wrapped conditions in OR.
			// RSB: NOT(a→true)→TrueConditionLiteral → OR short-circuits → "true"
			// SB:  (NOT (a_cond) OR NOT (x_cond))
			name:    "NOT attr OR NOT resource precedence",
			expr:    "NOT a = 'a' OR NOT x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (a_cond) OR NOT (x_cond))",
		},

		// ------------------------------------------------------------------
		// Parenthesized sub-expressions
		// VisitPrimary wraps real inner results in one extra layer of parens;
		// TrueConditionLiteral passes through unwrapped.
		// ------------------------------------------------------------------
		{
			// Single key in parens.
			// RSB: a→TrueConditionLiteral; VisitPrimary passes through → "true"
			// SB:  VisitPrimary wraps a_cond → "(a_cond)"
			name:    "single attribute key in parens",
			expr:    "(a = 'a')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond)",
		},
		{
			// AND inside parens: attribute key stripped; resource key wrapped.
			// RSB: a→true stripped; x_cond; VisitPrimary wraps → "(x_cond)"
			// SB:  AND→(a_cond AND x_cond); VisitPrimary → "((a_cond AND x_cond))"
			name:    "AND in parens with mixed keys",
			expr:    "(a = 'a' AND x = 'x')",
			wantRSB: "WHERE (x_cond)",
			wantSB:  "WHERE (a_cond)",
		},
		{
			// NOT of paren-AND with mixed keys.
			// RSB: inner→(x_cond); NOT wraps → "NOT ((x_cond))"
			// SB:  inner→((a_cond AND x_cond)); NOT wraps → "NOT (((a_cond AND x_cond)))"
			name:    "NOT of paren-AND with mixed keys",
			expr:    "NOT (a = 'a' AND x = 'x')",
			wantRSB: "WHERE NOT ((x_cond))",
			wantSB:  "WHERE NOT ((a_cond))",
		},
		{
			// Two parenthesized OR groups AND'd.
			// RSB: left (a OR b)→true; passes through; AND strips it;
			//      right (x OR y)→(x_cond OR y_cond); VisitPrimary→((x_cond OR y_cond)); remains.
			//      Result: "((x_cond OR y_cond))"
			// SB:  (((a_cond OR b_cond)) AND ((x_cond OR y_cond)))
			name:    "two paren-OR groups ANDed",
			expr:    "(a = 'a' OR b = 'b') AND (x = 'x' OR y = 'y')",
			wantRSB: "WHERE ((x_cond OR y_cond))",
			wantSB:  "WHERE (((a_cond OR b_cond)) AND ((x_cond OR y_cond)))",
		},
		{
			// Two parenthesized OR groups OR'd together.
			// RSB: left (a OR b)→true; VisitPrimary passes through; OR short-circuits → "true"
			// SB:  (((a_cond OR b_cond)) OR ((x_cond OR y_cond)))
			name:    "two paren-OR groups ORed",
			expr:    "(a = 'a' OR b = 'b') OR (x = 'x' OR y = 'y')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (((a_cond OR b_cond)) OR ((x_cond OR y_cond)))",
		},
		{
			// Parenthesized OR in the middle of a three-way AND.
			// RSB: a→true (stripped); (b OR x): b→true→short-circuits→true; VisitPrimary→true;
			//      stripped; y→y_cond remains. Result: "y_cond"
			// SB:  a_cond AND ((b_cond OR x_cond)) AND y_cond
			name:    "paren-OR in middle of three-way AND",
			expr:    "a = 'a' AND (b = 'b' OR x = 'x') AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "WHERE (a_cond AND ((b_cond OR x_cond)) AND y_cond)",
		},

		// ------------------------------------------------------------------
		// Double negation via NOT (NOT …)
		// ------------------------------------------------------------------
		{
			// Inner NOT a → NOT(TrueConditionLiteral)→TrueConditionLiteral; VisitPrimary→true;
			// outer NOT(TrueConditionLiteral)→TrueConditionLiteral → "true"  [RSB]
			// SB: Inner NOT a → NOT(a_cond); VisitPrimary→(NOT (a_cond));
			//     outer NOT→NOT ((NOT (a_cond)))
			name:    "double NOT via parens",
			expr:    "NOT (NOT a = 'a')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT ((NOT (a_cond)))",
		},

		// ------------------------------------------------------------------
		// Comparison operators — conditionBuilder ignores operator type
		// ------------------------------------------------------------------
		{
			// Not-equal on attribute.
			// RSB: a→TrueConditionLiteral → "true"
			// SB:  a_cond
			name:    "not-equal attribute",
			expr:    "a != 'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Less-than with numeric on attribute.
			// RSB: "true"  SB: a_cond
			name:    "less-than numeric attribute",
			expr:    "a < 5",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Greater-than-or-equal in AND with resource key.
			// RSB: a→true stripped; x_cond remains
			// SB:  (a_cond AND x_cond)
			name:    "greater-than-or-equal AND resource",
			expr:    "a >= 5 AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE a_cond",
		},
		{
			// ILIKE on attribute.
			// RSB: "true"  SB: a_cond
			name:    "ILIKE attribute",
			expr:    "a ILIKE '%a%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// NOT ILIKE inside comparison (op=NotILike; builder ignores).
			// RSB: "true"  SB: a_cond
			name:    "NOT ILIKE inside comparison",
			expr:    "a NOT ILIKE '%a%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// NOT at unary level wrapping ILIKE.
			// RSB: NOT(TrueConditionLiteral)→TrueConditionLiteral → "true"
			// SB:  NOT (a_cond)
			name:    "NOT at unary level wrapping ILIKE",
			expr:    "NOT a ILIKE '%a%'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// REGEXP on attribute.
			// RSB: "true"  SB: a_cond
			name:    "REGEXP attribute",
			expr:    "a REGEXP '^a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// CONTAINS on attribute.
			// RSB: "true"  SB: a_cond
			name:    "CONTAINS attribute",
			expr:    "a CONTAINS 'hello'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond AND body_cond)",
		},
		{
			// NOT CONTAINS inside comparison.
			// RSB: "true"  SB: a_cond
			name:    "NOT CONTAINS inside comparison",
			expr:    "a NOT CONTAINS 'hello'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond AND body_cond)",
		},
		{
			// NOT at unary level wrapping CONTAINS.
			// RSB: "true"  SB: NOT (a_cond)
			name:    "NOT at unary level wrapping CONTAINS",
			expr:    "NOT a CONTAINS 'hello'a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (a_cond) AND body_cond)",
		},
		{
			// NOT REGEXP inside comparison (attr).
			name:    "NOT REGEXP inside comparison attr",
			expr:    "a NOT REGEXP '^a'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},

		// ------------------------------------------------------------------
		// NOT BETWEEN — NOT inside comparison vs. NOT at unary level
		// ------------------------------------------------------------------
		{
			// NOT inside BETWEEN comparison (op=NotBetween); builder ignores.
			// Both configs agree.
			name:    "NOT BETWEEN inside comparison",
			expr:    "x NOT BETWEEN 1 AND 3",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// NOT at unary level wrapping BETWEEN. Both configs agree.
			name:    "NOT at unary level wrapping BETWEEN",
			expr:    "NOT x BETWEEN 1 AND 3",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE true",
		},
		{
			// Two BETWEEN comparisons in AND. Both configs agree.
			name:    "two BETWEEN in AND",
			expr:    "x BETWEEN 1 AND 3 AND y BETWEEN 4 AND 6",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "WHERE true",
		},

		// ------------------------------------------------------------------
		// NOT IN — with literal list and __all__ variable
		// ------------------------------------------------------------------
		{
			// NOT IN with literal list on resource key. Both configs agree.
			name:    "NOT IN literal list",
			expr:    "x NOT IN ['x1', 'x2']",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// NOT IN literal list OR resource. Both configs agree.
			name:    "NOT IN literal list OR resource",
			expr:    "x NOT IN ['x1', 'x2'] OR y = 'y'",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// NOT IN with __all__ variable. Both configs agree.
			name:    "NOT IN allVariable alone",
			expr:    "x NOT IN $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},
		{
			// NOT IN $service AND resource. Both configs agree.
			name:    "NOT IN allVariable AND resource",
			expr:    "x NOT IN $service AND y = 'y'",
			wantRSB: "WHERE y_cond",
			wantSB:  "WHERE true",
		},
		{
			// IN and NOT IN in OR.
			// OR override → both resource keys visible.
			name:    "IN OR NOT IN resource keys",
			expr:    "x IN ['x'] OR y NOT IN ['y']",
			wantRSB: "WHERE (x_cond OR y_cond)",
			wantSB:  "WHERE (x_cond OR y_cond)",
		},
		{
			// Unary NOT wraps the entire IN comparison on resource.
			// RSB: x→x_cond; NOT wraps. SB (no OR): x filtered → ""; NOT("") → "".
			name:    "unary NOT wrapping IN resource",
			expr:    "NOT x IN ['x1', 'x2']",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE true",
		},
		{
			// Unary NOT wraps the entire IN comparison on attr.
			// RSB: a→true; NOT(true)→true. SB: a_cond; NOT(a_cond).
			name:    "unary NOT wrapping IN attr",
			expr:    "NOT a IN ['a1', 'a2']",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (a_cond)",
		},

		// ------------------------------------------------------------------
		// EXISTS combinations
		// ------------------------------------------------------------------
		{
			// Two EXISTS in AND. Both configs agree.
			name:    "EXISTS AND EXISTS",
			expr:    "x EXISTS AND y EXISTS",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "WHERE true",
		},
		{
			// NOT at unary level for both; OR joins the wrapped conditions.
			// Both configs agree.
			name:    "NOT EXISTS OR NOT EXISTS",
			expr:    "NOT x EXISTS OR NOT y EXISTS",
			wantRSB: "WHERE (NOT (x_cond) OR NOT (y_cond))",
			wantSB:  "WHERE (NOT (x_cond) OR NOT (y_cond))",
		},
		{
			// Plain EXISTS OR NOT EXISTS (unary NOT). Both configs agree.
			name:    "EXISTS OR NOT EXISTS",
			expr:    "x EXISTS OR NOT y EXISTS",
			wantRSB: "WHERE (x_cond OR NOT (y_cond))",
			wantSB:  "WHERE (x_cond OR NOT (y_cond))",
		},
		{
			// NOT EXISTS inside comparison (attr).
			// RSB: a→true.
			// SB:  a_cond (conditionBuilder ignores op).
			name:    "NOT EXISTS inside comparison attr",
			expr:    "a NOT EXISTS",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},

		// ------------------------------------------------------------------
		// Full-text combined with operators and __all__
		// ------------------------------------------------------------------
		{
			// NOT full-text AND resource.
			// RSB: NOT(FT→true)→true stripped; x_cond survives
			// SB:  (NOT (body_cond) AND x_cond)
			name:    "NOT full-text AND resource",
			expr:    "NOT 'hello' AND x = 'x'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE NOT (body_cond)",
		},
		{
			// NOT full-text OR resource.
			// RSB: NOT(FT→true)→true → OR short-circuits → "true"
			// SB:  (NOT (body_cond) OR x_cond)
			name:    "NOT full-text OR resource",
			expr:    "NOT 'hello' OR x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (body_cond) OR x_cond)",
		},
		{
			// Full-text AND BETWEEN.
			// RSB: FT→true stripped; x_cond survives
			// SB:  (body_cond AND x_cond)
			name:    "full-text AND BETWEEN",
			expr:    "'hello' AND x BETWEEN 1 AND 3",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			// Full-text AND EXISTS.
			// RSB: FT→true stripped; x_cond survives
			// SB:  (body_cond AND x_cond)
			name:    "full-text AND EXISTS",
			expr:    "'hello' AND x EXISTS",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE body_cond",
		},
		{
			// Full-text AND __all__: both → TrueConditionLiteral in RSB; AND propagates → "true"
			// SB:  body_cond survives (TrueConditionLiteral from __all__ stripped)
			name:    "full-text AND allVariable",
			expr:    "'hello' AND x IN $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE body_cond",
		},
		{
			// Full-text OR __all__: FT short-circuits OR in RSB; body_cond added first
			// in SB then __all__→TrueConditionLiteral short-circuits → "true".
			name:    "full-text OR allVariable",
			expr:    "'hello' OR x IN $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},

		// ------------------------------------------------------------------
		// __all__ TrueConditionLiteral edge cases
		// ------------------------------------------------------------------
		{
			// NOT (x IN $service): __all__ → TrueConditionLiteral; VisitPrimary passes
			// through; NOT(TrueConditionLiteral) → TrueConditionLiteral.
			// Both configs agree.
			name:    "NOT of allVariable IN",
			expr:    "NOT (x IN $service)",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},
		{
			// Two allVariable IN in AND: both → TrueConditionLiteral; AND propagates.
			// Both configs agree.
			name:    "allVariable IN AND allVariable IN",
			expr:    "x IN $service AND y IN $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE true",
		},
		{
			// allVariable IN AND full-text: TrueConditionLiteral stripped in AND.
			// RSB: FT→true too; AND propagates true → "true"
			// SB:  body_cond survives as sole condition
			name:    "allVariable IN AND full-text",
			expr:    "x IN $service AND 'hello'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE body_cond",
		},

		// ------------------------------------------------------------------
		// Function calls
		//
		// RSB: SkipFunctionCalls=true → TrueConditionLiteral; function call
		//      is never evaluated.
		// SB:  SkipFunctionCalls=false; VisitFunctionCall evaluates the call.
		//      has/hasAny/hasAll only support body JSON search (FieldContextBody);
		//      keys a,b,c (attribute) and x,y,z (resource) are not body fields,
		//      so the visitor appends an error → PrepareWhereClause returns error.
		// ------------------------------------------------------------------
		{
			// RSB: has(a,…) → TrueConditionLiteral → "true"
			// SB:  error — `has` supports only body JSON search
			name:      "has on attribute key",
			expr:      "has(a, 'hello')",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: has(x,…) → TrueConditionLiteral → "true"
			// SB:  error — `has` supports only body JSON search
			name:      "has on resource key",
			expr:      "has(x, 'hello')",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: TrueConditionLiteral stripped by AND; x_cond remains
			// SB:  error — `has` supports only body JSON search
			name:      "has AND resource key",
			expr:      "has(a, 'hello') AND x = 'x'",
			wantRSB:   "WHERE x_cond",
			wantErrSB: true,
		},
		{
			// RSB: TrueConditionLiteral short-circuits OR → "true"
			// SB:  error — `has` supports only body JSON search
			name:      "has OR resource key",
			expr:      "has(a, 'hello') OR x = 'x'",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: NOT(TrueConditionLiteral) → TrueConditionLiteral → "true"
			// SB:  error — `has` supports only body JSON search
			name:      "NOT of has",
			expr:      "NOT has(a, 'hello')",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: NOT(true)→true stripped by AND; y_cond remains
			// SB:  error — `has` supports only body JSON search
			name:      "NOT of has AND resource key",
			expr:      "NOT has(a, 'hello') AND y = 'y'",
			wantRSB:   "WHERE y_cond",
			wantErrSB: true,
		},
		{
			// AND binds tighter: (has(a,'hello') AND x='v') OR y='v'
			// RSB: (true AND x_cond) → x_cond; x_cond OR y_cond → (x_cond OR y_cond)
			// SB:  error — `has` supports only body JSON search
			name:      "has AND resource OR resource",
			expr:      "has(a, 'hello') AND x = 'x' OR y = 'y'",
			wantRSB:   "WHERE (x_cond OR y_cond)",
			wantErrSB: true,
		},

		// ------------------------------------------------------------------
		// Unknown key handling
		//
		// RSB: IgnoreNotFoundKeys=true → VisitComparison returns "" which is
		//      silently dropped from AND/OR; all-"" AND → TrueConditionLiteral.
		// SB:  IgnoreNotFoundKeys=false → key lookup appends error →
		//      PrepareWhereClause returns error.
		// ------------------------------------------------------------------
		{
			// RSB: "" dropped from AND; x_cond survives
			// SB:  error — key `unknown_key` not found
			name:      "unknown key AND resource",
			expr:      "unknown_key = 'val' AND x = 'x'",
			wantRSB:   "WHERE x_cond",
			wantErrSB: true,
		},
		{
			// RSB: "" dropped from OR; only x_cond remains (no OR wrapper)
			// SB:  error
			name:      "unknown key OR resource",
			expr:      "unknown_key = 'val' OR x = 'x'",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: "" dropped; a→TrueConditionLiteral short-circuits OR → "true"
			// SB:  error
			name:      "unknown key OR attribute",
			expr:      "unknown_key = 'val' OR a = 'a'",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: both → ""; AND has no real conditions and no TrueConditionLiteral
			//      → PrepareWhereClause converts empty result to "true"
			// SB:  error
			name:      "all unknown keys in AND",
			expr:      "unk1 = 'v' AND unk2 = 'v'",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},
		{
			// RSB: "" from VisitComparison; VisitUnaryExpression guard returns "";
			//      PrepareWhereClause converts empty to "true"
			// SB:  error
			name:      "NOT of unknown key",
			expr:      "NOT unknown_key = 'val'",
			wantRSB:   "WHERE true",
			wantErrSB: true,
		},

		// ------------------------------------------------------------------
		// Edge cases: deeply nested parentheses, triple/double NOT,
		// type mismatches, variable resolution quirks, operator combos
		// ------------------------------------------------------------------
		{
			// Three layers of paren wrapping accumulate around the condition.
			// Each VisitPrimary(paren) adds one "()".
			name:    "deeply nested parentheses",
			expr:    "(((x = 'x')))",
			wantRSB: "WHERE (((x_cond)))",
			wantSB:  "WHERE true",
		},
		{
			// Odd number of NOTs: each layer wraps with NOT(...).
			// NOT ((NOT ((NOT (x_cond)))))
			name:    "triple NOT via nested parens",
			expr:    "NOT (NOT (NOT x = 'x'))",
			wantRSB: "WHERE NOT ((NOT ((NOT (x_cond)))))",
			wantSB:  "WHERE true",
		},
		{
			// Both branches are attribute → TrueConditionLiteral;
			// AND propagates TrueConditionLiteral; VisitPrimary passes through;
			// NOT(TrueConditionLiteral) → TrueConditionLiteral.
			name:    "NOT of parenthesized all-attribute AND",
			expr:    "NOT (a = 'a' AND b = 'b')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (((a_cond AND b_cond)))",
		},
		{
			// a→TrueConditionLiteral short-circuits OR; paren passes through;
			// NOT(TrueConditionLiteral) → TrueConditionLiteral.
			name:    "NOT of parenthesized mixed OR attr short-circuits",
			expr:    "NOT (a = 'a' OR x = 'x')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (((a_cond OR x_cond)))",
		},
		{
			// __all__ variable shortcircuit only applies to IN/NOT IN.
			// For equality, the variable resolves to the literal "__all__" string
			// and ConditionFor is called normally.
			name:    "equality with __all__ variable no shortcircuit",
			expr:    "a = $service",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// value1 is float64, value2 is string → type mismatch error
			// in VisitComparison before ConditionFor is ever called.
			name:       "BETWEEN type mismatch number vs string",
			expr:       "x BETWEEN 1 AND 'z'",
			wantErrRSB: true,
			wantSB:     "WHERE true",
		},
		{
			// VisitValue returns bool for true/false; BETWEEN switch default → error.
			name:       "BETWEEN with boolean values",
			expr:       "x BETWEEN true AND false",
			wantErrRSB: true,
			wantSB:     "WHERE true",
		},
		{
			// Both operands are strings — valid; passes to ConditionFor.
			name:    "BETWEEN with string operands",
			expr:    "x BETWEEN 'x' AND 'z'",
			wantRSB: "WHERE x_cond",
			wantSB:  "WHERE true",
		},
		{
			// BETWEEN on attribute key.
			// RSB: a→TrueConditionLiteral; SB: a_cond.
			name:    "BETWEEN on attribute key",
			expr:    "a BETWEEN 1 AND 3",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// LIKE without wildcards still builds condition but produces a warning.
			name:    "LIKE without wildcards",
			expr:    "a LIKE 'hello'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Empty quoted string as the comparison value.
			name:    "empty quoted string value",
			expr:    "a = ''",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Boolean literal as the comparison value.
			// VisitValue returns Go bool; ConditionFor receives bool, not string.
			name:    "boolean literal value",
			expr:    "a = true",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Precedence: NOT binds tightest, then AND, then OR.
			// Parses as: (NOT a='v') OR (b='v' AND x='v')
			// RSB: NOT(true)→true; (true AND x_cond)→x_cond; true OR x_cond → true
			// SB:  NOT(a_cond) OR (b_cond AND x_cond)
			name:    "complex NOT OR AND precedence",
			expr:    "NOT a = 'a' OR b = 'b' AND x = 'x'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (a_cond) OR (b_cond AND x_cond))",
		},
		{
			// Double NOT of mixed AND — even number of NOTs cancels logically
			// but each wraps structurally.
			// RSB inner: a→true stripped; x_cond; paren→(x_cond);
			//   inner NOT→NOT ((x_cond)); paren→(NOT ((x_cond)));
			//   outer NOT→NOT ((NOT ((x_cond))))
			name:    "double NOT of mixed AND",
			expr:    "NOT (NOT (a = 'a' AND x = 'x'))",
			wantRSB: "WHERE NOT ((NOT ((x_cond))))",
			wantSB:  "WHERE NOT ((NOT ((a_cond))))",
		},
		{
			// EXISTS on attribute key.
			// RSB: a→TrueConditionLiteral via resourceConditionBuilder.
			name:    "EXISTS on attribute key",
			expr:    "a EXISTS",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// NOT at unary level wrapping EXISTS on attribute.
			// RSB: a EXISTS → TrueConditionLiteral; NOT(true) → true.
			name:    "NOT EXISTS unary on attribute key",
			expr:    "NOT a EXISTS",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (a_cond)",
		},
		{
			// Three NOTs in AND — only the resource NOT survives in RSB.
			// RSB: NOT(a→true)→true, NOT(b→true)→true both stripped;
			//      NOT(x_cond) remains.
			name:    "three NOTs in AND",
			expr:    "NOT a = 'a' AND NOT b = 'b' AND NOT x = 'x'",
			wantRSB: "WHERE NOT (x_cond)",
			wantSB:  "WHERE (NOT (a_cond) AND NOT (b_cond))",
		},
		{
			// Complex expression: left AND group + right OR group (parenthesized).
			// RSB: left (a→true stripped, x_cond); right (b→true short-circuits OR→true;
			//      paren passes through); AND: true stripped → (x_cond).
			name:    "paren-AND AND paren-OR mixed keys",
			expr:    "(a = 'a' AND x = 'x') AND (b = 'b' OR y = 'y')",
			wantRSB: "WHERE (x_cond)",
			wantSB:  "WHERE (((a_cond AND x_cond)) AND ((b_cond OR y_cond)))",
		},
		{
			// __all__ variable resolves to TrueConditionLiteral in IN, stripped by AND;
			// remaining y_cond wrapped in parens, then outer NOT wraps.
			name:    "NOT of paren with __all__ AND resource",
			expr:    "NOT (x IN $service AND y = 'y')",
			wantRSB: "WHERE NOT ((y_cond))",
			wantSB:  "WHERE true",
		},
		{
			// Two levels of NOT: unary NOT wrapping a comparison that itself
			// has NOT (NOT LIKE). The inner NOT is an operator (NotLike);
			// the outer NOT is structural.
			name:    "unary NOT wrapping comparison NOT LIKE",
			expr:    "NOT (a NOT LIKE '%a%')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT ((a_cond))",
		},
		{
			// All attribute keys in OR.
			// RSB: a→TrueConditionLiteral → first OR branch short-circuits → "true".
			// SB: all three conditions joined by OR.
			name:    "all attribute keys OR",
			expr:    "a = 'a' OR b = 'b' OR c = 'c'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (a_cond OR b_cond OR c_cond)",
		},
		{
			// NOT BETWEEN OR resource — NOT at unary level wrapping BETWEEN,
			// then OR'd with another resource key.
			name:    "NOT BETWEEN OR resource",
			expr:    "NOT x BETWEEN 1 AND 3 OR y = 'y'",
			wantRSB: "WHERE (NOT (x_cond) OR y_cond)",
			wantSB:  "WHERE (NOT (x_cond) OR y_cond)",
		},
		{
			// Boolean false literal (VisitValue returns Go bool false).
			name:    "boolean false literal value",
			expr:    "a = false",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Floating-point number (VisitValue returns float64).
			name:    "floating point value",
			expr:    "a = 3.14",
			wantRSB: "WHERE true",
			wantSB:  "WHERE a_cond",
		},
		{
			// Two NOT-paren groups OR'd.
			// RSB: left NOT(a AND b → true)→true → short-circuits OR.
			// SB (OR override): left NOT((a_cond AND b_cond)); right NOT((x_cond AND y_cond)); OR.
			name:    "two NOT-paren groups ORed",
			expr:    "NOT (a = 'a' AND b = 'b') OR NOT (x = 'x' AND y = 'y')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (((a_cond AND b_cond))) OR NOT (((x_cond AND y_cond))))",
		},
		{
			// Nested paren-OR inside AND inside OR.
			// RSB: inner (a OR b): a→true→short-circuits OR→true; (true) AND x: true
			//   stripped, x_cond remains; paren wraps AND result: (x_cond);
			//   outer OR y: ((x_cond) OR y_cond).
			// SB (OR override): inner paren→((a_cond OR b_cond)); AND x_cond:
			//   ((a_cond OR b_cond)) AND x_cond; paren wraps AND:
			//   ((((a_cond OR b_cond)) AND x_cond)); OR y_cond.
			name:    "nested paren-OR in AND in OR",
			expr:    "((a = 'a' OR b = 'b') AND x = 'x') OR y = 'y'",
			wantRSB: "WHERE ((x_cond) OR y_cond)",
			wantSB:  "WHERE (((((a_cond OR b_cond)) AND x_cond)) OR y_cond)",
		},
		{
			// Nested paren-OR inside OR inside OR.
			// RSB: inner (a OR b): a→true→short-circuits OR→true; (true) OR x: true
			//   short-circuits→true; outer OR y: true short-circuits→WHERE true.
			// SB (OR override): inner paren→((a_cond OR b_cond)); OR x_cond:
			//   ((a_cond OR b_cond)) OR x_cond; paren wraps OR:
			//   ((((a_cond OR b_cond)) OR x_cond)); OR y_cond.
			name:    "nested paren-OR in OR in OR",
			expr:    "((a = 'a' OR b = 'b') OR x = 'x') OR y = 'y'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (((((a_cond OR b_cond)) OR x_cond)) OR y_cond)",
		},
		{
			// Four mixed keys in AND (no OR → SB filters resource).
			// RSB: a,b→true stripped; x,y_cond remain → (x_cond AND y_cond).
			// SB: a,b→a_cond,b_cond; x,y filtered → (a_cond AND b_cond).
			name:    "four mixed keys in AND",
			expr:    "a = 'a' AND b = 'b' AND x = 'x' AND y = 'y'",
			wantRSB: "WHERE (x_cond AND y_cond)",
			wantSB:  "WHERE (a_cond AND b_cond)",
		},
		{
			// NOT of three-way OR (all key types mixed with OR override).
			// RSB: a→true→short-circuits OR→true; paren passes; NOT(true)→true.
			// SB (OR override): (a_cond OR b_cond OR x_cond); paren;
			//   NOT wraps.
			name:    "NOT of three-way OR",
			expr:    "NOT (a = 'a' OR b = 'b' OR x = 'x')",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT (((a_cond OR b_cond OR x_cond)))",
		},
		{
			// Triple NOT with OR inside (OR override).
			// RSB: innermost OR: a→true→short-circuit→true; each NOT(true)→true.
			// SB (OR override): innermost (a_cond OR x_cond); three NOT+paren layers.
			name:    "triple NOT with OR inside",
			expr:    "NOT (NOT (NOT (a = 'a' OR x = 'x')))",
			wantRSB: "WHERE true",
			wantSB:  "WHERE NOT ((NOT ((NOT (((a_cond OR x_cond)))))))",
		},
		{
			// NOT-paren mixed AND, OR'd with attr.
			// RSB: inner (a→true stripped, x_cond)→(x_cond); NOT((x_cond));
			//   OR with b→true→short-circuits→true.
			// SB (OR override): inner (a_cond AND x_cond)→((a_cond AND x_cond));
			//   NOT wraps; OR with b_cond.
			name:    "NOT paren mixed AND OR attr",
			expr:    "NOT (a = 'a' AND x = 'x') OR b = 'b'",
			wantRSB: "WHERE true",
			wantSB:  "WHERE (NOT (((a_cond AND x_cond))) OR b_cond)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			result, err := PrepareWhereClause(tt.expr, rsbOpts, 0, 0)

			assert.Equal(t, tt.wantErrRSB, err != nil, "resourceConditionBuilder: error expectation mismatch")

			if err == nil {
				expr, _ := result.WhereClause.Build()
				assert.Equal(t, tt.wantRSB, expr, "resourceConditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantRSB, expr)
			}

			result, err = PrepareWhereClause(tt.expr, sbOpts, 0, 0)
			assert.Equal(t, tt.wantErrSB, err != nil, "conditionBuilder: error expectation mismatch")

			if err == nil {
				expr, _ := result.WhereClause.Build()
				assert.Equal(t, tt.wantSB, expr, "conditionBuilder SQL mismatch:\n  want: %s\n   got: %s", tt.wantSB, expr)
			}

		})
	}
}
