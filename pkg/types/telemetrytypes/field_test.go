package telemetrytypes

import (
	"reflect"
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
		// Test case for log.body.status - should use log context with body.status as field name
		{
			keyText: "log.body.status",
			expected: TelemetryFieldKey{
				Name:          "status",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for log.body. with data type
		{
			keyText: "log.body.status_code:int",
			expected: TelemetryFieldKey{
				Name:          "status_code",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		// Test case for log.body. with nested field name
		{
			keyText: "log.body.http.status.code",
			expected: TelemetryFieldKey{
				Name:          "http.status.code",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for body. prefix - should use body as context
		{
			keyText: "body.http.status.code:int",
			expected: TelemetryFieldKey{
				Name:          "http.status.code",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		// Test case for body. prefix without data type - should use body as context
		{
			keyText: "body.status",
			expected: TelemetryFieldKey{
				Name:          "status",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for body. prefix with array data type - should use body as context
		{
			keyText: "body.tags:[]string",
			expected: TelemetryFieldKey{
				Name:          "tags",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeArrayString,
			},
		},
		// Test case for body. prefix with array data type (int64)
		{
			keyText: "body.ids:[]int64",
			expected: TelemetryFieldKey{
				Name:          "ids",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeArrayInt64,
			},
		},
		// Test case for body. prefix with nested field and array data type
		{
			keyText: "body.http.headers:[]string",
			expected: TelemetryFieldKey{
				Name:          "http.headers",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeArrayString,
			},
		},
		// Test case for just "body" - should use unspecified context with body as field name
		{
			keyText: "body",
			expected: TelemetryFieldKey{
				Name:          "body",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for just "body" with data type
		{
			keyText: "body:string",
			expected: TelemetryFieldKey{
				Name:          "body",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeString,
			},
		},
		// Test case for log.body (without trailing dot) - should keep log context
		{
			keyText: "log.body",
			expected: TelemetryFieldKey{
				Name:          "body",
				FieldContext:  FieldContextLog,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for log.body with data type - should keep log context
		{
			keyText: "log.body:string",
			expected: TelemetryFieldKey{
				Name:          "body",
				FieldContext:  FieldContextLog,
				FieldDataType: FieldDataTypeString,
			},
		},
		// Test case for field name with dots and no context
		{
			keyText: "http.status.code",
			expected: TelemetryFieldKey{
				Name:          "http.status.code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for field name with dots and data type but no context
		{
			keyText: "http.status.code:int",
			expected: TelemetryFieldKey{
				Name:          "http.status.code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		// Test case for just field name
		{
			keyText: "fieldName",
			expected: TelemetryFieldKey{
				Name:          "fieldName",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for just field name with data type
		{
			keyText: "fieldName:string",
			expected: TelemetryFieldKey{
				Name:          "fieldName",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeString,
			},
		},
		// Test case for field starting with dot
		{
			keyText: ".http_code",
			expected: TelemetryFieldKey{
				Name:          ".http_code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		// Test case for field starting with dot and with data type
		{
			keyText: ".http_code:int",
			expected: TelemetryFieldKey{
				Name:          ".http_code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		// Test case for field starting with dot and nested field name
		{
			keyText: ".http.status.code:int",
			expected: TelemetryFieldKey{
				Name:          ".http.status.code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeNumber,
			},
		},
	}

	for _, testCase := range testCases {
		result := GetFieldKeyFromKeyText(testCase.keyText)
		if !reflect.DeepEqual(result, testCase.expected) {
			t.Errorf("For key '%s': expected %v, got %v", testCase.keyText, testCase.expected, result)
		}
	}
}

func TestNormalize(t *testing.T) {
	testCases := []struct {
		name     string
		input    TelemetryFieldKey
		expected TelemetryFieldKey
	}{
		{
			name: "Normalize key with context and data type in name",
			input: TelemetryFieldKey{
				Name: "resource.service.name:string",
			},
			expected: TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  FieldContextResource,
				FieldDataType: FieldDataTypeString,
			},
		},
		{
			name: "Normalize key with existing context and data type",
			input: TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  FieldContextResource,
				FieldDataType: FieldDataTypeString,
			},
			expected: TelemetryFieldKey{
				Name:          "service.name",
				FieldContext:  FieldContextResource,
				FieldDataType: FieldDataTypeString,
			},
		},
		{
			name: "Normalize body field",
			input: TelemetryFieldKey{
				Name: "body.status:int",
			},
			expected: TelemetryFieldKey{
				Name:          "status",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		{
			name: "Normalize log.body.* field",
			input: TelemetryFieldKey{
				Name: "log.body.status",
			},
			expected: TelemetryFieldKey{
				Name:          "status",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			name: "Normalize field with no context",
			input: TelemetryFieldKey{
				Name: "http.status.code:int",
			},
			expected: TelemetryFieldKey{
				Name:          "http.status.code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		{
			name: "Normalize exact body keyword",
			input: TelemetryFieldKey{
				Name: "body",
			},
			expected: TelemetryFieldKey{
				Name:          "body",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			name: "Normalize span field",
			input: TelemetryFieldKey{
				Name: "span.kind:string",
			},
			expected: TelemetryFieldKey{
				Name:          "kind",
				FieldContext:  FieldContextSpan,
				FieldDataType: FieldDataTypeString,
			},
		},
		{
			name: "Normalize attribute field",
			input: TelemetryFieldKey{
				Name: "attribute.http.method",
			},
			expected: TelemetryFieldKey{
				Name:          "http.method",
				FieldContext:  FieldContextAttribute,
				FieldDataType: FieldDataTypeUnspecified,
			},
		},
		{
			name: "Normalize field starting with dot",
			input: TelemetryFieldKey{
				Name: ".http_code:int",
			},
			expected: TelemetryFieldKey{
				Name:          ".http_code",
				FieldContext:  FieldContextUnspecified,
				FieldDataType: FieldDataTypeNumber,
			},
		},
		{
			name: "Normalize array data type field",
			input: TelemetryFieldKey{
				Name: "body.tags:[]string",
			},
			expected: TelemetryFieldKey{
				Name:          "tags",
				FieldContext:  FieldContextBody,
				FieldDataType: FieldDataTypeArrayString,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			key := tc.input
			key.Normalize()
			if !reflect.DeepEqual(key, tc.expected) {
				t.Errorf("Expected %v, got %v", tc.expected, key)
			}
		})
	}
}
