package telemetrytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetFieldKeyFromKeyText(t *testing.T) {

	testCases := []struct {
		keyText  string
		expected TelemetryFieldKey
	}{
		{
			keyText: "resource.service.name:string",
			expected: TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  FieldContextResource,
				FieldDataType: FieldDataTypeString,
			},
		},
		{
			keyText: "scope.name",
			expected: TelemetryFieldKey{
				Name:          "name",
				FieldContext:  FieldContextScope,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			keyText: "scope.version",
			expected: TelemetryFieldKey{
				Name:          "version",
				FieldContext:  FieldContextScope,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			keyText: "attribute.http.method",
			expected: TelemetryFieldKey{
				Name:          "http.method",
				FieldContext:  FieldContextAttribute,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			keyText: "span.name",
			expected: TelemetryFieldKey{
				Name:          "name",
				FieldContext:  FieldContextSpan,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			keyText: "span.kind:string",
			expected: TelemetryFieldKey{
				Name:          "kind",
				FieldContext:  FieldContextSpan,
				FieldDataType: FieldDataTypeString,
			},
		},
		{
			keyText: "span.kind:int",
			expected: TelemetryFieldKey{
				Name:          "kind",
				FieldContext:  FieldContextSpan,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		{
			keyText: "span.http.status_code:int",
			expected: TelemetryFieldKey{
				Name:          "http.status_code",
				FieldContext:  FieldContextSpan,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		{
			keyText: "log.severity_text",
			expected: TelemetryFieldKey{
				Name:          "severity_text",
				FieldContext:  FieldContextLog,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
	}

	for _, testCase := range testCases {
		result := GetFieldKeyFromKeyText(testCase.keyText)
		if result != testCase.expected {
			t.Errorf("expected %v, got %v", testCase.expected, result)
		}
	}
}

func TestDataTypeCollisionHandledFieldName(t *testing.T) {
	tests := []struct {
		name              string
		key               *TelemetryFieldKey
		value             any
		tblFieldName      string
		expectedFieldName string
		expectedValue     any
	}{
		{
			name: "http_status_code_string_field_with_numeric_value",
			key: &TelemetryFieldKey{
				Name:          "http.status_code",
				FieldDataType: FieldDataTypeString,
			},
			value:             float64(200),
			tblFieldName:      "attribute_string_http$$status_code",
			expectedFieldName: "toFloat64OrNull(attribute_string_http$$status_code)",
			expectedValue:     float64(200),
		},
		{
			name: "service_enabled_string_field_with_bool_value",
			key: &TelemetryFieldKey{
				Name:          "service.enabled",
				FieldDataType: FieldDataTypeString,
			},
			value:             true,
			tblFieldName:      "attribute_string_service$$enabled",
			expectedFieldName: "attribute_string_service$$enabled",
			expectedValue:     "true",
		},
		{
			name: "http_method_string_field_with_string_value",
			key: &TelemetryFieldKey{
				Name:          "http.method",
				FieldDataType: FieldDataTypeString,
			},
			value:             "GET",
			tblFieldName:      "attribute_string_http$$method",
			expectedFieldName: "attribute_string_http$$method",
			expectedValue:     "GET",
		},
		{
			name: "response_times_string_field_with_numeric_array",
			key: &TelemetryFieldKey{
				Name:          "response.times",
				FieldDataType: FieldDataTypeString,
			},
			value:             []any{float64(100.5), float64(200.3), float64(150.7)},
			tblFieldName:      "attribute_string_response$$times",
			expectedFieldName: "toFloat64OrNull(attribute_string_response$$times)",
			expectedValue:     []any{float64(100.5), float64(200.3), float64(150.7)},
		},
		{
			name: "error_codes_string_field_with_mixed_array",
			key: &TelemetryFieldKey{
				Name:          "error.codes",
				FieldDataType: FieldDataTypeString,
			},
			value:             []any{float64(500), "TIMEOUT", float64(503)},
			tblFieldName:      "attribute_string_error$$codes",
			expectedFieldName: "attribute_string_error$$codes",
			expectedValue:     []any{"500", "TIMEOUT", "503"},
		},

		// numbers
		{
			name: "http_request_duration_float_field_with_string_value",
			key: &TelemetryFieldKey{
				Name:          "http.request.duration",
				FieldDataType: FieldDataTypeFloat64,
			},
			value:             "1234.56",
			tblFieldName:      "attribute_float64_http$$request$$duration",
			expectedFieldName: "toString(attribute_float64_http$$request$$duration)",
			expectedValue:     "1234.56",
		},

		// bools
		{
			name: "feature_enabled_bool_field_with_string_value",
			key: &TelemetryFieldKey{
				Name:          "feature.enabled",
				FieldDataType: FieldDataTypeBool,
			},
			value:             "true",
			tblFieldName:      "attribute_bool_feature$$enabled",
			expectedFieldName: "toString(attribute_bool_feature$$enabled)",
			expectedValue:     "true",
		},
		{
			name: "feature_flags_bool_field_with_mixed_array",
			key: &TelemetryFieldKey{
				Name:          "feature.flags",
				FieldDataType: FieldDataTypeBool,
			},
			value:             []any{true, "enabled", false},
			tblFieldName:      "attribute_bool_feature$$flags",
			expectedFieldName: "toString(attribute_bool_feature$$flags)",
			expectedValue:     []any{"true", "enabled", "false"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resultFieldName, resultValue := DataTypeCollisionHandledFieldName(tt.key, tt.value, tt.tblFieldName)
			assert.Equal(t, tt.expectedFieldName, resultFieldName)
			assert.Equal(t, tt.expectedValue, resultValue)
		})
	}
}
