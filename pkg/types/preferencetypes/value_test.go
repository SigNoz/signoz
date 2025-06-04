package preferencetypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
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

func TestPreferenceUpdateValue(t *testing.T) {
	testCases := []struct {
		name          string
		preference    *Preference
		input         Value
		expectedValue Value
		pass          bool
	}{
		{
			name: "IntegerWithDiscreteValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeInteger,
				DefaultValue:     MustNewValue(0, ValueTypeInteger),
				AllowedValues:    []any{int64(1), int64(2), int64(3)},
				IsDiscreteValues: true,
				Range:            Range{},
				AllowedScopes:    []Scope{ScopeOrg},
				Value:            MustNewValue(0, ValueTypeInteger),
			},
			input:         MustNewValue(1, ValueTypeInteger),
			expectedValue: MustNewValue(1, ValueTypeInteger),
			pass:          true,
		},
		{
			name: "IntegerWithRangeValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeInteger,
				DefaultValue:     MustNewValue(0, ValueTypeInteger),
				AllowedValues:    []any{int64(1), int64(2), int64(3)},
				IsDiscreteValues: false,
				Range: Range{
					Min: 0,
					Max: 3,
				},
				AllowedScopes: []Scope{ScopeOrg},
				Value:         MustNewValue(0, ValueTypeInteger),
			},
			input:         MustNewValue(1, ValueTypeInteger),
			expectedValue: MustNewValue(1, ValueTypeInteger),
			pass:          true,
		},
		{
			name: "FloatWithAllowedValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeFloat,
				DefaultValue:     MustNewValue(0, ValueTypeFloat),
				AllowedValues:    []any{float64(1.1), float64(2.2), float64(3.3)},
				IsDiscreteValues: true,
				Range:            Range{},
				AllowedScopes:    []Scope{ScopeOrg},
				Value:            MustNewValue(0, ValueTypeFloat),
			},
			input: MustNewValue(5.1, ValueTypeFloat),
			pass:  false,
		},
		{
			name: "ArrayWithMatchingElements",
			preference: &Preference{
				Name:          Name{valuer.NewString("test")},
				ValueType:     ValueTypeArray,
				DefaultValue:  MustNewValue([]any{}, ValueTypeArray),
				AllowedScopes: []Scope{ScopeOrg},
				Value:         MustNewValue([]any{}, ValueTypeArray),
			},
			input:         MustNewValue([]any{1, 2, 3}, ValueTypeArray),
			expectedValue: MustNewValue([]any{1, 2, 3}, ValueTypeArray),
			pass:          true,
		},
		{
			name: "ArrayWithMismatchedElements",
			preference: &Preference{
				Name:          Name{valuer.NewString("test")},
				ValueType:     ValueTypeArray,
				DefaultValue:  MustNewValue([]any{}, ValueTypeArray),
				AllowedScopes: []Scope{ScopeOrg},
				Value:         MustNewValue([]any{}, ValueTypeArray),
			},
			input:         MustNewValue([]any{true, "string"}, ValueTypeArray),
			expectedValue: MustNewValue([]any{true, "string"}, ValueTypeArray),
			pass:          true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.preference.UpdateValue(testCase.input)
			if !testCase.pass {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, testCase.expectedValue, testCase.preference.Value)
		})
	}
}
