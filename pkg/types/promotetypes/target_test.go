package promotetypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTargetFromPath(t *testing.T) {
	testCases := []struct {
		name       string
		signal     string
		context    string
		wantErr    bool
		wantTarget Target
	}{
		{name: "LogsBody_Resolved", signal: "logs", context: "body", wantTarget: NewLogsBodyTarget()},
		{name: "TracesAttributes_Resolved", signal: "traces", context: "attribute", wantTarget: NewTracesAttributesTarget()},
		{name: "InvalidSignal_Rejected", signal: "span", context: "attribute", wantErr: true},
		{name: "InvalidContext_Rejected", signal: "traces", context: "header", wantErr: true},
		{name: "UnsupportedPair_Rejected", signal: "metrics", context: "attribute", wantErr: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			target, err := NewTargetFromPath(testCase.signal, testCase.context)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.wantTarget, target)
		})
	}
}
