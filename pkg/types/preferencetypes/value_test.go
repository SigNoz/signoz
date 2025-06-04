package preferencetypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestPreferenceUpdateValue(t *testing.T) {
	testCases := []struct {
		name          string
		preference    *Preference
		input         any
		expectedValue any
		pass          bool
	}{
		{
			name: "IntegerWithDiscreteValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeInteger,
				DefaultValue:     0,
				AllowedValues:    []any{int64(1), int64(2), int64(3)},
				IsDiscreteValues: true,
				Range:            Range{},
				AllowedScopes:    []Scope{ScopeOrg},
				Value:            0,
			},
			input:         int64(1),
			expectedValue: int64(1),
			pass:          true,
		},
		{
			name: "IntegerWithRangeValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeInteger,
				DefaultValue:     0,
				AllowedValues:    []any{int64(1), int64(2), int64(3)},
				IsDiscreteValues: false,
				Range: Range{
					Min: 0,
					Max: 3,
				},
				AllowedScopes: []Scope{ScopeOrg},
				Value:         0,
			},
			input:         int64(1),
			expectedValue: int64(1),
			pass:          true,
		},
		{
			name: "FloatWithAllowedValues",
			preference: &Preference{
				Name:             Name{valuer.NewString("test")},
				ValueType:        ValueTypeFloat,
				DefaultValue:     0,
				AllowedValues:    []any{float64(1.1), float64(2.2), float64(3.3)},
				IsDiscreteValues: true,
				Range:            Range{},
				AllowedScopes:    []Scope{ScopeOrg},
				Value:            0,
			},
			input: float64(5.1),
			pass:  false,
		},
		{
			name: "ArrayWithMatchingElements",
			preference: &Preference{
				Name:          Name{valuer.NewString("test")},
				ValueType:     ValueTypeArray,
				DefaultValue:  []any{},
				AllowedScopes: []Scope{ScopeOrg},
				Value:         []any{},
			},
			input:         []any{1, 2, 3},
			expectedValue: []any{1, 2, 3},
			pass:          true,
		},
		{
			name: "ArrayWithMismatchedElements",
			preference: &Preference{
				Name:          Name{valuer.NewString("test")},
				ValueType:     ValueTypeArray,
				DefaultValue:  []any{},
				AllowedScopes: []Scope{ScopeOrg},
				Value:         []any{},
			},
			input: []any{true, "string"},
			pass:  true,
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
