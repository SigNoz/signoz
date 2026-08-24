package tracestelemetryschema

import (
	"context"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
			name: "Scope field - scope.name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedResult: "scope.name::String",
			expectedError:  nil,
		},
		{
			name: "Scope field - scope.version",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.version",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedResult: "scope.version::String",
			expectedError:  nil,
		},
		{
			name: "Scope field - custom attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "custom.attr",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedResult: "scope.attributes.`custom.attr`::String",
			expectedError:  nil,
		},
		{
			// `scope.attribute.name` normalizes to {attribute.name, scope}; the literal
			// `attribute.` prefix is dropped so it addresses the scope attribute named `name`
			// (which the declared `scope.name` path deliberately does not).
			name: "Scope field - attribute prefix addresses the named scope attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "attribute.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedResult: "scope.attributes.`name`::String",
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
			fm := NewFieldMapper(flaggertest.New(t))
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
			fm := NewFieldMapper(flaggertest.New(t))
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
			fm := NewFieldMapper(flaggertest.New(t))
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

	fm := NewFieldMapper(flaggertest.New(t))

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

// TestColumnExpressionForScopeDeclaredPath covers select-side resolution of scope names that
// collide with a declared scope path. A short name under scope context (or the bare
// `scope.<x>` spelling that normalizes to it) binds to the declared path — a same-named
// scope attribute never shadows it. The full `scope.<x>` name under explicit scope context
// likewise addresses the declared path alone. A `name`/`version` scope attribute is reachable
// only via the explicit `scope.attribute.` prefix.
func TestColumnExpressionForScopeDeclaredPath(t *testing.T) {
	ctx := context.Background()

	scopeKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalTraces,
			FieldContext:  telemetrytypes.FieldContextScope,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		}
	}
	declaredOnly := map[string][]*telemetrytypes.TelemetryFieldKey{
		"scope.name":    {scopeKey("scope.name")},
		"scope.version": {scopeKey("scope.version")},
	}
	withAttr := map[string][]*telemetrytypes.TelemetryFieldKey{
		"scope.name":    {scopeKey("scope.name")},
		"scope.version": {scopeKey("scope.version")},
		"name":          {scopeKey("name")},
		"version":       {scopeKey("version")},
	}

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		keys           map[string][]*telemetrytypes.TelemetryFieldKey
		expectedResult string
	}{
		{
			name:           "short name under scope context binds to the declared path",
			key:            telemetrytypes.TelemetryFieldKey{Name: "version", FieldContext: telemetrytypes.FieldContextScope},
			keys:           declaredOnly,
			expectedResult: "multiIf(scope.version::String <> '', scope.version::String, NULL)",
		},
		{
			name:           "full scope.version name under scope context addresses the declared path alone",
			key:            telemetrytypes.TelemetryFieldKey{Name: "scope.version", FieldContext: telemetrytypes.FieldContextScope},
			keys:           withAttr,
			expectedResult: "multiIf(scope.version::String <> '', scope.version::String, NULL)",
		},
		{
			name:           "full scope.name name under scope context addresses the declared path alone",
			key:            telemetrytypes.TelemetryFieldKey{Name: "scope.name", FieldContext: telemetrytypes.FieldContextScope},
			keys:           withAttr,
			expectedResult: "multiIf(scope.name::String <> '', scope.name::String, NULL)",
		},
		{
			// `scope.attribute.name` normalizes to {attribute.name, scope}; the `attribute.`
			// prefix is dropped so it addresses the scope attribute named `name` — the only
			// way to reach it, since `scope.name` is reserved for the declared path.
			name:           "attribute prefix reaches the named scope attribute",
			key:            telemetrytypes.TelemetryFieldKey{Name: "attribute.name", FieldContext: telemetrytypes.FieldContextScope},
			keys:           withAttr,
			expectedResult: "multiIf(scope.attributes.`name` IS NOT NULL, scope.attributes.`name`::String, NULL)",
		},
		{
			// metadata knows both homes under this name, so the short spelling coalesces
			// them instead of being rejected as ambiguous
			name:           "short name coalesces a known scope attribute with the declared path",
			key:            telemetrytypes.TelemetryFieldKey{Name: "name", FieldContext: telemetrytypes.FieldContextScope},
			keys:           withAttr,
			expectedResult: "multiIf(scope.attributes.`name` IS NOT NULL, toString(scope.attributes.`name`::String), scope.name::String <> '', toString(scope.name::String), NULL)",
		},
		{
			name:           "short version coalesces a known scope attribute with the declared path",
			key:            telemetrytypes.TelemetryFieldKey{Name: "version", FieldContext: telemetrytypes.FieldContextScope},
			keys:           withAttr,
			expectedResult: "multiIf(scope.attributes.`version` IS NOT NULL, toString(scope.attributes.`version`::String), scope.version::String <> '', toString(scope.version::String), NULL)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper(flaggertest.New(t))
			result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, 0, 0, &tc.key, telemetrytypes.FieldDataTypeUnspecified, tc.keys)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
