package slack

import (
	"testing"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestBuildRelatedLinkActions(t *testing.T) {
	testCases := []struct {
		name        string
		annotations model.LabelSet
		expected    []config.SlackAction
	}{
		{
			name:        "BothLinks_LogsBeforeTraces",
			annotations: model.LabelSet{"related_traces": "https://signoz.example/traces?a=1", "related_logs": "https://signoz.example/logs?a=1"},
			expected: []config.SlackAction{
				{Type: "button", Text: "View Related Logs", URL: "https://signoz.example/logs?a=1"},
				{Type: "button", Text: "View Related Traces", URL: "https://signoz.example/traces?a=1"},
			},
		},
		{
			name:        "LogsOnly_SingleAction",
			annotations: model.LabelSet{"related_logs": "https://signoz.example/logs?b=2"},
			expected:    []config.SlackAction{{Type: "button", Text: "View Related Logs", URL: "https://signoz.example/logs?b=2"}},
		},
		{
			name:        "NoLinks_Nil",
			annotations: model.LabelSet{"summary": "s"},
			expected:    nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alert := &types.Alert{Alert: model.Alert{Annotations: testCase.annotations}}
			assert.Equal(t, testCase.expected, buildRelatedLinkActions(alert))
		})
	}
}
