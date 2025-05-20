package telemetrymetadata

import (
	"context"
	"testing"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetColumn(t *testing.T) {

	testCases := []struct {
		name          string
		key           telemetrytypes.TelemetryFieldKey
		expectedCol   *schema.Column
		expectedError error
	}{
		{
			name: "Resource field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedCol:   attributeMetadataColumns["resource_attributes"],
			expectedError: nil,
		},
		{
			name: "Scope field - scope name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "Scope field - scope.name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope.name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "Scope field - scope_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "scope_name",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "Scope field - version",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "version",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "Scope field - other scope field",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "custom.scope.field",
				FieldContext: telemetrytypes.FieldContextScope,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "Attribute field - string type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedCol:   attributeMetadataColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedCol:   attributeMetadataColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			expectedCol:   attributeMetadataColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			expectedCol:   attributeMetadataColumns["attributes"],
			expectedError: nil,
		},
		{
			name: "Log field - nonexistent",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
	}

	fm := NewFieldMapper()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(context.Background(), &tc.key)

			if tc.expectedError != nil {
				assert.Equal(t, tc.expectedError, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedCol, col)
			}
		})
	}
}

func TestGetFieldKeyName(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name           string
		key            telemetrytypes.TelemetryFieldKey
		expectedResult string
		expectedError  error
	}{
		{
			name: "Map column type - string attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "attributes['user.id']",
			expectedError:  nil,
		},
		{
			name: "Map column type - number attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult: "attributes['request.size']",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult: "attributes['request.success']",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource attribute",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedResult: "resource_attributes['service.name']",
			expectedError:  nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextLog,
			},
			expectedResult: "",
			expectedError:  qbtypes.ErrColumnNotFound,
		},
	}

	fm := NewFieldMapper()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
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
