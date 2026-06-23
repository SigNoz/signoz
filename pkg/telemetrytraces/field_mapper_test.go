package telemetrytraces

import (
	"context"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()

	mockEvolution := mockEvolutionData(time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC))
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
			name: "Attribute - string attribute uses JSON with map fallback",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "multiIf(attributes.`user.id` IS NOT NULL, attributes.`user.id`::String, attributes_string['user.id'])",
			expectedError:  nil,
		},
		{
			name: "Attribute - number attribute uses JSON with map fallback",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult: "multiIf(attributes.`request.size` IS NOT NULL, attributes.`request.size`::Float64, attributes_number['request.size'])",
			expectedError:  nil,
		},
		{
			name: "Attribute - bool attribute uses JSON with map fallback",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult: "multiIf(attributes.`request.success` IS NOT NULL, attributes.`request.success`::Bool, attributes_bool['request.success'])",
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
			expectedResult: "multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, `resource_string_deployment$$environment_exists`==true, `resource_string_deployment$$environment`, NULL)",
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
			result, err := fm.FieldFor(ctx, uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano()), uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano()), &tc.key)

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
	evolutions := mockEvolutionData(releaseTime)

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
			expectedResult: "multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, `resource_string_deployment$$environment_exists`==true, `resource_string_deployment$$environment`, NULL)",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			result, err := fm.FieldFor(ctx, tc.tsStart, tc.tsEnd, &tc.key)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}

func TestFieldForAttributeJSON(t *testing.T) {
	start := uint64(time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC).UnixNano())
	end := uint64(time.Date(2024, 6, 5, 0, 0, 0, 0, time.UTC).UnixNano())

	stringKey := telemetrytypes.TelemetryFieldKey{
		Name:          "http.method",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	numberKey := telemetrytypes.TelemetryFieldKey{
		Name:          "http.status_code",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
	}
	boolKey := telemetrytypes.TelemetryFieldKey{
		Name:          "request.success",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeBool,
	}
	// http.route has a real materialized ($$) physical column.
	legacyMaterializedKey := telemetrytypes.TelemetryFieldKey{
		Name:          "http.route",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Materialized:  true,
	}
	promotedStringKey := telemetrytypes.TelemetryFieldKey{
		Name:          "http.method",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeString,
		Promoted:      true,
	}
	promotedNumberKey := telemetrytypes.TelemetryFieldKey{
		Name:          "http.status_code",
		FieldContext:  telemetrytypes.FieldContextAttribute,
		FieldDataType: telemetrytypes.FieldDataTypeNumber,
		Promoted:      true,
	}

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		filterIntent   bool
		expectedResult string
	}{
		{
			name:           "select/group by uses attributes JSON with map fallback - string",
			key:            stringKey,
			expectedResult: "multiIf(attributes.`http.method` IS NOT NULL, attributes.`http.method`::String, attributes_string['http.method'])",
		},
		{
			name:           "select/group by uses attributes JSON with map fallback - number",
			key:            numberKey,
			expectedResult: "multiIf(attributes.`http.status_code` IS NOT NULL, attributes.`http.status_code`::Float64, attributes_number['http.status_code'])",
		},
		{
			name:           "select/group by uses attributes JSON with map fallback - bool",
			key:            boolKey,
			expectedResult: "multiIf(attributes.`request.success` IS NOT NULL, attributes.`request.success`::Bool, attributes_bool['request.success'])",
		},
		{
			name:           "promoted string key tries attributes_promoted first",
			key:            promotedStringKey,
			expectedResult: "multiIf(attributes_promoted.`http.method` IS NOT NULL, attributes_promoted.`http.method`::String, attributes.`http.method` IS NOT NULL, attributes.`http.method`::String, attributes_string['http.method'])",
		},
		{
			name:           "promoted number key tries attributes_promoted first",
			key:            promotedNumberKey,
			expectedResult: "multiIf(attributes_promoted.`http.status_code` IS NOT NULL, attributes_promoted.`http.status_code`::Float64, attributes.`http.status_code` IS NOT NULL, attributes.`http.status_code`::Float64, attributes_number['http.status_code'])",
		},
		{
			name:           "filter intent stays on map column",
			key:            stringKey,
			filterIntent:   true,
			expectedResult: "attributes_string['http.method']",
		},
		{
			name:           "legacy materialized key keeps physical column",
			key:            legacyMaterializedKey,
			expectedResult: "`attribute_string_http$$route`",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			ctx := context.Background()
			if tc.filterIntent {
				ctx = qbtypes.WithFilterIntent(ctx)
			}
			key := tc.key
			result, err := fm.FieldFor(ctx, start, end, &key)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}
