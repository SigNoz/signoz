package quickfiltertypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewStorableQuickFilter(t *testing.T) {
	serviceName := telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}

	testCases := []struct {
		name        string
		filter      telemetrytypes.TelemetryFieldKey
		rejectedKey string
	}{
		{name: "SupportedNumberField_Accepted", filter: telemetrytypes.TelemetryFieldKey{Name: "duration_nano", FieldContext: telemetrytypes.FieldContextSpan, FieldDataType: telemetrytypes.FieldDataTypeNumber}},
		{name: "TraceID_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "trace_id", FieldContext: telemetrytypes.FieldContextSpan, FieldDataType: telemetrytypes.FieldDataTypeString}, rejectedKey: "trace_id"},
		{name: "LogSpanID_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "span_id", FieldContext: telemetrytypes.FieldContextLog, FieldDataType: telemetrytypes.FieldDataTypeString}, rejectedKey: "span_id"},
		{name: "LegacyParentSpanID_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "parentSpanID", FieldContext: telemetrytypes.FieldContextSpan, FieldDataType: telemetrytypes.FieldDataTypeString}, rejectedKey: "parentSpanID"},
		{name: "LogBody_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "body", FieldContext: telemetrytypes.FieldContextLog, FieldDataType: telemetrytypes.FieldDataTypeString}, rejectedKey: "body"},
		{name: "GenAIInputTokens_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "gen_ai.usage.input_tokens", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber}, rejectedKey: "gen_ai.usage.input_tokens"},
		{name: "OpenInferenceTokenCount_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "llm.token_count.prompt", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber}, rejectedKey: "llm.token_count.prompt"},
		{name: "GenAITotalCost_Rejected", filter: telemetrytypes.TelemetryFieldKey{Name: "signoz.gen_ai.usage.tokens.cost", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber}, rejectedKey: "signoz.gen_ai.usage.tokens.cost"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := NewStorableQuickFilter(valuer.GenerateUUID(), SourceTraces, []telemetrytypes.TelemetryFieldKey{serviceName, testCase.filter})
			if testCase.rejectedKey == "" {
				assert.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			assert.Contains(t, err.Error(), testCase.rejectedKey)
		})
	}
}

func TestNewDefaultQuickFilterHasNoUnsupportedFields(t *testing.T) {
	defaults, err := NewDefaultQuickFilter(valuer.GenerateUUID())
	require.NoError(t, err)

	for _, storable := range defaults {
		sourceFilters, err := NewSourceFilterFromStorableQuickFilter(storable)
		require.NoError(t, err)
		for _, filter := range sourceFilters.Filters {
			_, unsupported := unsupportedFilterNames[filter.Name]
			assert.False(t, unsupported, "default %s quick filters contain %s", storable.Source.StringValue(), filter.Name)
		}
	}
}
