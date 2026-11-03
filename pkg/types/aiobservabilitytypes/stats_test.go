package aiobservabilitytypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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

func TestStatsFieldValueSelectors(t *testing.T) {
	now := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)

	selectors := StatsFieldValueSelectors(now)

	require.Len(t, selectors, 3)
	for _, selector := range selectors {
		assert.Equal(t, now.Add(-24*time.Hour).UnixMilli(), selector.StartUnixMilli, selector.Name)
		assert.Equal(t, telemetrytypes.SignalTraces, selector.Signal, selector.Name)
		assert.Equal(t, telemetrytypes.FieldContextAttribute, selector.FieldContext, selector.Name)
		assert.Equal(t, telemetrytypes.FieldDataTypeString, selector.FieldDataType, selector.Name)
	}
	assert.Equal(t, GenAIRequestModel, selectors[0].Name)
	assert.Equal(t, 100, selectors[0].Limit)
	assert.Equal(t, 1, selectors[1].Limit)
	assert.Equal(t, 1, selectors[2].Limit)
}
