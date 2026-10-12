package alertmanagertypes

import (
	"testing"

	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
)

func TestIsAITracesLink(t *testing.T) {
	testCases := []struct {
		name string
		link string
		want bool
	}{
		{name: "TracesExplorer", link: "https://signoz.example/traces-explorer?q=1", want: false},
		{name: "AITracesExplorer", link: "https://signoz.example/ai-observability/explorer?q=1", want: true},
		{name: "PrefixedInstall", link: "https://acme.com/signoz/ai-observability/explorer?q=1", want: true},
		{name: "Empty", link: "", want: false},
		{name: "AIObservabilityHost", link: "https://ai-observability.acme.com/traces-explorer", want: false},
		{name: "AIObservabilityPathLookalike", link: "https://acme.com/ai-observability-team/explorer", want: false},
		{name: "AIObservabilityInQuery", link: "https://acme.com/traces-explorer?q=/ai-observability/", want: false},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, IsAITracesLink(testCase.link))
		})
	}
}

func TestRelatedLinks(t *testing.T) {
	testCases := []struct {
		name        string
		annotations model.LabelSet
		want        []RelatedLink
	}{
		{
			name:        "NoAnnotations",
			annotations: model.LabelSet{"summary": "cpu is high"},
			want:        []RelatedLink{},
		},
		{
			name:        "LogsAndTraces_LogsFirst",
			annotations: model.LabelSet{AnnotationRelatedLogs: "https://signoz.example/logs/logs-explorer?a=1", AnnotationRelatedTraces: "https://signoz.example/traces-explorer?a=1"},
			want: []RelatedLink{
				{Label: "View Related Logs", URL: "https://signoz.example/logs/logs-explorer?a=1"},
				{Label: "View Related Traces", URL: "https://signoz.example/traces-explorer?a=1"},
			},
		},
		{
			name:        "AITraces",
			annotations: model.LabelSet{AnnotationRelatedTraces: "https://signoz.example/ai-observability/explorer?a=1"},
			want: []RelatedLink{
				{Label: "View Related AI Traces", URL: "https://signoz.example/ai-observability/explorer?a=1"},
			},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, RelatedLinks(testCase.annotations))
		})
	}
}
