package ruletypes

import "strings"

const (
	TracesExplorerPath   = "traces-explorer"
	AITracesExplorerPath = "ai-observability/explorer"
)

// TracesExplorerPath is the UI path the alert's related_traces link opens.
func (t AlertType) TracesExplorerPath() string {
	if t == AlertTypeAITraces {
		return AITracesExplorerPath
	}
	return TracesExplorerPath
}

// RelatedTracesLabel is the button text notifiers show for a related_traces link.
func RelatedTracesLabel(link string) string {
	if strings.Contains(link, "/"+AITracesExplorerPath) {
		return "View Related AI Traces"
	}
	return "View Related Traces"
}
