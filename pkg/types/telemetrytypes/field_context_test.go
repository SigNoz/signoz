package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFieldContextMetricAttrType(t *testing.T) {
	testCases := []struct {
		name     string
		context  FieldContext
		expected string
	}{
		{name: "Attribute_Point", context: FieldContextAttribute, expected: "point"},
		{name: "Resource_Resource", context: FieldContextResource, expected: "resource"},
		{name: "Scope_Scope", context: FieldContextScope, expected: "scope"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, testCase.context.MetricAttrType())
		})
	}
}
