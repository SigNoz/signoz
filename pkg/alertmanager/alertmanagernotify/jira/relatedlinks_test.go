package jira

import (
	"testing"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDeepLinks(t *testing.T) {
	testCases := []struct {
		name          string
		labels        model.LabelSet
		annotations   model.LabelSet
		expectedTexts []string
	}{
		{
			name:          "RuleSourceAndBothLinks_DotSeparatedInOrder",
			labels:        model.LabelSet{"ruleSource": "https://signoz.example/alerts?ruleId=1"},
			annotations:   model.LabelSet{"related_traces": "https://signoz.example/traces?a=1", "related_logs": "https://signoz.example/logs?a=1"},
			expectedTexts: []string{"Open in SigNoz", " · ", "View Related Logs", " · ", "View Related Traces"},
		},
		{
			name:          "TracesOnly_NoRuleSource",
			labels:        model.LabelSet{},
			annotations:   model.LabelSet{"related_traces": "https://signoz.example/traces?b=2"},
			expectedTexts: []string{"View Related Traces"},
		},
		{
			name:          "NoLinks_Nil",
			labels:        model.LabelSet{},
			annotations:   model.LabelSet{"summary": "s"},
			expectedTexts: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alerts := []*types.Alert{{Alert: model.Alert{Labels: testCase.labels, Annotations: testCase.annotations}}}

			paragraph := deepLinks(alerts)

			if testCase.expectedTexts == nil {
				assert.Nil(t, paragraph)
				return
			}
			require.NotNil(t, paragraph)
			content, ok := paragraph["content"].([]any)
			require.True(t, ok)
			texts := make([]string, 0, len(content))
			for _, part := range content {
				texts = append(texts, part.(map[string]any)["text"].(string))
			}
			assert.Equal(t, testCase.expectedTexts, texts)
		})
	}
}
