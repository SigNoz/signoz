package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTelemetryFieldKeyCopyOwnsMutableState(t *testing.T) {
	original := &TelemetryFieldKey{
		Name:          "items.name",
		FieldContext:  FieldContextBody,
		FieldDataType: FieldDataTypeString,
		Indexes: []TelemetryFieldKeySkipIndex{
			{Name: "items.name"},
		},
		Evolutions: []*EvolutionEntry{
			{FieldName: "items.name"},
		},
	}
	require.NoError(t, original.SetJSONAccessPlan(JSONColumnMetadata{BaseColumn: "body_v2"}, nil))
	require.Len(t, original.JSONPlan, 1)
	require.NotNil(t, original.JSONPlan[0].TerminalConfig)

	copied := original.Copy()
	require.NotNil(t, copied)
	require.NotSame(t, original, copied)
	require.Len(t, copied.JSONPlan, 1)
	require.NotNil(t, copied.JSONPlan[0].TerminalConfig)

	assert.NotSame(t, original.JSONPlan[0], copied.JSONPlan[0])
	assert.NotSame(t, original.JSONPlan[0].Parent, copied.JSONPlan[0].Parent)
	assert.Same(t, copied, copied.JSONPlan[0].TerminalConfig.Key)
	assert.Equal(t, original.JSONPlan[0].Alias(), copied.JSONPlan[0].Alias())

	copied.Name = "changed"
	copied.Indexes[0].Name = "changed"
	copied.Evolutions[0].FieldName = "changed"
	copied.JSONPlan[0].Name = "changed"
	copied.JSONPlan[0].Parent.Name = "changed"

	assert.Equal(t, "items.name", original.Name)
	assert.Equal(t, "items.name", original.Indexes[0].Name)
	assert.Equal(t, "items.name", original.Evolutions[0].FieldName)
	assert.Equal(t, "items.name", original.JSONPlan[0].Name)
	assert.Equal(t, "body_v2", original.JSONPlan[0].Parent.Name)
}

func TestFieldKeySelectorCopyOwnsMetricContext(t *testing.T) {
	original := &FieldKeySelector{
		Name: "state",
		MetricContext: &MetricContext{
			MetricName:      "system.cpu.time",
			MetricNamespace: "system",
		},
	}

	copied := original.Copy()
	require.NotNil(t, copied)
	require.NotNil(t, copied.MetricContext)
	assert.NotSame(t, original.MetricContext, copied.MetricContext)

	copied.Name = "changed"
	copied.MetricContext.MetricName = "changed"

	assert.Equal(t, "state", original.Name)
	assert.Equal(t, "system.cpu.time", original.MetricContext.MetricName)
}

func TestNilFieldCopies(t *testing.T) {
	assert.Nil(t, (*TelemetryFieldKey)(nil).Copy())
	assert.Nil(t, (*FieldKeySelector)(nil).Copy())
	assert.Nil(t, (*MetricContext)(nil).Copy())
}
