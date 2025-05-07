package telemetrytypes

import (
	"testing"
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
