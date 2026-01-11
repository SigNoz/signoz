package telemetrytraces

import (
	"context"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()

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
			result, err := fm.FieldFor(ctx, &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}

func TestColumnExpressionFor(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		keys           map[string][]*telemetrytypes.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		{
			name: "Simple column type - timestamp",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "timestamp",
				FieldContext: telemetrytypes.FieldContextSpan,
			},
			keys:           nil,
			expectedResult: "timestamp AS `timestamp`",
			expectedError:  nil,
		},
		{
			name: "Map column type - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys:           nil,
			expectedResult: "attributes_string['user.id'] AS `user.id`",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			keys:           nil,
			expectedResult: "attributes_number['request.size'] AS `request.size`",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			keys:           nil,
			expectedResult: "attributes_bool['request.success'] AS `request.success`",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys:           nil,
			expectedResult: "multiIf(resource.`service.name` IS NOT NULL, resource.`service.name`::String, mapContains(resources_string, 'service.name'), resources_string['service.name'], NULL) AS `service.name`",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute - materialized",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
			keys:           nil,
			expectedResult: "multiIf(resource.`deployment.environment` IS NOT NULL, resource.`deployment.environment`::String, `resource_string_deployment$$$$environment_exists`==true, `resource_string_deployment$$$$environment`, NULL) AS `deployment.environment`",
			expectedError:  nil,
		},
		{
			name: "Field with missing context fallback to keys",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "http.method",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			keys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"http.method": {
					{
						Name:          "http.method",
						FieldContext:  telemetrytypes.FieldContextAttribute,
						FieldDataType: telemetrytypes.FieldDataTypeString,
					},
				},
			},
			expectedResult: "attributes_string['http.method'] AS `http.method`",
			expectedError:  nil,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			fm := NewFieldMapper()
			result, err := fm.ColumnExpressionFor(ctx, &tc.key, tc.keys)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedResult, result)
			}
		})
	}
}
