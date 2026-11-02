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
			name: "EmptyAndMissingLookups_OnlyLookedUpKeysReported",
			values: map[string]*telemetrytypes.TelemetryFieldValues{
				GenAIRequestModel:  {StringValues: []string{"gpt-5-nano", "claude-haiku-5-5"}},
				GenAIToolName:      {},
				GenAIOperationName: {StringValues: []string{"chat"}},
			},
			want: map[string]any{
				"telemetry.traces.gen_ai.request.model.count": int64(2),
				"telemetry.traces.gen_ai.tool.name.count":     int64(0),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewStatsFromFieldValues(testCase.values))
		})
	}
}
