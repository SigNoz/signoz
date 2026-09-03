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
		{"number after -> json", telemetrytypes.FieldDataTypeNumber, attrWindowAfter, "accurateCastOrNull(attributes.`user.id`, 'Float64')"},
		{"number straddle -> dual", telemetrytypes.FieldDataTypeNumber, attrWindowStraddle, "multiIf(attributes.`user.id` IS NOT NULL, accurateCastOrNull(attributes.`user.id`, 'Float64'), mapContains(attributes_number, 'user.id'), attributes_number['user.id'], NULL)"},
		{"int64 after -> json", telemetrytypes.FieldDataTypeInt64, attrWindowAfter, "accurateCastOrNull(attributes.`user.id`, 'Int64')"},
		{"bool before -> map", telemetrytypes.FieldDataTypeBool, attrWindowBefore, "attributes_bool['user.id']"},
		{"bool after -> json", telemetrytypes.FieldDataTypeBool, attrWindowAfter, "accurateCastOrNull(attributes.`user.id`, 'Bool')"},
		{"bool straddle -> dual", telemetrytypes.FieldDataTypeBool, attrWindowStraddle, "multiIf(attributes.`user.id` IS NOT NULL, accurateCastOrNull(attributes.`user.id`, 'Bool'), mapContains(attributes_bool, 'user.id'), attributes_bool['user.id'], NULL)"},
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
			expected: "toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')) > ?",
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
		{
			name:     "in string",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorIn, value: []any{"a", "b"},
			expected: "((attributes.`user.id`::String = ? OR attributes.`user.id`::String = ?) AND attributes.`user.id` IS NOT NULL)",
		},
		{
			name:     "not in string has no exists guard",
			key:      attrKey("user.id", telemetrytypes.FieldDataTypeString, evo),
			operator: qbtypes.FilterOperatorNotIn, value: []any{"a", "b"},
			expected: "(attributes.`user.id`::String <> ? AND attributes.`user.id`::String <> ?)",
		},
		{
			name:     "between number",
			key:      attrKey("latency", telemetrytypes.FieldDataTypeNumber, evo),
			operator: qbtypes.FilterOperatorBetween, value: []any{float64(1), float64(9)},
			expected: "toFloat64(accurateCastOrNull(attributes.`latency`, 'Float64')) BETWEEN ? AND ?",
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

// TestColumnExpressionForAttributeJSON covers group-by (coerced to String) and aggregation
// (coerced to Float64) over a JSON attribute after release: both are exists-guarded so an absent
// path is NULL rather than a spurious ”/0, and the numeric branch keeps its toFloat64 coercion.
func TestColumnExpressionForAttributeJSON(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	t.Run("group by string", func(t *testing.T) {
		key := attrKey("user.id", telemetrytypes.FieldDataTypeString, evo)
		got, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &key, telemetrytypes.FieldDataTypeString, nil)
		require.NoError(t, err)
		assert.Equal(t, "multiIf(attributes.`user.id` IS NOT NULL, attributes.`user.id`::String, NULL)", got)
	})

	t.Run("aggregation numeric", func(t *testing.T) {
		key := attrKey("latency", telemetrytypes.FieldDataTypeNumber, evo)
		got, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &key, telemetrytypes.FieldDataTypeFloat64, nil)
		require.NoError(t, err)
		assert.Equal(t, "multiIf(attributes.`latency` IS NOT NULL, toFloat64(accurateCastOrNull(attributes.`latency`, 'Float64')), NULL)", got)
	})
}

// TestAttributeJSONNoAmbiguityWarning guards against a visible regression: the JSON column is a
// second physical home for the same logical field, not a second logical field, so a plain
// attribute filter must not emit the "ambiguous key" warning.
func TestAttributeJSONNoAmbiguityWarning(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	key := attrKey("user.id", telemetrytypes.FieldDataTypeString, evo)
	sb := sqlbuilder.NewSelectBuilder()
	_, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &key,
		map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, "x", sb)
	require.NoError(t, err)
	assert.Empty(t, warnings, "a plain attribute filter must not emit an ambiguity warning")
}

// TestConditionForAttributeJSONTypeCollision covers a name stored under two data types (String
// and Int64) in the JSON column: an untyped filter fans out to one exists-guarded condition per
// type, both reading the same physical path with their own cast, and surfaces the ambiguity
// warning. In the JSON column the two branches share the raw path; only the cast differs.
func TestConditionForAttributeJSONTypeCollision(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	strKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeString, evo)
	intKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"http.status_code": {&strKey, &intKey},
	}

	ref := attrKey("http.status_code", telemetrytypes.FieldDataTypeUnspecified, nil)
	sb := sqlbuilder.NewSelectBuilder()
	conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &ref,
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, float64(200), sb)
	require.NoError(t, err)
	require.Len(t, conds, 2, "a colliding name must build one condition per data type")

	sb.Where(sb.Or(conds...))
	sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	assert.Contains(t, sql, "toFloat64OrNull(attributes.`http.status_code`::String) = ?")
	assert.Contains(t, sql, "toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')) = ?")
	assert.Contains(t, sql, "attributes.`http.status_code` IS NOT NULL")
	assert.NotEmpty(t, warnings, "a colliding name must surface the ambiguity warning")
}

// TestColumnExpressionForAttributeJSONTypeCollision covers group-by on a name stored under two
// data types. On the JSON column both interpretations read the same path, so the raw-path guard
// can't tell them apart; each branch is instead guarded by whether the path casts to its type,
// with the ::String branch as the last-resort fallback. A row is read as its actual stored type
// (int via accurateCastOrNull to Int64, everything else via ::String) rather than the first branch winning.
func TestColumnExpressionForAttributeJSONTypeCollision(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	strKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeString, evo)
	intKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"http.status_code": {&strKey, &intKey},
	}

	ref := attrKey("http.status_code", telemetrytypes.FieldDataTypeUnspecified, nil)
	got, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &ref, telemetrytypes.FieldDataTypeString, fieldKeys)
	require.NoError(t, err)
	assert.Equal(t,
		"multiIf(accurateCastOrNull(attributes.`http.status_code`, 'Int64') IS NOT NULL, toString(accurateCastOrNull(attributes.`http.status_code`, 'Int64')), attributes.`http.status_code` IS NOT NULL, attributes.`http.status_code`::String, NULL)",
		got)
}

// TestColumnExpressionForAttributeJSONTypeCollisionNumericAgg covers a numeric aggregation over a
// name colliding as Number and String: the numeric branch is read natively when the path casts to
// a number, and only rows that are not numeric fall through to the string parse — so a genuinely
// string-stored value is never silently nulled by a numeric-first cast.
func TestColumnExpressionForAttributeJSONTypeCollisionNumericAgg(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	numKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeNumber, evo)
	strKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeString, evo)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"http.status_code": {&numKey, &strKey},
	}

	ref := attrKey("http.status_code", telemetrytypes.FieldDataTypeUnspecified, nil)
	got, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &ref, telemetrytypes.FieldDataTypeFloat64, fieldKeys)
	require.NoError(t, err)
	assert.Equal(t,
		"multiIf(accurateCastOrNull(attributes.`http.status_code`, 'Float64') IS NOT NULL, toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Float64')), attributes.`http.status_code` IS NOT NULL, toFloat64OrNull(attributes.`http.status_code`::String), NULL)",
		got)
}

// TestConditionForAttributeMapTypeCollisionParity anchors the legacy behavior the JSON path must
// preserve: before the rollout the same colliding name fans out to two separate physical map
// columns (attributes_string / attributes_number), each with its own mapContains guard.
func TestConditionForAttributeMapTypeCollisionParity(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	strKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeString, evo)
	intKey := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"http.status_code": {&strKey, &intKey},
	}

	ref := attrKey("http.status_code", telemetrytypes.FieldDataTypeUnspecified, nil)
	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowBefore[0], attrWindowBefore[1], &ref,
		fieldKeys, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, float64(200), sb)
	require.NoError(t, err)
	require.Len(t, conds, 2, "a colliding name must build one condition per data type")

	sb.Where(sb.Or(conds...))
	sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	assert.Contains(t, sql, "toFloat64OrNull(attributes_string['http.status_code']) = ?")
	assert.Contains(t, sql, "mapContains(attributes_string, 'http.status_code')")
	assert.Contains(t, sql, "toFloat64(attributes_number['http.status_code']) = ?")
	assert.Contains(t, sql, "mapContains(attributes_number, 'http.status_code')")
}

// TestColumnForUnspecifiedAttributeNoBranchFlip pins the branch-flip decision: a
// data-type-unspecified attribute key resolves to no column (even with the evolution present), so
// bare attribute keys keep taking the legacy CandidateKeys/synthesis path rather than becoming
// metadata-first resolvable.
func TestColumnForUnspecifiedAttributeNoBranchFlip(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	key := attrKey("user.id", telemetrytypes.FieldDataTypeUnspecified, evo)
	_, err := fm.ColumnFor(ctx, valuer.UUID{}, attrWindowAfter[0], attrWindowAfter[1], &key)
	assert.ErrorIs(t, err, qbtypes.ErrColumnNotFound)
}

// TestConditionForAttributeJSONNegativeOperatorParity pins Map parity for numeric/bool attributes.
// The value reads an absent key as NULL (accurateCastOrNull, or the straddle multiIf else); a
// positive operator excludes such a row via the exists guard, but a negative operator has no guard,
// so the condition builder folds the NULL to the Map's type zero (ifNull) for negatives only.
// String needs no fold — ::String already reads absent as ”. The fold rides the attributes
// evolution: a key without it (the pre-rollout system) is byte-identical to today.
func TestConditionForAttributeJSONNegativeOperatorParity(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	build := func(t *testing.T, key telemetrytypes.TelemetryFieldKey, window [2]uint64, op qbtypes.FilterOperator, value any) string {
		t.Helper()
		sb := sqlbuilder.NewSelectBuilder()
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, window[0], window[1], &key,
			map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, op, value, sb)
		require.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		return sql
	}

	t.Run("not equal number after -> NULL folded to 0", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, attrWindowAfter, qbtypes.FilterOperatorNotEqual, float64(200))
		assert.Contains(t, sql, "ifNull(toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')), 0) <> ?")
	})

	t.Run("not equal bool after -> NULL folded to false", func(t *testing.T) {
		key := attrKey("http.cache.hit", telemetrytypes.FieldDataTypeBool, evo)
		sql := build(t, key, attrWindowAfter, qbtypes.FilterOperatorNotEqual, true)
		assert.Contains(t, sql, "ifNull(accurateCastOrNull(attributes.`http.cache.hit`, 'Bool'), false) <> ?")
	})

	t.Run("equal number after -> not folded, exists guard excludes absent", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, attrWindowAfter, qbtypes.FilterOperatorEqual, float64(0))
		assert.Contains(t, sql, "(toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')) = ? AND attributes.`http.status_code` IS NOT NULL)")
		assert.NotContains(t, sql, "ifNull")
	})

	t.Run("not in number after -> each operand folded to 0", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, attrWindowAfter, qbtypes.FilterOperatorNotIn, []any{float64(200), float64(404)})
		assert.Contains(t, sql, "(ifNull(toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')), 0) <> ? AND ifNull(toFloat64(accurateCastOrNull(attributes.`http.status_code`, 'Int64')), 0) <> ?)")
	})

	t.Run("not equal number straddle -> whole multiIf folded", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, attrWindowStraddle, qbtypes.FilterOperatorNotEqual, float64(200))
		assert.Contains(t, sql, "ifNull(toFloat64(multiIf(attributes.`http.status_code` IS NOT NULL, accurateCastOrNull(attributes.`http.status_code`, 'Int64'), mapContains(attributes_number, 'http.status_code'), attributes_number['http.status_code'], NULL)), 0) <> ?")
	})

	t.Run("not equal number before -> harmless fold over the map read", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, attrWindowBefore, qbtypes.FilterOperatorNotEqual, float64(200))
		assert.Contains(t, sql, "ifNull(toFloat64(attributes_number['http.status_code']), 0) <> ?")
	})

	t.Run("not equal number without rollout -> byte-identical to today", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, nil)
		sql := build(t, key, attrWindowBefore, qbtypes.FilterOperatorNotEqual, float64(200))
		assert.Contains(t, sql, "toFloat64(attributes_number['http.status_code']) <> ?")
		assert.NotContains(t, sql, "ifNull")
	})

	t.Run("not equal string after -> '' default, never folded", func(t *testing.T) {
		key := attrKey("user.id", telemetrytypes.FieldDataTypeString, evo)
		sql := build(t, key, attrWindowAfter, qbtypes.FilterOperatorNotEqual, "admin")
		assert.Contains(t, sql, "attributes.`user.id`::String <> ?")
		assert.NotContains(t, sql, "ifNull")
	})
}

// TestConditionForAttributeJSONStraddleAbsentKeyExclusion guards the straddle exists path: because
// the value reads absent-in-both-homes as NULL (multiIf else), a positive zero-value comparison and
// EXISTS/NOT EXISTS must still exclude a key absent from every home, rather than matching it.
func TestConditionForAttributeJSONStraddleAbsentKeyExclusion(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper(flaggertest.New(t))
	cb := NewConditionBuilder(fm, flaggertest.New(t))
	evo := MockAttributeEvolutionData(attrJSONRelease)

	build := func(t *testing.T, key telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) string {
		t.Helper()
		sb := sqlbuilder.NewSelectBuilder()
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, attrWindowStraddle[0], attrWindowStraddle[1], &key,
			map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, qbtypes.ConditionBuilderOptions{}, op, value, sb)
		require.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		return sql
	}

	guard := "multiIf(attributes.`http.status_code` IS NOT NULL, accurateCastOrNull(attributes.`http.status_code`, 'Int64'), mapContains(attributes_number, 'http.status_code'), attributes_number['http.status_code'], NULL) IS NOT NULL"

	t.Run("equal zero keeps the exists guard", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		assert.Contains(t, build(t, key, qbtypes.FilterOperatorEqual, float64(0)), guard)
	})
	t.Run("exists is the raw multiIf, not always-true", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		assert.Contains(t, build(t, key, qbtypes.FilterOperatorExists, nil), guard)
	})
	t.Run("not exists negates the raw multiIf", func(t *testing.T) {
		key := attrKey("http.status_code", telemetrytypes.FieldDataTypeInt64, evo)
		sql := build(t, key, qbtypes.FilterOperatorNotExists, nil)
		assert.Contains(t, sql, ", NULL) IS NULL")
	})
}
