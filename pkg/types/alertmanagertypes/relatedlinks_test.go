package alertmanagertypes

import (
	"testing"

	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestBuildRelatedLinks(t *testing.T) {
	testCases := []struct {
		name        string
		annotations model.LabelSet
		expected    []RelatedLink
	}{
		{
			name:        "Both_LogsFirst",
			annotations: model.LabelSet{"related_traces": "https://signoz.io/traces-explorer?a=1", "related_logs": "https://signoz.io/logs/logs-explorer?a=1"},
			expected: []RelatedLink{
				{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?a=1"},
				{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?a=1"},
			},
		},
		{
			name:        "LogsOnly",
			annotations: model.LabelSet{"related_logs": "https://signoz.io/logs/logs-explorer?b=2", "summary": "s"},
			expected:    []RelatedLink{{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?b=2"}},
		},
		{
			name:        "TracesOnly",
			annotations: model.LabelSet{"related_traces": "https://signoz.io/traces-explorer?c=3"},
			expected:    []RelatedLink{{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?c=3"}},
		},
		{
			name:        "EmptyValues_NoLinks",
			annotations: model.LabelSet{"related_logs": "", "related_traces": ""},
			expected:    nil,
		},
		{
			name:        "Nil_NoLinks",
			annotations: nil,
			expected:    nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, BuildRelatedLinks(testCase.annotations))
		})
	}
}

func TestBuildRelatedLinksFromTemplateData(t *testing.T) {
	testCases := []struct {
		name        string
		annotations any
		expected    []RelatedLink
	}{
		{
			name:        "KV_Both_LogsFirst",
			annotations: template.KV{"related_traces": "https://signoz.io/traces-explorer?d=4", "related_logs": "https://signoz.io/logs/logs-explorer?d=4"},
			expected: []RelatedLink{
				{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?d=4"},
				{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?d=4"},
			},
		},
		{
			name:        "MapStringString_TracesOnly",
			annotations: map[string]string{"related_traces": "https://signoz.io/traces-explorer?e=5"},
			expected:    []RelatedLink{{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?e=5"}},
		},
		{
			name:        "MapStringAny_StringValue",
			annotations: map[string]any{"related_logs": "https://signoz.io/logs/logs-explorer?f=6"},
			expected:    []RelatedLink{{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?f=6"}},
		},
		{
			name:        "MapStringAny_NonStringValue_Ignored",
			annotations: map[string]any{"related_logs": 42, "related_traces": nil},
			expected:    nil,
		},
		{
			name:        "Nil_NoLinks",
			annotations: nil,
			expected:    nil,
		},
		{
			name:        "UnsupportedShape_NoLinks",
			annotations: "related_logs=https://signoz.io",
			expected:    nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, buildRelatedLinksFromTemplateData(testCase.annotations))
		})
	}
}
