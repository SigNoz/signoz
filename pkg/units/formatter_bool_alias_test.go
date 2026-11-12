package units

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBoolTrueFalseAlias(t *testing.T) {
	testCases := []struct {
		name  string
		unit  string
		value float64
		want  string
	}{
		{"Alias_Zero", "bool_true_false", 0, "false"},
		{"Alias_Positive", "bool_true_false", 1, "true"},
		{"Alias_Negative", "bool_true_false", -1, "true"},
		{"Bool_Zero", "bool", 0, "false"},
		{"Bool_Positive", "bool", 1, "true"},
		{"Bool_Negative", "bool", -1, "true"},
		{"UnknownUnit_PreservesValue", "unknown", 42, "42"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, FormatterFromUnit(testCase.unit).Format(testCase.value, testCase.unit))
		})
	}
}
