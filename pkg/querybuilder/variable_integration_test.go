package querybuilder

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
)

func TestWhereClauseVisitorVariableResolution(t *testing.T) {
	// Test that the visitor properly resolves variables in VisitValue

	variables := map[string]qbtypes.VariableItem{
		"service": {
			Type:  qbtypes.QueryVariableType,
			Value: "payment-service",
		},
		"status": {
			Type:  qbtypes.CustomVariableType,
			Value: []string{"200", "201"},
		},
		"all": {
			Type:  qbtypes.DynamicVariableType,
			Value: "__all__",
		},
	}

	t.Run("visitor resolves variable in value", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		opts := FilterExprVisitorOpts{
			FieldMapper:      &simpleFieldMapper{},
			ConditionBuilder: &simpleConditionBuilder{},
			FieldKeys:        make(map[string][]*telemetrytypes.TelemetryFieldKey),
			Builder:          sb,
			Variables:        variables,
		}

		visitor := newFilterExpressionVisitor(opts)
		assert.NotNil(t, visitor.variableResolver)

		// Test that the variable resolver is properly initialized
		assert.NotNil(t, visitor.variableResolver)

		// Test variable resolution
		value, skipFilter, err := visitor.variableResolver.ResolveVariable("service")
		assert.NoError(t, err)
		assert.Equal(t, "payment-service", value)
		assert.False(t, skipFilter)

		// Test __all__ variable
		value, skipFilter, err = visitor.variableResolver.ResolveVariable("all")
		assert.NoError(t, err)
		assert.True(t, skipFilter)
	})
}

// Simple mock implementations for testing

type simpleFieldMapper struct{}

func (m *simpleFieldMapper) FieldFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}

func (m *simpleFieldMapper) ColumnFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*schema.Column, error) {
	return nil, nil
}

func (m *simpleFieldMapper) ColumnExpressionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, error) {
	return key.Name, nil
}

type simpleConditionBuilder struct{}

func (m *simpleConditionBuilder) ConditionFor(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	return sb.Equal(key.Name, value), nil
}
