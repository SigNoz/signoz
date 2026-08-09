package querybuilder

import (
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ExistsExpression is a per-physical-key primitive: family composition happens
// at the logical-field layer, so this only ever sees one spelling.
func TestExistsExpressionIsPerKey(t *testing.T) {
	columns := []*schema.Column{{
		Name: "attributes_string",
		Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		},
	}}

	plain := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	expression, err := ExistsExpression(columns, plain, 0, 0, "unused", true)
	require.NoError(t, err)
	assert.Equal(t, "mapContains(attributes_string, 'deployment.environment')", expression)

	materialized := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
	}
	expression, err = ExistsExpression(columns, materialized, 0, 0, "unused", false)
	require.NoError(t, err)
	assert.Equal(t, "NOT `attribute_string_deployment$$environment_exists`", expression)
}
