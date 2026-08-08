package querybuilder

import (
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExistsExpressionUsesEveryPhysicalSemconvMember(t *testing.T) {
	key := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		SemconvMembers: []string{
			"deployment.environment.name",
			"deployment.environment",
		},
		SemconvMaterializedColumns: map[string]string{
			"deployment.environment": "attribute_string_deployment$$environment",
		},
	}
	columns := []*schema.Column{{
		Name: "attributes_string",
		Type: schema.MapColumnType{
			KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
			ValueType: schema.ColumnTypeString,
		},
	}}

	expression, err := ExistsExpression(columns, key, 0, 0, "unused", true)
	require.NoError(t, err)

	assert.Equal(
		t,
		"(mapContains(attributes_string, 'deployment.environment.name') OR `attribute_string_deployment$$environment_exists`)",
		expression,
	)
}
