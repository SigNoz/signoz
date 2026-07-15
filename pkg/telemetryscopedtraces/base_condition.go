package telemetryscopedtraces

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// BaseConditionProvider defines which spans are in scope. It only declares the gate
// (a filter expression + its field keys); the builder resolves the keys through the
// field mapper, so attribute access stays materialization-aware.
type BaseConditionProvider interface {
	// FilterExpression is the grammar-level (EXISTS) gate, used on the delegated
	// span-list path.
	FilterExpression() string
	// FieldKeys are the gate's keys, used to build the per-span mask
	// (OR of resolved EXISTS conditions).
	FieldKeys() []*telemetrytypes.TelemetryFieldKey
}
