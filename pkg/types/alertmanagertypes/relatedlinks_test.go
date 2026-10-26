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
		name     string
		alert    any
		expected []RelatedLink
	}{
		{
			name:  "ChannelAlert_Both_LogsFirst",
			alert: template.Alert{Annotations: template.KV{"related_traces": "https://signoz.io/traces-explorer?d=4", "related_logs": "https://signoz.io/logs/logs-explorer?d=4"}},
			expected: []RelatedLink{
				{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?d=4"},
				{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?d=4"},
			},
		},
		{
			name:     "ChannelAlertPointer_TracesOnly",
			alert:    &template.Alert{Annotations: template.KV{"related_traces": "https://signoz.io/traces-explorer?e=5"}},
			expected: []RelatedLink{{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?e=5"}},
		},
		{
			name:     "ChannelAlertNilPointer_NoLinks",
			alert:    (*template.Alert)(nil),
			expected: nil,
		},
		{
			name:     "RuleData_AnnotationsKV",
			alert:    map[string]any{"annotations": template.KV{"related_logs": "https://signoz.io/logs/logs-explorer?f=6"}, "labels": template.KV{"alertname": "a"}},
			expected: []RelatedLink{{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?f=6"}},
		},
		{
			name:     "RuleData_AnnotationsMapStringAny",
			alert:    map[string]any{"annotations": map[string]any{"related_traces": "https://signoz.io/traces-explorer?g=7"}},
			expected: []RelatedLink{{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?g=7"}},
		},
		{
			name:     "RuleData_AnnotationsMapStringString",
			alert:    map[string]any{"annotations": map[string]string{"related_logs": "https://signoz.io/logs/logs-explorer?h=8"}},
			expected: []RelatedLink{{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?h=8"}},
		},
		{
			name:  "RuleData_FlattenedKeysOnly",
			alert: map[string]any{"related_logs": "https://signoz.io/logs/logs-explorer?i=9", "related_traces": "https://signoz.io/traces-explorer?i=9"},
			expected: []RelatedLink{
				{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?i=9"},
				{Label: "View Related Traces", URL: "https://signoz.io/traces-explorer?i=9"},
			},
		},
		{
			name:     "RuleData_AnnotationsEmpty_FallsBackToFlattened",
			alert:    map[string]any{"annotations": template.KV{}, "related_logs": "https://signoz.io/logs/logs-explorer?j=10"},
			expected: []RelatedLink{{Label: "View Related Logs", URL: "https://signoz.io/logs/logs-explorer?j=10"}},
		},
		{
			name:     "RuleData_NonStringValues_Ignored",
			alert:    map[string]any{"annotations": map[string]any{"related_logs": 42}, "related_traces": nil},
			expected: nil,
		},
		{
			name:     "Nil_NoLinks",
			alert:    nil,
			expected: nil,
		},
		{
			name:     "UnsupportedShape_NoLinks",
			alert:    template.KV{"related_logs": "https://signoz.io/logs/logs-explorer?k=11"},
			expected: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, buildRelatedLinksFromTemplateData(testCase.alert))
		})
	}
}
