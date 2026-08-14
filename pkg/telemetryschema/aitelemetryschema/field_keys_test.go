package aitelemetryschema

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

// an ingested variant wins, so a materialized or differently typed key is not
// shadowed by the static definition
func TestFieldKeys_IngestedGenAIAttributeKept(t *testing.T) {
	ingested := &telemetrytypes.TelemetryFieldKey{
		Name:          GenAIRequestModel,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
	}

	keys := FieldKeys(map[string][]*telemetrytypes.TelemetryFieldKey{
		GenAIRequestModel: {ingested},
	}, &telemetrytypes.FieldKeySelector{SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeFuzzy})

	assert.Equal(t, []*telemetrytypes.TelemetryFieldKey{ingested}, keys[GenAIRequestModel])
}
