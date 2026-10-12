package ruletypes

import "github.com/SigNoz/signoz/pkg/types/alertmanagertypes"

const (
	DefaultTracesExplorerPath = "traces-explorer"
	AITracesExplorerPath      = alertmanagertypes.AIObservabilityPathPrefix + "/explorer"
)

// TracesExplorerPath is the UI path the alert's related-traces link opens.
func (t AlertType) TracesExplorerPath() string {
	if t == AlertTypeAITraces {
		return AITracesExplorerPath
	}
	return DefaultTracesExplorerPath
}
