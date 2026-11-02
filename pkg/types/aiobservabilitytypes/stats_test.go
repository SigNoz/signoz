package aiobservabilitytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestNewStatsFromFieldValues(t *testing.T) {
	testCases := []struct {
		name   string
		values map[string]*telemetrytypes.TelemetryFieldValues
		want   map[string]any
	}{
		{
			name: "NoLookups_NothingReported",
			want: map[string]any{},
		},
		{
			name: "EveryKeySeen_AllTrue",
			values: map[string]*telemetrytypes.TelemetryFieldValues{
				GenAIRequestModel: {StringValues: []string{"gpt-5-nano"}},
				GenAIToolName:     {StringValues: []string{"search"}},
				GenAIAgentName:    {StringValues: []string{"planner"}},
			},
			want: map[string]any{
				"telemetry.traces.gen_ai.request.model.exists": true,
				"telemetry.traces.gen_ai.tool.name.exists":     true,
				"telemetry.traces.gen_ai.agent.name.exists":    true,
			},
		},
		{
			name: "EmptyAndMissingLookups_OnlyLookedUpKeysReported",
			values: map[string]*telemetrytypes.TelemetryFieldValues{
				GenAIRequestModel:  {StringValues: []string{"gpt-5-nano"}},
				GenAIToolName:      {},
				GenAIOperationName: {StringValues: []string{"chat"}},
			},
			want: map[string]any{
				"telemetry.traces.gen_ai.request.model.exists": true,
				"telemetry.traces.gen_ai.tool.name.exists":     false,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewStatsFromFieldValues(testCase.values))
		})
	}
}
