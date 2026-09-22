package ruletypes

import "strings"

const (
	DefaultTracesExplorerPath = "traces-explorer"
	AIObservabilityPathPrefix = "ai-observability"
	AITracesExplorerPath      = AIObservabilityPathPrefix + "/explorer"
)

// TracesExplorerPath is the UI path the alert's related_traces link opens.
func (t AlertType) TracesExplorerPath() string {
	if t == AlertTypeAITraces {
		return AITracesExplorerPath
	}
	return DefaultTracesExplorerPath
}

// RelatedTracesLabel is the button text notifiers show for a related_traces link.
// Any link under the AI observability section counts, matching the templates'
// `match "/ai-observability"` check.
func RelatedTracesLabel(link string) string {
	if strings.Contains(link, "/"+AIObservabilityPathPrefix) {
		return "View Related AI Traces"
	}
	return "View Related Traces"
}
