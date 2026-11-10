package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSingleLogicalFieldSharesIdentityAndAliasesKey(t *testing.T) {
	key := &TelemetryFieldKey{
		Name:          "service.name",
		Signal:        SignalTraces,
		FieldContext:  FieldContextResource,
		FieldDataType: FieldDataTypeString,
	}

	logical := SingleLogicalField("resource.service.name", key)

	assert.Equal(t, "resource.service.name", logical.Name, "the identity is the spelling that the request used, not the stored spelling")
	assert.Equal(t, key.Signal, logical.Signal)
	assert.Equal(t, key.FieldContext, logical.FieldContext)
	assert.Equal(t, key.FieldDataType, logical.FieldDataType)
	assert.False(t, logical.IsFamily())
	assert.Same(t, key, logical.Single(), "the member points to the key; there is no copy")
}

func TestStringDelegatesForSingleMember(t *testing.T) {
	key := &TelemetryFieldKey{
		Name:          "service.name",
		FieldContext:  FieldContextResource,
		FieldDataType: FieldDataTypeString,
	}
	assert.Equal(t, key.String(), SingleLogicalField(key.Name, key).String(),
		"a message made from a single-member field must be the same as a message made from the key")
}

func TestStringListsFamilyMembers(t *testing.T) {
	logical := &LogicalField{
		Name:          "deployment.environment.name",
		Signal:        SignalTraces,
		FieldContext:  FieldContextResource,
		FieldDataType: FieldDataTypeString,
		Members: []*TelemetryFieldKey{
			{Name: "deployment.environment.name"},
			{Name: "deployment.environment"},
		},
	}
	assert.True(t, logical.IsFamily())
	assert.Equal(t, "deployment.environment.name(resource, string, members: deployment.environment.name, deployment.environment)", logical.String())
}
