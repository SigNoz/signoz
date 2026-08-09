package tracestelemetryschema

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFieldForQuotesRequestKeyNames(t *testing.T) {
	key := &telemetrytypes.TelemetryFieldKey{
		Name:          "name'`\\); SELECT 1 --",
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	expression, err := NewFieldMapper().FieldFor(context.Background(), valuer.UUID{}, 0, 0, key)
	require.NoError(t, err)

	assert.Contains(t, expression, "resource."+querybuilder.ClickHouseIdentifier(key.Name))
	assert.Contains(t, expression, "mapContains(resources_string, "+querybuilder.ClickHouseStringLiteral(key.Name)+")")
}

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()

	mockEvolution := MockEvolutionData(time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC))
	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		{
			name: "Simple column type - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			expectedResult: "timestamp",
			expectedError:  nil,
		},
		{
			name: "Map column type - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "attributes_string['user.id']",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult: "attributes_number['request.size']",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult: "attributes_bool['request.success']",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Evolutions:   mockEvolution,
			},
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute - materialized",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
				Evolutions:    mockEvolution,
			},
			expectedResult: "multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, `resource_string_deployment$$environment_exists`, `resource_string_deployment$$environment`, NULL)",
			expectedError:  nil,
		},
		{
			// Query like `attribute.attribute_string:string` should resolve to `attributes_string['attribute_string']`.
			name: "Attribute key whose name collides with contextual map column resolves as a map lookup",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          SpanAttributesStringColumn,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "attributes_string['attributes_string']",
			expectedError:  nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			expectedResult: "",
			expectedError:  qbtypes.ErrColumnNotFound,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			result, err := fm.FieldFor(ctx, valuer.UUID{}, uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()), uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano()), &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

// FieldFor is a per-physical-key primitive: it never consults the family
// table. Family composition is FieldForLogical's job.
func TestFieldForIsPerKey(t *testing.T) {
	key := telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	expression, err := NewFieldMapper().FieldFor(context.Background(), valuer.UUID{}, 0, 0, &key)

	require.NoError(t, err)
	assert.Equal(t, "attributes_string['deployment.environment.name']", expression)
}

func traceFamilyLogicalField(t *testing.T, requestedName string, members ...*telemetrytypes.TelemetryFieldKey) *telemetrytypes.LogicalField {
	t.Helper()
	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{}
	for _, member := range members {
		fieldKeys[member.Name] = []*telemetrytypes.TelemetryFieldKey{member}
	}
	requested := telemetrytypes.NewTelemetryFieldKey(requestedName, members[0].FieldContext, members[0].FieldDataType)
	matches := querybuilder.MatchingLogicalFields(requested, fieldKeys)
	require.Len(t, matches, 1)
	return matches[0]
}

func TestFieldForLogicalMergesFamilyMembersCurrentFirst(t *testing.T) {
	current := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	old := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	for _, requestedName := range []string{current.Name, old.Name} {
		logical := traceFamilyLogicalField(t, requestedName, current, old)
		expression, err := NewFieldMapper().FieldForLogical(context.Background(), valuer.UUID{}, 0, 0, logical)
		require.NoError(t, err)
		assert.Equal(t,
			"COALESCE(NULLIF(attributes_string['deployment.environment.name'], ''), NULLIF(attributes_string['deployment.environment'], ''), '')",
			expression,
			"both request spellings address one logical field",
		)
	}
}

// The old-name request with only the current spelling in metadata prunes to a
// single member: plain single-key SQL, no coalesce.
func TestFieldForLogicalPrunesToPresentMembers(t *testing.T) {
	current := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	logical := traceFamilyLogicalField(t, "deployment.environment", current)
	expression, err := NewFieldMapper().FieldForLogical(context.Background(), valuer.UUID{}, 0, 0, logical)

	require.NoError(t, err)
	assert.Equal(t, "attributes_string['deployment.environment.name']", expression)
}

// Every member brings its own storage state: the merge composes each member's
// FieldFor output, so a materialized-with-evolutions member keeps its column
// history inside the family expression with no sibling bookkeeping anywhere.
func TestFieldForLogicalComposesResourceMembersFromTheirOwnStorage(t *testing.T) {
	ctx := context.Background()
	fm := NewFieldMapper()
	start := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	end := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())

	current := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment.name",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	old := &telemetrytypes.TelemetryFieldKey{
		Name:          "deployment.environment",
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
		Evolutions:    MockEvolutionData(time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC)),
	}

	currentExpr, err := fm.FieldFor(ctx, valuer.UUID{}, start, end, current)
	require.NoError(t, err)
	oldExpr, err := fm.FieldFor(ctx, valuer.UUID{}, start, end, old)
	require.NoError(t, err)

	logical := traceFamilyLogicalField(t, current.Name, current, old)
	expression, err := fm.FieldForLogical(ctx, valuer.UUID{}, start, end, logical)
	require.NoError(t, err)

	assert.Equal(t,
		"COALESCE(NULLIF("+currentExpr+", ''), NULLIF("+oldExpr+", ''), '')",
		expression,
		"the family merge is exactly the members' own expressions, current-first, with the keyless tail",
	)
	assert.Contains(t, expression, "`resource_string_deployment$$environment`",
		"the promoted member keeps its materialized column")
}

func TestFieldForResourceWithEvolution(t *testing.T) {
	ctx := context.Background()
	releaseTime := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	evolutions := MockEvolutionData(releaseTime)

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		tsStart        uint64
		tsEnd          uint64
		expectedResult string
	}{
		{
			name: "Window straddles release - both columns",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Evolutions:   evolutions,
			},
			tsStart:        uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:          uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL)",
		},
		{
			name: "Window fully after release - JSON column only",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Evolutions:   evolutions,
			},
			tsStart:        uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:          uint64(time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedResult: "resource.`service.name`::String",
		},
		{
			name: "Window fully before release - map column only",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
				Evolutions:   evolutions,
			},
			tsStart:        uint64(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:          uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedResult: "resources_string['service.name']",
		},
		{
			name: "Window fully after release - materialized resource",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
				Evolutions:    evolutions,
			},
			tsStart:        uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:          uint64(time.Date(2025, 7, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedResult: "resource.`deployment.environment`::String",
		},
		{
			name: "Window straddles release - materialized resource",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
				Evolutions:    evolutions,
			},
			tsStart:        uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:          uint64(time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedResult: "multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, `resource_string_deployment$$environment_exists`, `resource_string_deployment$$environment`, NULL)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			result, err := fm.FieldFor(ctx, valuer.UUID{}, tc.tsStart, tc.tsEnd, &tc.key)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}

// TestColumnExpressionForTemporalColumn covers the time column: ClickHouse converts it to a
// number as seconds since epoch, so it must reach the aggregation in its native type. Every
// exists guard and every non-temporal coercion is left exactly as it was.
func TestColumnExpressionForTemporalColumn(t *testing.T) {
	ctx := context.Background()
	tsStart := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	tsEnd := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())

	testCases := []struct {
		name             string
		key              telemetrytypes.TelemetryFieldKey
		requiredDataType telemetrytypes.FieldDataType
		expectedResult   string
	}{
		{
			name:             "time column is not coerced under a numeric aggregation",
			key:              telemetrytypes.TelemetryFieldKey{Name: "timestamp"},
			requiredDataType: telemetrytypes.FieldDataTypeFloat64,
			expectedResult:   "multiIf(timestamp <> toDateTime64(0, 9), timestamp, NULL)",
		},
		{
			name:             "time column is not coerced under a group by",
			key:              telemetrytypes.TelemetryFieldKey{Name: "timestamp"},
			requiredDataType: telemetrytypes.FieldDataTypeString,
			expectedResult:   "multiIf(timestamp <> toDateTime64(0, 9), timestamp, NULL)",
		},
		{
			name:             "numeric intrinsic keeps its cast and guard",
			key:              telemetrytypes.TelemetryFieldKey{Name: "duration_nano"},
			requiredDataType: telemetrytypes.FieldDataTypeFloat64,
			expectedResult:   "multiIf(duration_nano <> 0, accurateCastOrNull(duration_nano, 'Float64'), NULL)",
		},
		{
			name:             "string intrinsic keeps its cast and guard",
			key:              telemetrytypes.TelemetryFieldKey{Name: "name"},
			requiredDataType: telemetrytypes.FieldDataTypeFloat64,
			expectedResult:   "multiIf(name <> '', accurateCastOrNull(name, 'Float64'), NULL)",
		},
		{
			name: "map-backed attribute keeps its exists guard",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			requiredDataType: telemetrytypes.FieldDataTypeString,
			expectedResult:   "multiIf(mapContains(attributes_string, 'user.id'), attributes_string['user.id'], NULL)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, tsStart, tsEnd, &tc.key, tc.requiredDataType, nil)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}

// TestColumnExpressionForTimestampAttributeCollision covers a user attribute that shares its
// name with the intrinsic time column. It must not join the candidate union: a second branch
// would force a numeric supertype across the multiIf and put the DateTime64 back into
// seconds since epoch. The attribute stays reachable under its explicit context.
func TestColumnExpressionForTimestampAttributeCollision(t *testing.T) {
	ctx := context.Background()
	tsStart := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	tsEnd := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())

	keys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"timestamp": {
			{
				Name:          "timestamp",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
		},
	}

	fm := NewFieldMapper()

	t.Run("bare timestamp resolves to the intrinsic column alone", func(t *testing.T) {
		bare := telemetrytypes.TelemetryFieldKey{Name: "timestamp"}
		result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, tsStart, tsEnd, &bare, telemetrytypes.FieldDataTypeFloat64, keys)
		require.NoError(t, err)
		assert.Equal(t, "multiIf(timestamp <> toDateTime64(0, 9), timestamp, NULL)", result)
	})

	t.Run("explicit attribute context still reaches the attribute", func(t *testing.T) {
		attr := telemetrytypes.TelemetryFieldKey{
			Name:          "timestamp",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		}
		result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, tsStart, tsEnd, &attr, telemetrytypes.FieldDataTypeFloat64, keys)
		require.NoError(t, err)
		assert.Contains(t, result, "attributes_number['timestamp']")
	})
}
