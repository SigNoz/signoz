package telemetrytypes

import (
	"time"
)

// EvolutionFieldNameAll is the field name of an evolution entry that applies
// to every field of its column. A keys map carries those entries under it.
const EvolutionFieldNameAll = "__all__"

type EvolutionEntry struct {
	Signal       Signal       `json:"signal"`
	ColumnName   string       `json:"column_name"`
	ColumnType   string       `json:"column_type"`
	FieldContext FieldContext `json:"field_context"`
	FieldName    string       `json:"field_name"`
	ReleaseTime  time.Time    `json:"release_time"`
	Version      uint32       `json:"version"`
}

type EvolutionSelector struct {
	Signal       Signal
	FieldContext FieldContext
	FieldName    string
}

func (e *EvolutionSelector) QualifiedName() string {
	return e.Signal.StringValue() + ":" + e.FieldContext.StringValue() + ":" + e.FieldName
}

// NewColumnEvolutionsKey is the keys map entry that carries the column-wide
// evolutions of one signal and context.
func NewColumnEvolutionsKey(signal Signal, fieldContext FieldContext, evolutions []*EvolutionEntry) *TelemetryFieldKey {
	return &TelemetryFieldKey{Name: EvolutionFieldNameAll, Signal: signal, FieldContext: fieldContext, Evolutions: evolutions}
}

// ColumnEvolutions returns the column-wide evolutions keys carries for one
// signal and context.
func ColumnEvolutions(keys map[string][]*TelemetryFieldKey, signal Signal, fieldContext FieldContext) []*EvolutionEntry {
	var evolutions []*EvolutionEntry
	for _, key := range keys[EvolutionFieldNameAll] {
		if key.Signal == signal && key.FieldContext == fieldContext {
			evolutions = append(evolutions, key.Evolutions...)
		}
	}
	return evolutions
}
