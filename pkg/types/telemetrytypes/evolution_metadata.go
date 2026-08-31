package telemetrytypes

import (
	"time"
)

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

// MergeEvolutions composes a key's column-wide (field_name "__all__") evolution entries with its
// per-field entries. The column-wide entries are the base physical homes shared by every field in
// the context; the per-field entries add homes specific to this one field (e.g. a promoted path's
// dedicated column). A per-field entry overrides a column-wide entry for the SAME column; for a
// new column it is purely additive. Without this a per-field entry would replace the column-wide
// homes entirely, so a promoted key would lose the Map/base-JSON homes it still needs for time
// ranges before it was promoted. Order is not significant — SelectEvolutionsForColumns re-sorts
// by release time.
func MergeEvolutions(columnWide, perField []*EvolutionEntry) []*EvolutionEntry {
	if len(perField) == 0 {
		return columnWide
	}
	if len(columnWide) == 0 {
		return perField
	}
	overriddenColumns := make(map[string]struct{}, len(perField))
	for _, e := range perField {
		if e != nil {
			overriddenColumns[e.ColumnName] = struct{}{}
		}
	}
	merged := make([]*EvolutionEntry, 0, len(columnWide)+len(perField))
	for _, e := range columnWide {
		if e == nil {
			continue
		}
		if _, ok := overriddenColumns[e.ColumnName]; ok {
			continue
		}
		merged = append(merged, e)
	}
	return append(merged, perField...)
}
