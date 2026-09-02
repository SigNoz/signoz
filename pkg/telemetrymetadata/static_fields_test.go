package telemetrymetadata

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestStaticFieldMatches(t *testing.T) {
	hasError := tracestelemetryschema.CalculatedFields["has_error"]
	durationNano := tracestelemetryschema.IntrinsicFields["duration_nano"]
	dbName := tracestelemetryschema.CalculatedFields["db_name"]
	spanName := tracestelemetryschema.IntrinsicFields["name"]

	fuzzy := func(name string, ctx telemetrytypes.FieldContext, dt telemetrytypes.FieldDataType) *telemetrytypes.FieldKeySelector {
		return &telemetrytypes.FieldKeySelector{Name: name, FieldContext: ctx, FieldDataType: dt, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy}
	}
	exact := func(name string) *telemetrytypes.FieldKeySelector {
		return &telemetrytypes.FieldKeySelector{Name: name, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact}
	}

	t.Run("context must agree when requested", func(t *testing.T) {
		assert.True(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified)))
		assert.True(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextSpan, telemetrytypes.FieldDataTypeUnspecified)))
		assert.False(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextAttribute, telemetrytypes.FieldDataTypeUnspecified)))
		assert.False(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextResource, telemetrytypes.FieldDataTypeUnspecified)))
	})

	t.Run("data type must agree when requested, numerics as one family", func(t *testing.T) {
		assert.True(t, staticFieldMatches(durationNano, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeNumber)))
		assert.True(t, staticFieldMatches(durationNano, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeFloat64)))
		assert.True(t, staticFieldMatches(durationNano, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeInt64)))
		assert.False(t, staticFieldMatches(durationNano, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeString)))
		assert.False(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeString)))
		assert.True(t, staticFieldMatches(hasError, fuzzy("", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeBool)))
	})

	t.Run("fuzzy search is a case-insensitive substring like ILIKE", func(t *testing.T) {
		assert.True(t, staticFieldMatches(spanName, fuzzy("Name", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified)))
		assert.True(t, staticFieldMatches(dbName, fuzzy("NAME", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified)))
		assert.False(t, staticFieldMatches(hasError, fuzzy("name", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified)))
	})

	t.Run("exact search compares the whole name", func(t *testing.T) {
		assert.True(t, staticFieldMatches(spanName, exact("name")))
		assert.True(t, staticFieldMatches(spanName, exact("NAME")))
		assert.False(t, staticFieldMatches(dbName, exact("name")))
	})

	t.Run("any selector is enough", func(t *testing.T) {
		selectors := []*telemetrytypes.FieldKeySelector{
			fuzzy("nothing-like-this", telemetrytypes.FieldContextUnspecified, telemetrytypes.FieldDataTypeUnspecified),
			fuzzy("has_", telemetrytypes.FieldContextSpan, telemetrytypes.FieldDataTypeUnspecified),
		}
		assert.True(t, staticFieldMatchesAny(hasError, selectors))
		assert.False(t, staticFieldMatchesAny(dbName, selectors))
	})
}
