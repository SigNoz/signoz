package telemetrylogs

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestJSONFieldResolver_BuildJSONFieldExpressionForExists(t *testing.T) {
	// Test the exists expression building without database dependency
	key := &telemetrytypes.TelemetryFieldKey{
		Name: "body.user.name",
	}

	// Create a minimal resolver for testing (without database)
	resolver := &JSONFieldResolver{
		cache: make(map[string][]string),
	}

	// Mock the types for this path
	resolver.cache["user.name"] = []string{"String", "Array(String)"}

	expression, err := resolver.BuildJSONFieldExpressionForExists(context.Background(), key)

	assert.NoError(t, err)
	// Should contain both scalar and array existence checks
	assert.Contains(t, expression, "isNotNull(dynamicElement(body_v2.user.name, 'String'))")
	assert.Contains(t, expression, "length(dynamicElement(body_v2.user.name, 'Array(String)')) > 0")
	assert.Contains(t, expression, " OR ")
}

func TestJSONFieldResolver_MapToClickHouseType(t *testing.T) {
	// Test the type mapping function
	resolver := &JSONFieldResolver{
		cache: make(map[string][]string),
	}

	testCases := []struct {
		input    string
		expected string
	}{
		{"string", "String"},
		{"int", "Int64"},
		{"int64", "Int64"},
		{"float", "Float64"},
		{"float64", "Float64"},
		{"bool", "Bool"},
		{"boolean", "Bool"},
		{"array", "Array(Dynamic)"},
		{"object", "JSON"},
		{"json", "JSON"},
		{"unknown", "String"}, // default case
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := resolver.mapToClickHouseType(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestJSONFieldResolver_ContextAwareFilter(t *testing.T) {
	// Test context-aware filter expression building
	key := &telemetrytypes.TelemetryFieldKey{
		Name: "body.user.tags",
	}

	// Create a minimal resolver for testing (without database)
	resolver := &JSONFieldResolver{
		cache: make(map[string][]string),
	}

	// Mock the types for this path - both scalar and array
	resolver.cache["user.tags"] = []string{"String", "Array(String)"}

	// Test EQUAL operator - should prefer scalar
	expression, err := resolver.BuildJSONFieldExpressionForFilter(context.Background(), key, qbtypes.FilterOperatorEqual)
	assert.NoError(t, err)
	assert.Equal(t, "dynamicElement(body_v2.user.tags, 'String')", expression)

	// Test CONTAINS operator - should use both scalar and array
	expression, err = resolver.BuildJSONFieldExpressionForFilter(context.Background(), key, qbtypes.FilterOperatorContains)
	assert.NoError(t, err)
	assert.Contains(t, expression, "dynamicElement(body_v2.user.tags, 'String')")
	assert.Contains(t, expression, "arrayExists(x -> x, dynamicElement(body_v2.user.tags, 'Array(String)'))")
	assert.Contains(t, expression, " OR ")
}

func TestFeatureFlagIntegration(t *testing.T) {
	// Test that feature flag functions exist and can be called
	ctx := context.Background()

	// Test IsBodyJSONQueryEnabled function exists
	enabled := IsBodyJSONQueryEnabled(ctx)

	// Should return false by default (no feature flags in context)
	assert.False(t, enabled)
}
