package preferencetypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewValue(t *testing.T) {
	testCases := []struct {
		name          string
		input         any
		valueType     ValueType
		expectedValue Value
		pass          bool
	}{
		{
			name:          "SimpleInteger",
			input:         1,
			valueType:     ValueTypeInteger,
			expectedValue: Value{goValue: int64(1), stringValue: "1", valueType: ValueTypeInteger},
			pass:          true,
		},
		{
			name:          "SimpleFloat",
			input:         1.1,
			valueType:     ValueTypeFloat,
			expectedValue: Value{goValue: float64(1.1), stringValue: "1.1", valueType: ValueTypeFloat},
			pass:          true,
		},
		{
			name:          "SimpleString",
			input:         "test",
			valueType:     ValueTypeString,
			expectedValue: Value{goValue: "test", stringValue: "\"test\"", valueType: ValueTypeString},
			pass:          true,
		},
		{
			name:          "SimpleBoolean",
			input:         true,
			valueType:     ValueTypeBoolean,
			expectedValue: Value{goValue: true, stringValue: "true", valueType: ValueTypeBoolean},
			pass:          true,
		},
		{
			name:          "SimpleArray",
			input:         []any{1, 2, 3},
			valueType:     ValueTypeArray,
			expectedValue: Value{goValue: []any{1, 2, 3}, stringValue: "[1,2,3]", valueType: ValueTypeArray},
			pass:          true,
		},
		{
			name:          "SimpleObject",
			input:         map[string]any{"a": 1, "b": 2, "c": 3},
			valueType:     ValueTypeObject,
			expectedValue: Value{goValue: map[string]any{"a": 1, "b": 2, "c": 3}, stringValue: `{"a":1,"b":2,"c":3}`, valueType: ValueTypeObject},
			pass:          true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			value, err := NewValue(testCase.input, testCase.valueType)

			if !testCase.pass {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, testCase.expectedValue, value)
		})
	}
}
