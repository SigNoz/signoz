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

func GetEvolutionMetadataUniqueKey(selector *EvolutionSelector) string {
	return selector.Signal.StringValue() + ":" + selector.FieldContext.StringValue() + ":" + selector.FieldName
}
