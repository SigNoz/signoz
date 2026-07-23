package telemetrytraces

import (
	"context"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConditionFor(t *testing.T) {
	ctx := context.Background()

	mockEvolution := mockEvolutionData(time.Date(2025, 10, 26, 0, 10, 0, 0, time.UTC))
	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		operator      qbtypes.FilterOperator
		value         any
		expectedSQL   string
		expectedArgs  []any
		expectedError error
	}{
		{
			name: "Not Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorNotEqual,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <> ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "Greater Than operator - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorGreaterThan,
			value:         float64(100),
			expectedSQL:   "(toFloat64(attributes_number['request.duration']) > ? AND mapContains(attributes_number, 'request.duration'))",
			expectedArgs:  []any{float64(100)},
			expectedError: nil,
		},
		{
			name: "Less Than operator - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			operator:      qbtypes.FilterOperatorLessThan,
			value:         float64(1024),
			expectedSQL:   "(toFloat64(attributes_number['request.size']) < ? AND mapContains(attributes_number, 'request.size'))",
			expectedArgs:  []any{float64(1024)},
			expectedError: nil,
		},
		{
			name: "Greater Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorGreaterThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp >= ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "Less Than Or Equal operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorLessThanOrEq,
			value:         uint64(1617979338000000000),
			expectedSQL:   "timestamp <= ?",
			expectedArgs:  []any{uint64(1617979338000000000)},
			expectedError: nil,
		},
		{
			name: "ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorILike,
			value:         "%admin%",
			expectedSQL:   "(LOWER(attributes_string['user.id']) LIKE LOWER(?) AND mapContains(attributes_string, 'user.id'))",
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "Not ILike operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotILike,
			value:         "%admin%",
			expectedSQL:   "WHERE LOWER(attributes_string['user.id']) NOT LIKE LOWER(?)",
			expectedArgs:  []any{"%admin%", true},
			expectedError: nil,
		},
		{
			name: "Contains operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         521509198310,
			expectedSQL:   "LOWER(attributes_string['user.id']) LIKE LOWER(?)",
			expectedArgs:  []any{"%521509198310%"},
			expectedError: nil,
		},
		{
			name: "LIKE operator - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorLike,
			value:         521509198310,
			expectedSQL:   "attributes_string['user.id'] LIKE ?",
			expectedArgs:  []any{"521509198310", true},
			expectedError: nil,
		},
		{
			name: "Between operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp BETWEEN ? AND ?",
			expectedArgs:  []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedError: nil,
		},
		{
			name: "Between operator - invalid value",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         "invalid",
			expectedSQL:   "",
			expectedError: qbtypes.ErrBetweenValues,
		},
		{
			name: "Between operator - insufficient values",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorBetween,
			value:         []any{uint64(1617979338000000000)},
			expectedSQL:   "",
			expectedError: qbtypes.ErrBetweenValues,
		},
		{
			name: "Not Between operator - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorNotBetween,
			value:         []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedSQL:   "timestamp NOT BETWEEN ? AND ?",
			expectedArgs:  []any{uint64(1617979338000000000), uint64(1617979348000000000)},
			expectedError: nil,
		},
		{
			name: "Exists operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "mapContains(attributes_string, 'user.id')",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "NOT mapContains(attributes_string, 'user.id')",
			expectedError: nil,
		},
		{
			name: "Exists operator - json field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    mockEvolution,
			},
			operator:      qbtypes.FilterOperatorExists,
			value:         nil,
			expectedSQL:   "WHERE multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL",
			expectedError: nil,
		},
		{
			name: "Not Exists operator - json field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    mockEvolution,
			},
			operator:      qbtypes.FilterOperatorNotExists,
			value:         nil,
			expectedSQL:   "WHERE multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NULL",
			expectedError: nil,
		},
		{
			name: "Contains operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorContains,
			value:         "admin",
			expectedSQL:   "(LOWER(attributes_string['user.id']) LIKE LOWER(?) AND mapContains(attributes_string, 'user.id'))",
			expectedArgs:  []any{"%admin%"},
			expectedError: nil,
		},
		{
			name: "In operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorIn,
			value:         []any{"admin", "user"},
			expectedSQL:   "((attributes_string['user.id'] = ? OR attributes_string['user.id'] = ?) AND mapContains(attributes_string, 'user.id'))",
			expectedArgs:  []any{"admin", "user"},
			expectedError: nil,
		},
		{
			name: "Not In operator - map field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			operator:      qbtypes.FilterOperatorNotIn,
			value:         []any{"admin", "user"},
			expectedSQL:   "(attributes_string['user.id'] <> ? AND attributes_string['user.id'] <> ?)",
			expectedArgs:  []any{"admin", "user", true},
			expectedError: nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			operator:      qbtypes.FilterOperatorEqual,
			value:         "value",
			expectedSQL:   "",
			expectedError: qbtypes.ErrColumnNotFound,
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, _, err := conditionBuilder.ConditionFor(ctx, valuer.UUID{}, 1761437108000000000, 1761458708000000000, &tc.key, map[string][]*telemetrytypes.TelemetryFieldKey{tc.key.Name: {&tc.key}}, qbtypes.ConditionBuilderOptions{}, tc.operator, tc.value, sb)
			sb.Where(cond...)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
				assert.Contains(t, sql, tc.expectedSQL)
			}
		})
	}
}

func TestConditionForResourceWithEvolution(t *testing.T) {
	ctx := context.Background()
	releaseTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	evolutions := mockEvolutionData(releaseTime)

	testCases := []struct {
		name        string
		key         telemetrytypes.TelemetryFieldKey
		operator    qbtypes.FilterOperator
		tsStart     uint64
		tsEnd       uint64
		expectedSQL string
	}{
		{
			name: "Exists - window after release - JSON only",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    evolutions,
			},
			operator:    qbtypes.FilterOperatorExists,
			tsStart:     uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:       uint64(time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedSQL: "WHERE resource.`service.name` IS NOT NULL",
		},
		{
			name: "NotExists - window after release - JSON only",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    evolutions,
			},
			operator:    qbtypes.FilterOperatorNotExists,
			tsStart:     uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:       uint64(time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedSQL: "WHERE resource.`service.name` IS NULL",
		},
		{
			name: "Exists - window before release - map only",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    evolutions,
			},
			operator:    qbtypes.FilterOperatorExists,
			tsStart:     uint64(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:       uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedSQL: "WHERE mapContains(resources_string, 'service.name')",
		},
		{
			name: "Exists - window straddles release - multiIf null check",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Evolutions:    evolutions,
			},
			operator:    qbtypes.FilterOperatorExists,
			tsStart:     uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:       uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedSQL: "WHERE multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) IS NOT NULL",
		},
	}

	fm := NewFieldMapper()
	conditionBuilder := NewConditionBuilder(fm)

	for _, tc := range testCases {
		sb := sqlbuilder.NewSelectBuilder()
		t.Run(tc.name, func(t *testing.T) {
			cond, _, err := conditionBuilder.ConditionFor(ctx, valuer.UUID{}, tc.tsStart, tc.tsEnd, &tc.key, map[string][]*telemetrytypes.TelemetryFieldKey{tc.key.Name: {&tc.key}}, qbtypes.ConditionBuilderOptions{}, tc.operator, nil, sb)
			require.NoError(t, err)
			sb.Where(cond...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Contains(t, sql, tc.expectedSQL)
		})
	}
}

// TestConditionForSynthesizedKeys covers the KeyNotFound fallback: when a
// referenced attribute key has no metadata match, the builder synthesizes key(s) from
// user input and queries anyway, emitting a warning instead of failing.
func TestConditionForSynthesizedKeys(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	// no metadata matches -> the builder must synthesize from user input
	var noMatches map[string][]*telemetrytypes.TelemetryFieldKey

	t.Run("bare key with string operand -> attribute string", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "error.type"}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, "timeout", sb)
		assert.NoError(t, err)
		assert.NotEmpty(t, warnings, "a not-found warning should be emitted")
		sb.Where(conds...)
		sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_string['error.type']")
		assert.Contains(t, args, "timeout")
	})

	t.Run("bare key with number operand -> attribute number", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "http.status"}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorGreaterThan, float64(5), sb)
		assert.NoError(t, err)
		assert.NotEmpty(t, warnings)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_number['http.status']")
	})

	t.Run("bare key with bool operand -> attribute bool", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "sampled"}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, true, sb)
		assert.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_bool['sampled']")
	})

	t.Run("exists with no operand fans out across type variants", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "exception.type"}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorExists, nil, sb)
		assert.NoError(t, err)
		assert.NotEmpty(t, warnings)
		assert.Len(t, conds, 3, "exists should fan out to string/number/bool")
		sb.Where(sb.Or(conds...))
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "mapContains(attributes_string, 'exception.type')")
		assert.Contains(t, sql, "mapContains(attributes_number, 'exception.type')")
		assert.Contains(t, sql, "mapContains(attributes_bool, 'exception.type')")
	})

	t.Run("qualified data type honored without fanout", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "custom.key", FieldDataType: telemetrytypes.FieldDataTypeString}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, "v", sb)
		assert.NoError(t, err)
		assert.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_string['custom.key']")
	})

	t.Run("bare intrinsic column resolves to the column, not synthesized attributes", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "duration_nano"}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorGreaterThan, float64(100), sb)
		require.NoError(t, err)
		require.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "duration_nano > ?")
		assert.NotContains(t, sql, "attributes_string")
		assert.NotContains(t, sql, "attributes_number")
	})

	t.Run("bare deprecated alias resolves to the calculated column", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "httpMethod"}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, "GET", sb)
		require.NoError(t, err)
		require.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "http_method = ?")
		assert.NotContains(t, sql, "attributes_string")
	})

	t.Run("span-context key that is a real column stays the column", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "duration_nano", FieldContext: telemetrytypes.FieldContextSpan}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorGreaterThan, float64(100), sb)
		require.NoError(t, err)
		require.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "duration_nano > ?")
		assert.NotContains(t, sql, "attributes_")
	})

	t.Run("span-context key not a column is corrected to a stripped-name metadata match", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "http.method", FieldContext: telemetrytypes.FieldContextSpan}
		keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
			"http.method": {{Name: "http.method", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString}},
		}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, keysMap, qbtypes.ConditionBuilderOptions{}, qbtypes.FilterOperatorEqual, "GET", sb)
		require.NoError(t, err)
		assert.NotEmpty(t, warnings)
		require.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_string['http.method']")
		assert.NotContains(t, sql, "attributes_string['span.http.method']")
	})

	t.Run("span-context key absent from metadata synthesizes the stripped name", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "custom.attr", FieldContext: telemetrytypes.FieldContextSpan}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, "v", sb)
		require.NoError(t, err)
		assert.NotEmpty(t, warnings)
		require.Len(t, conds, 1)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_string['custom.attr']")
		assert.NotContains(t, sql, "span.custom.attr")
	})

	t.Run("qualified resource context honored with literal spelling second", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "k8s.cluster.name", FieldContext: telemetrytypes.FieldContextResource}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, "prod", sb)
		assert.NoError(t, err)
		assert.Len(t, conds, 2, "stripped interpretation first, literal `resource.` spelling second")
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "resources_string['k8s.cluster.name']")
		assert.Contains(t, sql, "resources_string['resource.k8s.cluster.name']")
	})

	t.Run("synthesized resource key survives skip-resource-filter", func(t *testing.T) {
		// the resource sub-query never covered a key absent from metadata
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "deployment.environment", FieldContext: telemetrytypes.FieldContextResource}
		conds, warnings, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, nil, qbtypes.ConditionBuilderOptions{SkipResourceFilter: true}, qbtypes.FilterOperatorEqual, "prod", sb)
		assert.NoError(t, err)
		assert.NotEmpty(t, warnings)
		assert.Len(t, conds, 2, "the synthesized resource conditions must not be dropped")
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "resources_string['deployment.environment']")
		assert.Contains(t, sql, "resources_string['resource.deployment.environment']")
	})

	t.Run("metadata-backed resource key still dropped under skip-resource-filter", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource}
		keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
			"service.name": {{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString}},
		}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, keysMap, qbtypes.ConditionBuilderOptions{SkipResourceFilter: true}, qbtypes.FilterOperatorEqual, "redis", sb)
		assert.NoError(t, err)
		assert.Empty(t, conds, "the resource CTE covers metadata-backed keys")
	})

	t.Run("synthesized resource key coerces numeric operand", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "replica.count", FieldContext: telemetrytypes.FieldContextResource}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorEqual, float64(3), sb)
		assert.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "toFloat64OrNull(")
		assert.Contains(t, sql, "resources_string['replica.count']")
	})

	t.Run("negative operator builds without exists guard (matches-everything semantics)", func(t *testing.T) {
		sb := sqlbuilder.NewSelectBuilder()
		key := telemetrytypes.TelemetryFieldKey{Name: "error.type"}
		conds, _, err := cb.ConditionFor(ctx, valuer.UUID{}, 0, 0, &key, noMatches, qbtypes.ConditionBuilderOptions{},qbtypes.FilterOperatorNotEqual, "fatal", sb)
		assert.NoError(t, err)
		sb.Where(conds...)
		sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
		assert.Contains(t, sql, "attributes_string['error.type'] <> ?")
		assert.NotContains(t, sql, "mapContains")
	})
}
