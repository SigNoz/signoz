package telemetrytypestest

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMockStoreMergesPromotedEvolutions proves the metadata enrichment composes a promoted key's
// column-wide homes with its per-path promotion entry, rather than the per-path entry replacing
// the column-wide ones — so the key keeps the Map and base-JSON homes it needs before promotion.
func TestMockStoreMergesPromotedEvolutions(t *testing.T) {
	store := NewMockMetadataStore()

	key := &telemetrytypes.TelemetryFieldKey{
		Name:          "span.operation",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	store.KeysMap["span.operation"] = []*telemetrytypes.TelemetryFieldKey{key}

	epoch := time.Unix(0, 0)
	jsonRel := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	promoRel := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	mk := func(col string, rt time.Time, field string) *telemetrytypes.EvolutionEntry {
		return &telemetrytypes.EvolutionEntry{
			Signal: telemetrytypes.SignalTraces, ColumnName: col,
			FieldContext: telemetrytypes.FieldContextAttribute, FieldName: field, ReleaseTime: rt,
		}
	}
	store.ColumnEvolutionMetadataMap["traces:attribute:__all__"] = []*telemetrytypes.EvolutionEntry{
		mk("attributes_string", epoch, "__all__"),
		mk("attributes", jsonRel, "__all__"),
	}
	store.ColumnEvolutionMetadataMap["traces:attribute:span.operation"] = []*telemetrytypes.EvolutionEntry{
		mk("attributes_promoted", promoRel, "span.operation"),
	}

	selector := &telemetrytypes.FieldKeySelector{
		Name:              "span.operation",
		Signal:            telemetrytypes.SignalTraces,
		FieldContext:      telemetrytypes.FieldContextAttribute,
		SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
	}
	_, _, err := store.GetKeysMulti(context.Background(), valuer.UUID{}, []*telemetrytypes.FieldKeySelector{selector})
	require.NoError(t, err)

	cols := make([]string, 0, len(key.Evolutions))
	for _, e := range key.Evolutions {
		cols = append(cols, e.ColumnName)
	}
	assert.ElementsMatch(t, []string{"attributes_string", "attributes", "attributes_promoted"}, cols,
		"a promoted key must keep its column-wide homes and add the promoted column")
}
