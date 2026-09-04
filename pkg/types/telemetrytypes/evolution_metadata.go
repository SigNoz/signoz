package telemetrytypes

import (
	"time"
)

// EvolutionFieldNameAll is the field_name of a column-wide (whole-signal-context) evolution
// entry, as opposed to a per-field promotion entry.
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
