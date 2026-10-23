package telemetrytypes

import (
	"time"
)

// EvolutionFieldNameAll is the field name of an evolution entry that applies
// to every field of its column.
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

func ColumnEvolutionsOf(columnEvolutions []*EvolutionEntry, signal Signal, fieldContext FieldContext) []*EvolutionEntry {
	var out []*EvolutionEntry
	for _, entry := range columnEvolutions {
		if entry.Signal == signal && entry.FieldContext == fieldContext {
			out = append(out, entry)
		}
	}
	return out
}
