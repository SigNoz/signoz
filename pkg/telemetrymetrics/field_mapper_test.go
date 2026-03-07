package telemetrymetrics

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
	ctx := context.Background()

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
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Attribute field - string type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Attribute field - number type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Attribute field - int64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.duration",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Attribute field - float64 type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "cpu.utilization",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Attribute field - bool type",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
		{
			name: "Metric field - temporality",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "temporality",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			expectedCol:   timeSeriesV4Columns["temporality"],
			expectedError: nil,
		},
		{
			name: "Metric field - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			expectedCol:   timeSeriesV4Columns["metric_name"],
			expectedError: nil,
		},
		{
			name: "Metric field - nonexistent",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			expectedCol:   nil,
			expectedError: qbtypes.ErrColumnNotFound,
		},
		{
			name: "did_user_login",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "did_user_login",
				Signal:        telemetrytypes.SignalMetrics,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedCol:   timeSeriesV4Columns["labels"],
			expectedError: nil,
		},
	}

	fm := NewFieldMapper()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			col, err := fm.ColumnFor(ctx, &tc.key)

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
			name: "Simple column type - metric_name",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "metric_name",
				FieldContext: telemetrytypes.FieldContextMetric,
			},
			expectedResult: "metric_name",
			expectedError:  nil,
		},
		{
			name: "Map column type - string label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			expectedResult: "JSONExtractString(labels, 'user.id')",
			expectedError:  nil,
		},
		{
			name: "Map column type - number label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.size",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			},
			expectedResult: "JSONExtractString(labels, 'request.size')",
			expectedError:  nil,
		},
		{
			name: "Map column type - bool label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:          "request.success",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			expectedResult: "JSONExtractString(labels, 'request.success')",
			expectedError:  nil,
		},
		{
			name: "Map column type - resource label",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "service.name",
				FieldContext: telemetrytypes.FieldContextResource,
			},
			expectedResult: "JSONExtractString(labels, 'service.name')",
			expectedError:  nil,
		},
		{
			name: "Non-existent column",
			key: telemetrytypes.TelemetryFieldKey{
				Name:         "nonexistent_field",
				FieldContext: telemetrytypes.FieldContextMetric,
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
