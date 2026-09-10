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

// TestEvolutionAppendsPerFieldToColumnWide covers the metadata enrichment: a key's column-wide
// (__all__) evolution homes and its per-field homes are appended, not replaced. A promoted
// attribute (whose attributes_promoted entry lives under its own field name) must therefore keep
// its Map and base-JSON homes for time ranges before it was promoted.
func TestEvolutionAppendsPerFieldToColumnWide(t *testing.T) {
	jsonRel := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	promoRel := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	mk := func(col, field string, rt time.Time) *telemetrytypes.EvolutionEntry {
		return &telemetrytypes.EvolutionEntry{
			Signal: telemetrytypes.SignalTraces, ColumnName: col,
			FieldContext: telemetrytypes.FieldContextAttribute, FieldName: field, ReleaseTime: rt,
		}
	}

	columnNames := func(entries []*telemetrytypes.EvolutionEntry) []string {
		out := make([]string, 0, len(entries))
		for _, e := range entries {
			out = append(out, e.ColumnName)
		}
		return out
	}

	// Only JSON columns are recorded as evolution rows; the legacy Map column is the
	// synthesized epoch-0 base and is not stored here.
	newStore := func() *MockMetadataStore {
		store := NewMockMetadataStore()
		store.ColumnEvolutionMetadataMap["traces:attribute:__all__"] = []*telemetrytypes.EvolutionEntry{
			mk("attributes", "__all__", jsonRel),
		}
		return store
	}

	resolve := func(t *testing.T, store *MockMetadataStore, name string) *telemetrytypes.TelemetryFieldKey {
		t.Helper()
		key := &telemetrytypes.TelemetryFieldKey{
			Name: name, Signal: telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString,
		}
		store.KeysMap[name] = []*telemetrytypes.TelemetryFieldKey{key}
		selector := &telemetrytypes.FieldKeySelector{
			Name: name, Signal: telemetrytypes.SignalTraces,
			FieldContext: telemetrytypes.FieldContextAttribute, SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		}
		_, _, err := store.GetKeysMulti(context.Background(), valuer.UUID{}, []*telemetrytypes.FieldKeySelector{selector})
		require.NoError(t, err)
		return key
	}

	t.Run("promoted key keeps the column-wide attributes home and gains the promoted column", func(t *testing.T) {
		store := newStore()
		store.ColumnEvolutionMetadataMap["traces:attribute:span.operation"] = []*telemetrytypes.EvolutionEntry{
			mk("attributes_promoted", "span.operation", promoRel),
		}
		key := resolve(t, store, "span.operation")
		assert.ElementsMatch(t, []string{"attributes", "attributes_promoted"}, columnNames(key.Evolutions))
	})

	t.Run("non-promoted key gets only the column-wide home", func(t *testing.T) {
		store := newStore()
		key := resolve(t, store, "user.id")
		assert.ElementsMatch(t, []string{"attributes"}, columnNames(key.Evolutions))
	})
}
