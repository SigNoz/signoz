package ruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRelatedTracesLabel(t *testing.T) {
	testCases := []struct {
		name string
		link string
		want string
	}{
		{name: "TracesExplorer", link: "https://signoz.example/traces-explorer?q=1", want: "View Related Traces"},
		{name: "AITracesExplorer", link: "https://signoz.example/ai-observability/explorer?q=1", want: "View Related AI Traces"},
		{name: "Empty", link: "", want: "View Related Traces"},
		{name: "AIObservabilityHost", link: "https://ai-observability.acme.com/traces-explorer", want: "View Related Traces"},
		{name: "AIObservabilityPathLookalike", link: "https://acme.com/ai-observability-team/explorer", want: "View Related Traces"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, RelatedTracesLabel(testCase.link))
		})
	}
}

func TestTracesExplorerPath(t *testing.T) {
	testCases := []struct {
		name      string
		alertType AlertType
		want      string
	}{
		{name: "Metric", alertType: AlertTypeMetric, want: DefaultTracesExplorerPath},
		{name: "Traces", alertType: AlertTypeTraces, want: DefaultTracesExplorerPath},
		{name: "Logs", alertType: AlertTypeLogs, want: DefaultTracesExplorerPath},
		{name: "Exceptions", alertType: AlertTypeExceptions, want: DefaultTracesExplorerPath},
		{name: "AITraces", alertType: AlertTypeAITraces, want: AITracesExplorerPath},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.alertType.TracesExplorerPath())
		})
	}
}
