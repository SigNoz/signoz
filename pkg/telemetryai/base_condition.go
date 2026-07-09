package telemetryai

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// BaseConditionProvider defines which spans (and traces) are in scope, decoupled
// from the query. Swap it to redefine "an AI trace" without touching the builder.
//
// It only *declares* the gate (a grammar expression + its field keys); the builder
// resolves those keys through the field mapper, so all attribute access is
// materialization/evolution aware — no hardcoded map lookups.
type BaseConditionProvider interface {
	// FilterExpression is the grammar-level (EXISTS) gate, resolved via the visitor.
	FilterExpression() string
	// FieldKeys are the gate's keys: registered in metadata and used to build the
	// per-span mask (OR of resolved EXISTS conditions).
	FieldKeys() []*telemetrytypes.TelemetryFieldKey
}

// genAIBaseConditionProvider: an AI trace has >=1 gen_ai LLM, tool, or agent span.
type genAIBaseConditionProvider struct {
	keys []string
}

var _ BaseConditionProvider = (*genAIBaseConditionProvider)(nil)

func NewGenAIBaseConditionProvider() BaseConditionProvider {
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
	// Definitions (context/type) come from GenAIFieldDefinitions so they can't drift
	// from the canonical semconv keys; copy to take the address.
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(p.keys))
	for _, k := range p.keys {
		def := telemetrytypes.GenAIFieldDefinitions[k]
		keys = append(keys, &def)
	}
	return keys
}
