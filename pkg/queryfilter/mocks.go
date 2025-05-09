package queryfilter

import (
	"context"
	"fmt"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// MockFieldMapper is a mock implementation of the FieldMapper interface for testing
type MockFieldMapper struct {
	// FieldForFunc defines the behavior of FieldFor
	FieldForFunc func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error)

	// ColumnForFunc defines the behavior of ColumnFor
	ColumnForFunc func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error)

	// ColumnExpressionForFunc defines the behavior of ColumnExpressionFor
	ColumnExpressionForFunc func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)

	// FieldForCalls tracks calls to FieldFor
	FieldForCalls []struct {
		Ctx context.Context
		Key *telemetrytypes.TelemetryFieldKey
	}

	// ColumnForCalls tracks calls to ColumnFor
	ColumnForCalls []struct {
		Ctx context.Context
		Key *telemetrytypes.TelemetryFieldKey
	}

	// ColumnExpressionForCalls tracks calls to ColumnExpressionFor
	ColumnExpressionForCalls []struct {
		Ctx  context.Context
		Key  *telemetrytypes.TelemetryFieldKey
		Keys map[string][]*telemetrytypes.TelemetryFieldKey
	}
}

// NewMockFieldMapper creates a new MockFieldMapper with default implementations
func NewMockFieldMapper() *MockFieldMapper {
	return &MockFieldMapper{
		FieldForFunc: func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
			// Default implementation maps the field name directly
			if key == nil {
				return "", fmt.Errorf("key is nil")
			}
			return key.Name, nil
		},

		ColumnForFunc: func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
			// Default implementation creates a basic column
			if key == nil {
				return nil, fmt.Errorf("key is nil")
			}
			return &schema.Column{
				Name: key.Name,
				Type: schema.ColumnTypeString, // Default type
			}, nil
		},

		ColumnExpressionForFunc: func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
			// Default implementation just returns the field name
			if key == nil {
				return "", fmt.Errorf("key is nil")
			}
			return key.Name, nil
		},
	}
}

// FieldFor is a mock implementation of FieldMapper.FieldFor
func (m *MockFieldMapper) FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	m.FieldForCalls = append(m.FieldForCalls, struct {
		Ctx context.Context
		Key *telemetrytypes.TelemetryFieldKey
	}{ctx, key})

	return m.FieldForFunc(ctx, key)
}

// ColumnFor is a mock implementation of FieldMapper.ColumnFor
func (m *MockFieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	m.ColumnForCalls = append(m.ColumnForCalls, struct {
		Ctx context.Context
		Key *telemetrytypes.TelemetryFieldKey
	}{ctx, key})

	return m.ColumnForFunc(ctx, key)
}

// ColumnExpressionFor is a mock implementation of FieldMapper.ColumnExpressionFor
func (m *MockFieldMapper) ColumnExpressionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	m.ColumnExpressionForCalls = append(m.ColumnExpressionForCalls, struct {
		Ctx  context.Context
		Key  *telemetrytypes.TelemetryFieldKey
		Keys map[string][]*telemetrytypes.TelemetryFieldKey
	}{ctx, key, keys})

	return m.ColumnExpressionForFunc(ctx, key, keys)
}

// Helper method to set custom behavior for FieldFor
func (m *MockFieldMapper) WithFieldFor(fn func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error)) *MockFieldMapper {
	m.FieldForFunc = fn
	return m
}

// Helper method to set custom behavior for ColumnFor
func (m *MockFieldMapper) WithColumnFor(fn func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error)) *MockFieldMapper {
	m.ColumnForFunc = fn
	return m
}

// Helper method to set custom behavior for ColumnExpressionFor
func (m *MockFieldMapper) WithColumnExpressionFor(fn func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error)) *MockFieldMapper {
	m.ColumnExpressionForFunc = fn
	return m
}

// MockConditionBuilder is a mock implementation of the ConditionBuilder interface for testing
type MockConditionBuilder struct {
	// ConditionForFunc defines the behavior of ConditionFor
	ConditionForFunc func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)

	// ConditionForCalls tracks calls to ConditionFor
	ConditionForCalls []struct {
		Ctx      context.Context
		Key      *telemetrytypes.TelemetryFieldKey
		Operator qbtypes.FilterOperator
		Value    any
		SB       *sqlbuilder.SelectBuilder
	}
}

// NewMockConditionBuilder creates a new MockConditionBuilder with default implementations
func NewMockConditionBuilder() *MockConditionBuilder {
	return &MockConditionBuilder{
		ConditionForFunc: func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
			// Default implementation creates a simple condition
			if key == nil {
				return "", fmt.Errorf("key is nil")
			}

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
func (m *MockConditionBuilder) ConditionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	m.ConditionForCalls = append(m.ConditionForCalls, struct {
		Ctx      context.Context
		Key      *telemetrytypes.TelemetryFieldKey
		Operator qbtypes.FilterOperator
		Value    any
		SB       *sqlbuilder.SelectBuilder
	}{ctx, key, operator, value, sb})

	return m.ConditionForFunc(ctx, key, operator, value, sb)
}

// Helper method to set custom behavior for ConditionFor
func (m *MockConditionBuilder) WithConditionFor(fn func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error)) *MockConditionBuilder {
	m.ConditionForFunc = fn
	return m
}

// Helper method to create a ConditionFor function that returns a specific result
func (m *MockConditionBuilder) WithFixedCondition(condition string, err error) *MockConditionBuilder {
	m.ConditionForFunc = func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
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

	m.ConditionForFunc = func(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
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
