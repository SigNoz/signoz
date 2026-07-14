package telemetryai

import (
	"strings"

	scopedtraces "github.com/SigNoz/signoz/pkg/telemetryscopedtraces"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// genAIBaseConditionProvider: an AI trace has >=1 gen_ai LLM, tool, or agent span.
type genAIBaseConditionProvider struct {
	keys []string
}

var _ scopedtraces.BaseConditionProvider = (*genAIBaseConditionProvider)(nil)

func NewGenAIBaseConditionProvider() scopedtraces.BaseConditionProvider {
	return &genAIBaseConditionProvider{
		keys: []string{telemetrytypes.GenAIRequestModel, telemetrytypes.GenAIToolName, telemetrytypes.GenAIAgentName},
	}
}

func (p *genAIBaseConditionProvider) FilterExpression() string {
	parts := make([]string, 0, len(p.keys))
	for _, k := range p.keys {
		parts = append(parts, k+" EXISTS")
	}
	return strings.Join(parts, " OR ")
}

func (p *genAIBaseConditionProvider) FieldKeys() []*telemetrytypes.TelemetryFieldKey {
	// Definitions come from GenAIFieldDefinitions so they can't drift from the
	// canonical semconv keys; copy to take the address.
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(p.keys))
	for _, k := range p.keys {
		def := telemetrytypes.GenAIFieldDefinitions[k]
		keys = append(keys, &def)
	}
	return keys
}
