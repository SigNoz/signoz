package queryfilter

import (
	"context"
	"fmt"
	"strings"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// MockFieldMapper is a mock implementation of the FieldMapper interface for testing
type MockFieldMapper struct {
	// FieldForFunc defines the behavior of FieldFor
	FieldForFunc func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error)

	// ColumnForFunc defines the behavior of ColumnFor
	ColumnForFunc func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error)

	// ColumnExpressionForFunc defines the behavior of ColumnExpressionFor
	ColumnExpressionForFunc func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, keys map[string][]telemetrytypes.TelemetryFieldKey) (string, error)

	// FieldForCalls tracks calls to FieldFor
	FieldForCalls []struct {
		Ctx context.Context
		Key telemetrytypes.TelemetryFieldKey
	}

	// ColumnForCalls tracks calls to ColumnFor
	ColumnForCalls []struct {
		Ctx context.Context
		Key telemetrytypes.TelemetryFieldKey
	}

	// ColumnExpressionForCalls tracks calls to ColumnExpressionFor
	ColumnExpressionForCalls []struct {
		Ctx  context.Context
		Key  telemetrytypes.TelemetryFieldKey
		Keys map[string][]telemetrytypes.TelemetryFieldKey
	}
}

// NewMockFieldMapper creates a new MockFieldMapper with default implementations
func NewMockFieldMapper() *MockFieldMapper {
	return &MockFieldMapper{
		FieldForFunc: func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
			return key.Name, nil
		},

		ColumnForFunc: func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
			return &schema.Column{
				Name: key.Name,
				Type: schema.ColumnTypeString, // Default type
			}, nil
		},

		ColumnExpressionForFunc: func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, keys map[string][]telemetrytypes.TelemetryFieldKey) (string, error) {
			return key.Name, nil
		},
	}
}

// FieldFor is a mock implementation of FieldMapper.FieldFor
func (m *MockFieldMapper) FieldFor(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error) {
	m.FieldForCalls = append(m.FieldForCalls, struct {
		Ctx context.Context
		Key telemetrytypes.TelemetryFieldKey
	}{ctx, key})

	return m.FieldForFunc(ctx, key)
}

// ColumnFor is a mock implementation of FieldMapper.ColumnFor
func (m *MockFieldMapper) ColumnFor(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	m.ColumnForCalls = append(m.ColumnForCalls, struct {
		Ctx context.Context
		Key telemetrytypes.TelemetryFieldKey
	}{ctx, key})

	return m.ColumnForFunc(ctx, key)
}

// ColumnExpressionFor is a mock implementation of FieldMapper.ColumnExpressionFor
func (m *MockFieldMapper) ColumnExpressionFor(ctx context.Context, key telemetrytypes.TelemetryFieldKey, keys map[string][]telemetrytypes.TelemetryFieldKey) (string, error) {
	m.ColumnExpressionForCalls = append(m.ColumnExpressionForCalls, struct {
		Ctx  context.Context
		Key  telemetrytypes.TelemetryFieldKey
		Keys map[string][]telemetrytypes.TelemetryFieldKey
	}{ctx, key, keys})

	return m.ColumnExpressionForFunc(ctx, key, keys)
}

// Helper method to set custom behavior for FieldFor
func (m *MockFieldMapper) WithFieldFor(fn func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (string, error)) *MockFieldMapper {
	m.FieldForFunc = fn
	return m
}

// Helper method to set custom behavior for ColumnFor
func (m *MockFieldMapper) WithColumnFor(fn func(ctx context.Context, key telemetrytypes.TelemetryFieldKey) (*schema.Column, error)) *MockFieldMapper {
	m.ColumnForFunc = fn
	return m
}

// Helper method to set custom behavior for ColumnExpressionFor
func (m *MockFieldMapper) WithColumnExpressionFor(fn func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, keys map[string][]telemetrytypes.TelemetryFieldKey) (string, error)) *MockFieldMapper {
	m.ColumnExpressionForFunc = fn
	return m
}

// MockConditionBuilder is a mock implementation of the ConditionBuilder interface for testing
type MockConditionBuilder struct {
	// ConditionForFunc defines the behavior of ConditionFor
	ConditionForFunc func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)

	// ConditionForCalls tracks calls to ConditionFor
	ConditionForCalls []struct {
		Ctx      context.Context
		Key      telemetrytypes.TelemetryFieldKey
		Operator qbtypes.FilterOperator
		Value    any
		SB       *sqlbuilder.SelectBuilder
	}
}

// NewMockConditionBuilder creates a new MockConditionBuilder with default implementations
func NewMockConditionBuilder() *MockConditionBuilder {
	return &MockConditionBuilder{
		ConditionForFunc: func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

			if sb == nil {
				sb = sqlbuilder.NewSelectBuilder()
			}

			switch operator {
			case qbtypes.FilterOperatorEqual:
				return fmt.Sprintf("%s = %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorNotEqual:
				return fmt.Sprintf("%s != %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorGreaterThan:
				return fmt.Sprintf("%s > %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorGreaterThanOrEq:
				return fmt.Sprintf("%s >= %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorLessThan:
				return fmt.Sprintf("%s < %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorLessThanOrEq:
				return fmt.Sprintf("%s <= %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorLike:
				return fmt.Sprintf("%s LIKE %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorNotLike:
				return fmt.Sprintf("%s NOT LIKE %s", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorIn:
				return fmt.Sprintf("%s IN (%s)", key.Name, sb.Var(value)), nil

			case qbtypes.FilterOperatorNotIn:
				return fmt.Sprintf("%s NOT IN (%s)", key.Name, sb.Var(value)), nil

			default:
				return "", fmt.Errorf("unsupported operator: %v", operator)
			}
		},
	}
}

// ConditionFor is a mock implementation of ConditionBuilder.ConditionFor
func (m *MockConditionBuilder) ConditionFor(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	m.ConditionForCalls = append(m.ConditionForCalls, struct {
		Ctx      context.Context
		Key      telemetrytypes.TelemetryFieldKey
		Operator qbtypes.FilterOperator
		Value    any
		SB       *sqlbuilder.SelectBuilder
	}{ctx, key, operator, value, sb})

	return m.ConditionForFunc(ctx, key, operator, value, sb)
}

// Helper method to set custom behavior for ConditionFor
func (m *MockConditionBuilder) WithConditionFor(fn func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)) *MockConditionBuilder {
	m.ConditionForFunc = fn
	return m
}

// Helper method to create a ConditionFor function that returns a specific result
func (m *MockConditionBuilder) WithFixedCondition(condition string, err error) *MockConditionBuilder {
	m.ConditionForFunc = func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
		return condition, err
	}
	return m
}

// Helper method to create a ConditionFor function that fails for specific operators
func (m *MockConditionBuilder) WithFailingOperators(operators ...qbtypes.FilterOperator) *MockConditionBuilder {
	failMap := make(map[qbtypes.FilterOperator]bool)
	for _, op := range operators {
		failMap[op] = true
	}

	m.ConditionForFunc = func(ctx context.Context, key telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
		if failMap[operator] {
			return "", fmt.Errorf("operator %v is not supported", operator)
		}

		if sb == nil {
			sb = sqlbuilder.NewSelectBuilder()
		}

		return fmt.Sprintf("%s %v %s", key.Name, operator, sb.Var(value)), nil
	}

	return m
}

// MockCompiler is a mock implementation of the Compiler interface for testing
type MockCompiler struct {
	// CompileFunc defines the behavior of Compile
	CompileFunc func(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error)

	// CompileCalls tracks calls to Compile
	CompileCalls []struct {
		Ctx    context.Context
		Filter string
	}
}

// NewMockCompiler creates a new MockCompiler with default implementations
func NewMockCompiler() *MockCompiler {
	return &MockCompiler{
		CompileFunc: func(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error) {
			// Default implementation returns a simple WHERE clause
			sb := sqlbuilder.NewSelectBuilder()
			sb.Where(filter)
			return sb.WhereClause, nil, nil
		},
	}
}

// Compile is a mock implementation of Compiler.Compile
func (m *MockCompiler) Compile(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error) {
	m.CompileCalls = append(m.CompileCalls, struct {
		Ctx    context.Context
		Filter string
	}{ctx, filter})

	return m.CompileFunc(ctx, filter)
}

// Helper method to set custom behavior for Compile
func (m *MockCompiler) WithCompile(fn func(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error)) *MockCompiler {
	m.CompileFunc = fn
	return m
}

// Helper method to create a Compile function that returns a specific result
func (m *MockCompiler) WithFixedResult(whereClause *sqlbuilder.WhereClause, warnings []error, err error) *MockCompiler {
	m.CompileFunc = func(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error) {
		return whereClause, warnings, err
	}
	return m
}

// Helper method to create a Compile function that returns different results based on the filter
func (m *MockCompiler) WithFilterBasedResults(results map[string]struct {
	WhereClause *sqlbuilder.WhereClause
	Warnings    []error
	Err         error
}) *MockCompiler {
	m.CompileFunc = func(ctx context.Context, filter string) (*sqlbuilder.WhereClause, []error, error) {
		if result, ok := results[filter]; ok {
			return result.WhereClause, result.Warnings, result.Err
		}

		// Default case
		sb := sqlbuilder.NewSelectBuilder()
		sb.Where(filter)
		return sb.WhereClause, nil, nil
	}
	return m
}

// MockMetadataStore implements the MetadataStore interface for testing purposes
type MockMetadataStore struct {
	// Maps to store test data
	KeysMap          map[string][]telemetrytypes.TelemetryFieldKey
	RelatedValuesMap map[string][]string
	AllValuesMap     map[string]*telemetrytypes.TelemetryFieldValues
}

// NewMockMetadataStore creates a new instance of MockMetadataStore with initialized maps
func NewMockMetadataStore() *MockMetadataStore {
	return &MockMetadataStore{
		KeysMap:          make(map[string][]telemetrytypes.TelemetryFieldKey),
		RelatedValuesMap: make(map[string][]string),
		AllValuesMap:     make(map[string]*telemetrytypes.TelemetryFieldValues),
	}
}

// GetKeys returns a map of field keys types.TelemetryFieldKey by name
func (m *MockMetadataStore) GetKeys(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) (map[string][]telemetrytypes.TelemetryFieldKey, error) {
	result := make(map[string][]telemetrytypes.TelemetryFieldKey)

	// If selector is nil, return all keys
	if fieldKeySelector == nil {
		return m.KeysMap, nil
	}

	// Apply selector logic
	for name, keys := range m.KeysMap {
		// Check if name matches
		if matchesName(fieldKeySelector, name) {
			filteredKeys := []telemetrytypes.TelemetryFieldKey{}
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					filteredKeys = append(filteredKeys, key)
				}
			}
			if len(filteredKeys) > 0 {
				result[name] = filteredKeys
			}
		}
	}

	return result, nil
}

// GetKeysMulti applies multiple selectors and returns combined results
func (m *MockMetadataStore) GetKeysMulti(ctx context.Context, fieldKeySelectors []telemetrytypes.FieldKeySelector) (map[string][]telemetrytypes.TelemetryFieldKey, error) {
	result := make(map[string][]telemetrytypes.TelemetryFieldKey)

	// Process each selector
	for _, selector := range fieldKeySelectors {
		selectorCopy := selector // Create a copy to avoid issues with pointer semantics
		selectorResults, err := m.GetKeys(ctx, &selectorCopy)
		if err != nil {
			return nil, err
		}

		// Merge results
		for name, keys := range selectorResults {
			if existingKeys, exists := result[name]; exists {
				// Merge without duplicates
				keySet := make(map[string]bool)
				for _, key := range existingKeys {
					keySet[keyIdentifier(key)] = true
				}

				for _, key := range keys {
					if !keySet[keyIdentifier(key)] {
						result[name] = append(result[name], key)
					}
				}
			} else {
				result[name] = keys
			}
		}
	}

	return result, nil
}

// GetKey returns a list of keys with the given name
func (m *MockMetadataStore) GetKey(ctx context.Context, fieldKeySelector *telemetrytypes.FieldKeySelector) ([]telemetrytypes.TelemetryFieldKey, error) {
	if fieldKeySelector == nil {
		return nil, nil
	}

	result := []telemetrytypes.TelemetryFieldKey{}

	// Find keys matching the selector
	for name, keys := range m.KeysMap {
		if matchesName(fieldKeySelector, name) {
			for _, key := range keys {
				if matchesKey(fieldKeySelector, key) {
					result = append(result, key)
				}
			}
		}
	}

	return result, nil
}

// GetRelatedValues returns a list of related values for the given key name and selection
func (m *MockMetadataStore) GetRelatedValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) ([]string, error) {
	if fieldValueSelector == nil {
		return nil, nil
	}

	// Generate a lookup key from the selector
	lookupKey := generateLookupKey(fieldValueSelector)

	if values, exists := m.RelatedValuesMap[lookupKey]; exists {
		return values, nil
	}

	// Return empty slice if no values found
	return []string{}, nil
}

// GetAllValues returns all values for a given field
func (m *MockMetadataStore) GetAllValues(ctx context.Context, fieldValueSelector *telemetrytypes.FieldValueSelector) (*telemetrytypes.TelemetryFieldValues, error) {
	if fieldValueSelector == nil {
		return nil, nil
	}

	// Generate a lookup key from the selector
	lookupKey := generateLookupKey(fieldValueSelector)

	if values, exists := m.AllValuesMap[lookupKey]; exists {
		return values, nil
	}

	// Return empty values object if not found
	return &telemetrytypes.TelemetryFieldValues{
		StringValues: []string{},
	}, nil
}

// Helper functions to avoid adding methods to structs

// matchesName checks if a field name matches the selector criteria
func matchesName(selector *telemetrytypes.FieldKeySelector, name string) bool {
	if selector == nil || selector.Name == "" {
		return true
	}

	if selector.SelectorMatchType.String == telemetrytypes.FieldSelectorMatchTypeExact.String {
		return selector.Name == name
	}

	// Fuzzy matching for FieldSelectorMatchTypeFuzzy
	return strings.Contains(strings.ToLower(name), strings.ToLower(selector.Name))
}

// matchesKey checks if a field key matches the selector criteria
func matchesKey(selector *telemetrytypes.FieldKeySelector, key telemetrytypes.TelemetryFieldKey) bool {
	if selector == nil {
		return true
	}

	// Check name (already checked in matchesName, but double-check here)
	if selector.Name != "" && !matchesName(selector, key.Name) {
		return false
	}

	// Check signal
	if selector.Signal.StringValue() != "" && selector.Signal.StringValue() != key.Signal.StringValue() {
		return false
	}

	// Check field context
	if selector.FieldContext.StringValue() != "" &&
		selector.FieldContext.StringValue() != telemetrytypes.FieldContextUnspecified.StringValue() &&
		selector.FieldContext.StringValue() != key.FieldContext.StringValue() {
		return false
	}

	// Check field data type
	if selector.FieldDataType.StringValue() != "" &&
		selector.FieldDataType.StringValue() != telemetrytypes.FieldDataTypeUnspecified.StringValue() &&
		selector.FieldDataType.StringValue() != key.FieldDataType.StringValue() {
		return false
	}

	return true
}

// keyIdentifier generates a unique identifier for the key
func keyIdentifier(key telemetrytypes.TelemetryFieldKey) string {
	return key.Name + "-" + key.FieldContext.StringValue() + "-" + key.FieldDataType.StringValue()
}

// generateLookupKey creates a lookup key for the selector
func generateLookupKey(selector *telemetrytypes.FieldValueSelector) string {
	if selector == nil {
		return ""
	}

	parts := []string{selector.Name}

	if selector.FieldKeySelector != nil {
		if selector.FieldKeySelector.Signal.StringValue() != "" {
			parts = append(parts, selector.FieldKeySelector.Signal.StringValue())
		}

		if selector.FieldKeySelector.FieldContext.StringValue() != "" &&
			selector.FieldKeySelector.FieldContext.StringValue() != telemetrytypes.FieldContextUnspecified.StringValue() {
			parts = append(parts, selector.FieldKeySelector.FieldContext.StringValue())
		}

		if selector.FieldKeySelector.FieldDataType.StringValue() != "" &&
			selector.FieldKeySelector.FieldDataType.StringValue() != telemetrytypes.FieldDataTypeUnspecified.StringValue() {
			parts = append(parts, selector.FieldKeySelector.FieldDataType.StringValue())
		}
	}

	if selector.ExistingQuery != "" {
		parts = append(parts, selector.ExistingQuery)
	}

	return strings.Join(parts, "-")
}

// AddKey adds a test key to the mock store
func (m *MockMetadataStore) AddKey(name string, key telemetrytypes.TelemetryFieldKey) {
	if _, exists := m.KeysMap[name]; !exists {
		m.KeysMap[name] = []telemetrytypes.TelemetryFieldKey{}
	}
	m.KeysMap[name] = append(m.KeysMap[name], key)
}

// SetRelatedValues sets related values for testing
func (m *MockMetadataStore) SetRelatedValues(lookupKey string, values []string) {
	m.RelatedValuesMap[lookupKey] = values
}

// SetAllValues sets all values for testing
func (m *MockMetadataStore) SetAllValues(lookupKey string, values *telemetrytypes.TelemetryFieldValues) {
	m.AllValuesMap[lookupKey] = values
}
