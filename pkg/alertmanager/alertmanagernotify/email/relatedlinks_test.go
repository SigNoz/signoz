package email

import (
	"strings"
	"testing"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestAppendRelatedLinkButtons(t *testing.T) {
	testCases := []struct {
		name          string
		annotations   model.LabelSet
		body          string
		expectedOrder []string
	}{
		{
			name:          "BothLinks_LogsBeforeTraces",
			annotations:   model.LabelSet{"related_traces": "https://signoz.example/traces?a=1", "related_logs": "https://signoz.example/logs?a=1"},
			body:          "<p>body</p>",
			expectedOrder: []string{"https://signoz.example/logs?a=1", "View Related Logs", "https://signoz.example/traces?a=1", "View Related Traces"},
		},
		{
			name:          "TracesOnly_SingleButton",
			annotations:   model.LabelSet{"related_traces": "https://signoz.example/traces?b=2"},
			body:          "<p>body</p>",
			expectedOrder: []string{"https://signoz.example/traces?b=2", "View Related Traces"},
		},
		{
			name:          "NoLinks_BodyUnchanged",
			annotations:   model.LabelSet{"summary": "s"},
			body:          "<p>body</p>",
			expectedOrder: nil,
		},
		{
			name:          "EmptyBody_NoButtons",
			annotations:   model.LabelSet{"related_logs": "https://signoz.example/logs?c=3"},
			body:          "",
			expectedOrder: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alerts := []*types.Alert{{Alert: model.Alert{Annotations: testCase.annotations}}}
			bodies := []string{testCase.body}

			appendRelatedLinkButtons(alerts, bodies)

			if testCase.expectedOrder == nil {
				assert.Equal(t, testCase.body, bodies[0])
				return
			}
			assert.True(t, strings.HasPrefix(bodies[0], testCase.body))
			last := -1
			for _, needle := range testCase.expectedOrder {
				idx := strings.Index(bodies[0], needle)
				assert.Greater(t, idx, last, needle)
				last = idx
			}
		})
	}
}
