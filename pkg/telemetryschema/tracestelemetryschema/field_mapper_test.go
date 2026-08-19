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

// scopeKey builds a TelemetryFieldKey the way the API boundary would after Normalize.
func scopeKey(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:         name,
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextScope,
	}
}

// declaredScopeKeys injects the scope.name/scope.version intrinsics into the metadata map
// the way metadata.go does at query time; resolution of the declared paths depends on it.
func declaredScopeKeys() map[string][]*telemetrytypes.TelemetryFieldKey {
	scopeName := IntrinsicFields["scope.name"]
	scopeVersion := IntrinsicFields["scope.version"]
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"scope.name":    {&scopeName},
		"scope.version": {&scopeVersion},
	}
}

func scopeAttribute(name string) *telemetrytypes.TelemetryFieldKey {
	return &telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalTraces,
		FieldContext:  telemetrytypes.FieldContextScope,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
}

// TestColumnExpressionForScope covers the scope resolution matrix from PR #10920: declared
// paths, scope attributes, and the attribute-first union when a scope attribute shares its
// name with a declared path.
func TestColumnExpressionForScope(t *testing.T) {
	ctx := context.Background()
	tsStart := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	tsEnd := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())
	fm := NewFieldMapper(flaggertest.New(t))

	run := func(field telemetrytypes.TelemetryFieldKey, keys map[string][]*telemetrytypes.TelemetryFieldKey) string {
		t.Helper()
		result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, tsStart, tsEnd, &field, telemetrytypes.FieldDataTypeUnspecified, keys)
		require.NoError(t, err)
		return result
	}

	t.Run("short name binds to declared scope.name when no attribute exists", func(t *testing.T) {
		assert.Equal(t,
			"multiIf(scope.name::String <> '', scope.name::String, NULL)",
			run(scopeKey("name"), declaredScopeKeys()))
	})

	t.Run("fully-qualified scope.name isolates the declared path", func(t *testing.T) {
		assert.Equal(t,
			"multiIf(scope.name::String <> '', scope.name::String, NULL)",
			run(scopeKey("scope.name"), declaredScopeKeys()))
	})

	t.Run("short version binds to declared scope.version", func(t *testing.T) {
		assert.Equal(t,
			"multiIf(scope.version::String <> '', scope.version::String, NULL)",
			run(scopeKey("version"), declaredScopeKeys()))
	})

	t.Run("plain scope attribute", func(t *testing.T) {
		keys := declaredScopeKeys()
		keys["testing.env"] = []*telemetrytypes.TelemetryFieldKey{scopeAttribute("testing.env")}
		assert.Equal(t,
			"multiIf(scope.attributes.`testing.env` IS NOT NULL, scope.attributes.`testing.env`::String, NULL)",
			run(scopeKey("testing.env"), keys))
	})

	t.Run("scope attribute synthesized when absent from metadata", func(t *testing.T) {
		assert.Equal(t,
			"multiIf(scope.attributes.`testing.env` IS NOT NULL, scope.attributes.`testing.env`::String, NULL)",
			run(scopeKey("testing.env"), declaredScopeKeys()))
	})

	t.Run("short name unions attribute (first) with declared path", func(t *testing.T) {
		keys := declaredScopeKeys()
		keys["name"] = []*telemetrytypes.TelemetryFieldKey{scopeAttribute("name")}
		assert.Equal(t,
			"multiIf(scope.attributes.`name` IS NOT NULL, scope.attributes.`name`::String, scope.name::String <> '', scope.name::String, NULL)",
			run(scopeKey("name"), keys))
	})

	t.Run("fully-qualified scope.version isolates declared even with conflicting attribute", func(t *testing.T) {
		keys := declaredScopeKeys()
		keys["version"] = []*telemetrytypes.TelemetryFieldKey{scopeAttribute("version")}
		assert.Equal(t,
			"multiIf(scope.version::String <> '', scope.version::String, NULL)",
			run(scopeKey("scope.version"), keys))
	})

	t.Run("group by short name unions attribute and declared without toString", func(t *testing.T) {
		keys := declaredScopeKeys()
		keys["name"] = []*telemetrytypes.TelemetryFieldKey{scopeAttribute("name")}
		result, err := fm.ColumnExpressionFor(ctx, valuer.UUID{}, tsStart, tsEnd, &[]telemetrytypes.TelemetryFieldKey{scopeKey("name")}[0], telemetrytypes.FieldDataTypeString, keys)
		require.NoError(t, err)
		assert.Equal(t,
			"multiIf(scope.attributes.`name` IS NOT NULL, scope.attributes.`name`::String, scope.name::String <> '', scope.name::String, NULL)",
			result)
	})
}

// TestFieldForScope covers the per-key SQL for a resolved scope key.
func TestFieldForScope(t *testing.T) {
	ctx := context.Background()
	tsStart := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	tsEnd := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())
	fm := NewFieldMapper(flaggertest.New(t))

	cases := map[string]string{
		"scope.name":    "scope.name::String",
		"scope.version": "scope.version::String",
		"custom.attr":   "scope.attributes.`custom.attr`::String",
	}
	for name, want := range cases {
		t.Run(name, func(t *testing.T) {
			key := scopeKey(name)
			got, err := fm.FieldFor(ctx, valuer.UUID{}, tsStart, tsEnd, &key)
			require.NoError(t, err)
			assert.Equal(t, want, got)
			// A scope path must never double-prefix the JSON column.
			assert.NotContains(t, got, "scope.`scope.")
		})
	}
}

// TestExistsForScope covers the presence predicates: declared paths test <> ” (non-Nullable),
// scope attributes test the raw JSON path IS NOT NULL.
func TestExistsForScope(t *testing.T) {
	ctx := context.Background()
	tsStart := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	tsEnd := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())
	fm := NewFieldMapper(flaggertest.New(t))

	cases := []struct {
		name   string
		key    string
		exists bool
		want   string
	}{
		{"declared exists", "scope.name", true, "scope.name::String <> ''"},
		{"declared not exists", "scope.name", false, "scope.name::String = ''"},
		{"attribute exists", "exception.type", true, "scope.attributes.`exception.type` IS NOT NULL"},
		{"attribute not exists", "exception.type", false, "scope.attributes.`exception.type` IS NULL"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			key := scopeKey(tc.key)
			got, err := fm.ExistsFor(ctx, valuer.UUID{}, tsStart, tsEnd, &key, tc.exists)
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}
}
