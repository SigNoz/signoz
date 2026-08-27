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
	attrJSONRelease = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)

	attrWindowBefore   = [2]uint64{tsNano(2024, 1), tsNano(2024, 6)}
	attrWindowAfter    = [2]uint64{tsNano(2025, 6), tsNano(2025, 7)}
	attrWindowStraddle = [2]uint64{tsNano(2024, 6), tsNano(2025, 6)}
)

func tsNano(y int, m time.Month) uint64 {
	return uint64(time.Date(y, m, 1, 0, 0, 0, 0, time.UTC).UnixNano())
}

func attrKey(name string, dt telemetrytypes.FieldDataType, evo []*telemetrytypes.EvolutionEntry) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: dt,
		Evolutions:    evo,
	}
}

// TestFieldForAttributeJSONEvolution asserts the value expression across the rollout window:
// before release the legacy Map lookup (byte-for-byte today), after release the type-aware JSON
// cast, straddling a dual-read multiIf with the JSON column first.
func TestFieldForAttributeJSONEvolution(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	testCases := []struct {
		name     string
		dataType telemetrytypes.FieldDataType
		window   [2]uint64
		expected string
	}{
		{"string before -> map", telemetrytypes.FieldDataTypeString, attrWindowBefore, "attributes_string['user.id']"},
		{"string after -> json", telemetrytypes.FieldDataTypeString, attrWindowAfter, "attributes.`user.id`::String"},
		{"string straddle -> dual", telemetrytypes.FieldDataTypeString, attrWindowStraddle, "multiIf(attributes.`user.id` IS NOT NULL, attributes.`user.id`::String, mapContains(attributes_string, 'user.id'), attributes_string['user.id'], NULL)"},
		{"number before -> map", telemetrytypes.FieldDataTypeNumber, attrWindowBefore, "attributes_number['user.id']"},
		{"number after -> json", telemetrytypes.FieldDataTypeNumber, attrWindowAfter, "attributes.`user.id`::Nullable(Float64)"},
		{"number straddle -> dual", telemetrytypes.FieldDataTypeNumber, attrWindowStraddle, "multiIf(attributes.`user.id` IS NOT NULL, attributes.`user.id`::Nullable(Float64), mapContains(attributes_number, 'user.id'), attributes_number['user.id'], NULL)"},
		{"int64 after -> json", telemetrytypes.FieldDataTypeInt64, attrWindowAfter, "attributes.`user.id`::Nullable(Int64)"},
		{"bool before -> map", telemetrytypes.FieldDataTypeBool, attrWindowBefore, "attributes_bool['user.id']"},
		{"bool after -> json", telemetrytypes.FieldDataTypeBool, attrWindowAfter, "attributes.`user.id`::Nullable(Bool)"},
		{"bool straddle -> dual", telemetrytypes.FieldDataTypeBool, attrWindowStraddle, "multiIf(attributes.`user.id` IS NOT NULL, attributes.`user.id`::Nullable(Bool), mapContains(attributes_bool, 'user.id'), attributes_bool['user.id'], NULL)"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			key := attrKey("user.id", tc.dataType, evo)
			got, err := fm.FieldFor(ctx, valuer.UUID{}, tc.window[0], tc.window[1], &key)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, got)
		})
	}
}

// TestFieldForAttributeNoEvolutionParity proves the JSON column is untouched until the evolution
// entry is registered: a key with no evolutions resolves to the Map column for every window.
func TestFieldForAttributeNoEvolutionParity(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))

	for _, dt := range []struct {
		dataType telemetrytypes.FieldDataType
		expected string
	}{
		{telemetrytypes.FieldDataTypeString, "attributes_string['user.id']"},
		{telemetrytypes.FieldDataTypeNumber, "attributes_number['user.id']"},
		{telemetrytypes.FieldDataTypeBool, "attributes_bool['user.id']"},
	} {
		key := attrKey("user.id", dt.dataType, nil)
		got, err := fm.FieldFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &key)
		require.NoError(t, err)
		assert.Equal(t, dt.expected, got, "no evolution entry must keep the Map path")
	}
}

// TestConditionForAttributeJSON asserts the emitted WHERE fragment per operator against the JSON
// column (window fully after release). Positive operators carry the raw-path existence guard;
// numeric comparisons keep numeric semantics; existence never tests the ::String cast.
func TestConditionForAttributeJSON(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	testCases := []struct {
		name     string
		key      telemetrytypes.TelemetryFieldKey
		operator qbtypes.FilterOperator
		value    any
		expected string
	}{
		{
			name:     "equal string",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorEqual, value: "admin",
			expected: "(attributes.`user.id`::String = ? AND attributes.`user.id` IS NOT NULL)",
		},
		{
			name:     "not equal string has no exists guard",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorNotEqual, value: "admin",
			expected: "attributes.`user.id`::String <> ?",
		},
		{
			name:     "greater than number",
			key:      attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo),
			operator: qbtypes.FilterOperatorGreaterThan, value: float64(200),
			expected: "toFloat64(attributes.`http.status_code`::Nullable(Int64)) > ?",
		},
		{
			name:     "ilike string",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorILike, value: "%adm%",
			expected: "LOWER(attributes.`user.id`::String) LIKE LOWER(?)",
		},
		{
			name:     "exists uses raw path",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorExists, value: nil,
			expected: "attributes.`user.id` IS NOT NULL",
		},
		{
			name:     "not exists uses raw path",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorNotExists, value: nil,
			expected: "attributes.`user.id` IS NULL",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sb := sqlbuilder.NewSelectBuilder()
			conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &tc.key,
				map[string][]*telemetrytypes.TelemetryFieldKey{tc.key.Name: {&tc.key}}, qbtypes.ConditionBuilderOptions{}, tc.operator, tc.value, sb)
			require.NoError(t, err)
			sb.Where(conds...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Contains(t, sql, tc.expected)
		})
	}
}

// TestConditionForAttributeJSONNotExistsDualRead covers NOT EXISTS across both homes during the
// dual-read window: it must AND the JSON IS NULL with NOT mapContains so a row present in either
// home is excluded (De Morgan), including rows that predate the JSON column.
func TestConditionForAttributeJSONNotExistsDualRead(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	key := attrKey("user.id", telemetrytypes.FieldDataTypeString, evo)
	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowStraddle[0], attrWindowStraddle[1], &key,
		map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorNotExists, nil, sb)
	require.NoError(t, err)
	sb.Where(conds...)
	sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	// the value multiIf resolves the row's home; NOT EXISTS negates the whole thing to IS NULL
	assert.Contains(t, sql, "IS NULL")
	assert.Contains(t, sql, "attributes.`user.id` IS NOT NULL")
	assert.Contains(t, sql, "mapContains(attributes_string, 'user.id')")
}
