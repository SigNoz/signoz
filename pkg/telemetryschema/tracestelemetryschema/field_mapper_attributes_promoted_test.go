package tracestelemetryschema

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	promoJSONRelease  = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	promoPromoRelease = time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
)

// TestFieldForAttributePromotedEvolution proves promotion is just a third evolution column:
// evolution selection reads a single physical home per window — the legacy Map before the JSON
// rollout, `attributes` between the JSON rollout and the path's promotion, and
// `attributes_promoted` alone after promotion — fanning out only across an evolution boundary.
func TestFieldForAttributePromotedEvolution(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockPromotedAttributeEvolutionData(
		"attributes_string", "Map(LowCardinality(String), String)", "span.operation",
		promoJSONRelease, promoPromoRelease,
	)

	win := func(from, to string) [2]uint64 {
		a, _ := time.Parse("2006-01-02", from)
		b, _ := time.Parse("2006-01-02", to)
		return [2]uint64{uint64(a.UnixNano()), uint64(b.UnixNano())}
	}

	testCases := []struct {
		name     string
		window   [2]uint64
		expected string
	}{
		{"before json rollout -> map", win("2024-01-01", "2024-06-01"), "attributes_string['span.operation']"},
		{"between json and promotion -> attributes", win("2025-02-01", "2025-04-01"), "attributes.`span.operation`::String"},
		{"after promotion -> promoted only", win("2025-07-01", "2025-08-01"), "attributes_promoted.`span.operation`::String"},
		{"straddle promotion -> attributes_promoted + attributes", win("2025-04-01", "2025-08-01"), "multiIf(attributes_promoted.`span.operation` IS NOT NULL, attributes_promoted.`span.operation`::String, attributes.`span.operation` IS NOT NULL, attributes.`span.operation`::String, NULL)"},
		{"straddle json rollout -> attributes + map", win("2024-06-01", "2025-03-01"), "multiIf(attributes.`span.operation` IS NOT NULL, attributes.`span.operation`::String, mapContains(attributes_string, 'span.operation'), attributes_string['span.operation'], NULL)"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			key := telemetrytypes.TelemetryFieldKey{
				Name:          "span.operation",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    evo,
			}
			got, err := fm.FieldFor(ctx, valuer.UUID{}, tc.window[0], tc.window[1], &key)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, got)
		})
	}
}

// TestConditionForAttributePromoted asserts a filter over a window fully after promotion reads
// only the promoted column, with existence testing the promoted raw path (index-eligible via
// attributes_promoted_paths_tokenbf) — not the attributes column.
func TestConditionForAttributePromoted(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockPromotedAttributeEvolutionData(
		"attributes_string", "Map(LowCardinality(String), String)", "span.operation",
		promoJSONRelease, promoPromoRelease,
	)
	afterPromo := [2]uint64{
		uint64(time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
		uint64(time.Date(2025, 8, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
	}

	key := telemetrytypes.TelemetryFieldKey{
		Name:          "span.operation",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Evolutions:    evo,
	}

	t.Run("equal reads promoted column only", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, afterPromo[0], afterPromo[1], &key,
			map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, "GET", sb)
		require.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "(attributes_promoted.`span.operation`::String = ? AND attributes_promoted.`span.operation` IS NOT NULL)")
		assert.NotContains(t, sql, "attributes.`span.operation`")
	})

	t.Run("exists uses promoted raw path", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, afterPromo[0], afterPromo[1], &key,
			map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorExists, nil, sb)
		require.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_promoted.`span.operation` IS NOT NULL")
	})
}
