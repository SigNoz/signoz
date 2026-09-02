package telemetrymetadata

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestBoolFieldValues(t *testing.T) {
	assert.Equal(t, []bool{true, false}, boolFieldValues("").BoolValues)
	assert.Equal(t, []bool{true}, boolFieldValues("tr").BoolValues)
	assert.Equal(t, []bool{false}, boolFieldValues("FALSE").BoolValues)
	assert.Empty(t, boolFieldValues("maybe").BoolValues)
	assert.Empty(t, boolFieldValues("").StringValues)
}

func TestIsKnownBoolField(t *testing.T) {
	selector := func(name string, ctx telemetrytypes.FieldContext, dt telemetrytypes.FieldDataType) *telemetrytypes.FieldValueSelector {
		return &telemetrytypes.FieldValueSelector{FieldKeySelector: &telemetrytypes.FieldKeySelector{
			Name:          name,
			FieldContext:  ctx,
			FieldDataType: dt,
		}}
	}

	tracesStatics := []map[string]telemetrytypes.TelemetryFieldKey{tracestelemetryschema.IntrinsicFields, tracestelemetryschema.CalculatedFields}

	// the caller's data type wins in both directions
	assert.True(t, isKnownBoolField(selector("anything", telemetrytypes.FieldContextAttribute, telemetrytypes.FieldDataTypeBool), tracesStatics...))
	assert.False(t, isKnownBoolField(selector("has_error", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeString), tracesStatics...))

	// calculated bool span field, resolved by name when the type is not given
	assert.True(t, isKnownBoolField(selector("has_error", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified), tracesStatics...))
	assert.True(t, isKnownBoolField(selector("has_error", telemetrytypes.FieldContextSpan, telemetrytypes.FieldDataTypeUnspecified), tracesStatics...))
	// an attribute that happens to share the name is not the calculated field
	assert.False(t, isKnownBoolField(selector("has_error", telemetrytypes.FieldContextAttribute, telemetrytypes.FieldDataTypeUnspecified), tracesStatics...))

	// non-bool static fields and unknown names go to the database
	assert.False(t, isKnownBoolField(selector("http_method", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified), tracesStatics...))
	assert.False(t, isKnownBoolField(selector("http.conn.reused", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified), tracesStatics...))
	assert.False(t, isKnownBoolField(selector("severity_text", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified), logstelemetryschema.IntrinsicFields))
}
