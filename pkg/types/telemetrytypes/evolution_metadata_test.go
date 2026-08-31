package telemetrytypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func entry(col, field string, rt time.Time) *EvolutionEntry {
	return &EvolutionEntry{
		Signal:       SignalTraces,
		ColumnName:   col,
		FieldContext: FieldContextAttribute,
		FieldName:    field,
		ReleaseTime:  rt,
	}
}

func columnNames(entries []*EvolutionEntry) []string {
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.ColumnName)
	}
	return out
}

func TestMergeEvolutions(t *testing.T) {
	epoch := time.Unix(0, 0)
	jsonRel := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	promoRel := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)

	columnWide := []*EvolutionEntry{
		entry("attributes_string", "__all__", epoch),
		entry("attributes", "__all__", jsonRel),
	}

	t.Run("no per-field returns column-wide unchanged", func(t *testing.T) {
		got := MergeEvolutions(columnWide, nil)
		assert.Equal(t, []string{"attributes_string", "attributes"}, columnNames(got))
	})

	t.Run("no column-wide returns per-field unchanged", func(t *testing.T) {
		perField := []*EvolutionEntry{entry("attributes_promoted", "span.operation", promoRel)}
		got := MergeEvolutions(nil, perField)
		assert.Equal(t, []string{"attributes_promoted"}, columnNames(got))
	})

	t.Run("promotion is additive: column-wide homes are kept", func(t *testing.T) {
		perField := []*EvolutionEntry{entry("attributes_promoted", "span.operation", promoRel)}
		got := MergeEvolutions(columnWide, perField)
		assert.ElementsMatch(t, []string{"attributes_string", "attributes", "attributes_promoted"}, columnNames(got))
	})

	t.Run("per-field overrides a column-wide entry for the same column", func(t *testing.T) {
		overrideRel := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC)
		perField := []*EvolutionEntry{entry("attributes", "span.operation", overrideRel)}
		got := MergeEvolutions(columnWide, perField)
		// attributes_string kept; the __all__ attributes entry is replaced by the per-field one
		assert.ElementsMatch(t, []string{"attributes_string", "attributes"}, columnNames(got))
		for _, e := range got {
			if e.ColumnName == "attributes" {
				assert.Equal(t, overrideRel, e.ReleaseTime, "per-field release time wins for the same column")
			}
		}
	})

	t.Run("both empty returns empty", func(t *testing.T) {
		assert.Empty(t, MergeEvolutions(nil, nil))
	})
}
