package querybuilder

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestDataTypeCollisionHandledFieldName(t *testing.T) {
	tests := []struct {
		name              string
		key               *telemetrytypes.TelemetryFieldKey
		value             any
		tblFieldName      string
		expectedFieldName string
		expectedValue     any
		operator          qbtypes.FilterOperator
	}{
		{
			name: "http_status_code_string_field_with_numeric_value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.status_code",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			value:             float64(200),
			tblFieldName:      "attribute_string_http$$status_code",
			expectedFieldName: "toFloat64OrNull(attribute_string_http$$status_code)",
			expectedValue:     float64(200),
		},
		{
			name: "service_enabled_string_field_with_bool_value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "service.enabled",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			value:             true,
			tblFieldName:      "attribute_string_service$$enabled",
			expectedFieldName: "attribute_string_service$$enabled",
			expectedValue:     "true",
		},
		{
			name: "http_method_string_field_with_string_value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.method",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			value:             "GET",
			tblFieldName:      "attribute_string_http$$method",
			expectedFieldName: "attribute_string_http$$method",
			expectedValue:     "GET",
		},
		{
			name: "response_times_string_field_with_numeric_array",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "response.times",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			value:             []any{float64(100.5), float64(200.3), float64(150.7)},
			tblFieldName:      "attribute_string_response$$times",
			expectedFieldName: "toFloat64OrNull(attribute_string_response$$times)",
			expectedValue:     []any{float64(100.5), float64(200.3), float64(150.7)},
		},
		{
			name: "error_codes_string_field_with_mixed_array",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "error.codes",
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
			value:             []any{float64(500), "TIMEOUT", float64(503)},
			tblFieldName:      "attribute_string_error$$codes",
			expectedFieldName: "attribute_string_error$$codes",
			expectedValue:     []any{"500", "TIMEOUT", "503"},
		},

		// numbers
		{
			// we cast the key to string if the value is not a number or operator is not a comparison operator
			name: "http_request_duration_float_field_with_string_value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.request.duration",
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			value:             "1234.56",
			tblFieldName:      "attribute_float64_http$$request$$duration",
			expectedFieldName: "toString(attribute_float64_http$$request$$duration)",
			expectedValue:     "1234.56",
			operator:          qbtypes.FilterOperatorEqual,
		},
		{
			// we cast to float64 if it's a comparison operator and the value is a stringified number
			// reason:- https://github.com/SigNoz/signoz/pull/9154#issuecomment-3369941207
			name: "http_request_duration_float_field_with_string_value_comparison_operator",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.request.duration",
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			value:             "9",
			tblFieldName:      "attribute_float64_http$$request$$duration",
			expectedFieldName: "toFloat64(attribute_float64_http$$request$$duration)",
			expectedValue:     "9",
			operator:          qbtypes.FilterOperatorGreaterThan,
		},
		{
			// we cast to float64 if it's a comparison operator and the value is a stringified number
			// reason:- https://github.com/SigNoz/signoz/pull/9154#issuecomment-3369941207
			name: "http_request_duration_float_field_with_string_value_comparison_operator_1",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.request.duration",
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			value:             "9.11",
			tblFieldName:      "attribute_float64_http$$request$$duration",
			expectedFieldName: "toFloat64(attribute_float64_http$$request$$duration)",
			expectedValue:     "9.11",
			operator:          qbtypes.FilterOperatorGreaterThan,
		},
		{
			// we cast the key to string if the value is not a number or operator is not a comparison operator
			name: "http_request_duration_float_field_with_string_value_comparison_operator_2",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "http.request.duration",
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
			value:             "ERROR",
			tblFieldName:      "attribute_float64_http$$request$$duration",
			expectedFieldName: "toString(attribute_float64_http$$request$$duration)",
			expectedValue:     "ERROR",
			operator:          qbtypes.FilterOperatorGreaterThan,
		},

		// bools
		{
			name: "feature_enabled_bool_field_with_string_value",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "feature.enabled",
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			value:             "true",
			tblFieldName:      "attribute_bool_feature$$enabled",
			expectedFieldName: "toString(attribute_bool_feature$$enabled)",
			expectedValue:     "true",
		},
		{
			name: "feature_flags_bool_field_with_mixed_array",
			key: &telemetrytypes.TelemetryFieldKey{
				Name:          "feature.flags",
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
			value:             []any{true, "enabled", false},
			tblFieldName:      "attribute_bool_feature$$flags",
			expectedFieldName: "toString(attribute_bool_feature$$flags)",
			expectedValue:     []any{"true", "enabled", "false"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resultFieldName, resultValue := DataTypeCollisionHandledFieldName(tt.key, tt.value, tt.tblFieldName, tt.operator)
			assert.Equal(t, tt.expectedFieldName, resultFieldName)
			assert.Equal(t, tt.expectedValue, resultValue)
		})
	}
}
