package querybuilder

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
)

func TestCompileFormulaHaving_Matches(t *testing.T) {
	values := []float64{-2, 0, 1, 2.5, 3, 10}

	testCases := []struct {
		name       string
		expression string
		want       []float64
	}{
		{name: "Name_GreaterThan", expression: "F1 > 2", want: []float64{2.5, 3, 10}},
		{name: "Result_LessOrEqual", expression: "__result <= 1", want: []float64{-2, 0, 1}},
		{name: "DoubleEquals", expression: "F1 == 3", want: []float64{3}},
		{name: "AngleNotEquals", expression: "F1 <> 0", want: []float64{-2, 1, 2.5, 3, 10}},
		{name: "In_Parentheses", expression: "F1 IN (0, 3, -2)", want: []float64{-2, 0, 3}},
		{name: "NotIn_Brackets", expression: "F1 NOT IN [0, 3, -2]", want: []float64{1, 2.5, 10}},
		{name: "AndBindsTighterThanOr", expression: "F1 > 0 AND F1 < 3 OR F1 = -2", want: []float64{-2, 1, 2.5}},
		{name: "ImplicitAnd", expression: "F1 > 0 F1 < 3", want: []float64{1, 2.5}},
		{name: "LowercaseKeywords", expression: "F1 > 2 and not F1 = 10", want: []float64{2.5, 3}},
		{name: "NotParenthesized", expression: "NOT (F1 >= 1 AND F1 <= 3)", want: []float64{-2, 0, 10}},
		{name: "Arithmetic", expression: "F1 * 2 - 1 > 4", want: []float64{3, 10}},
		{name: "Arithmetic_Parentheses", expression: "(F1 + 2) / 2 >= 2", want: []float64{2.5, 3, 10}},
		{name: "Modulo", expression: "F1 % 2 = 1", want: []float64{1, 3}},
		{name: "UnaryMinus", expression: "-F1 > 1", want: []float64{-2}},
		{name: "Number_Exponent", expression: "F1 >= 1e1", want: []float64{10}},
		{name: "Number_LeadingDot", expression: "F1 < .5", want: []float64{-2, 0}},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			keep, err := CompileFormulaHaving("F1", testCase.expression)
			require.NoError(t, err)
			require.NotNil(t, keep)

			got := []float64{}
			for _, value := range values {
				if keep(value) {
					got = append(got, value)
				}
			}
			assert.Equal(t, testCase.want, got)
		})
	}
}

func TestCompileFormulaHaving_Invalid(t *testing.T) {
	testCases := []struct {
		name           string
		expression     string
		wantErrMsg     string
		wantAdditional []string
	}{
		{
			name:           "QueryName_NotAReference",
			expression:     "A > 0",
			wantErrMsg:     "Invalid references in `Having` expression: [A]",
			wantAdditional: []string{"Valid references are: [F1, __result]"},
		},
		{
			name:           "Aggregation_NotAReference",
			expression:     "count() > 0",
			wantErrMsg:     "Invalid references in `Having` expression: [count]",
			wantAdditional: []string{"Valid references are: [F1, __result]"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			keep, err := CompileFormulaHaving("F1", testCase.expression)
			require.Error(t, err)
			assert.Nil(t, keep)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			assert.ErrorContains(t, err, testCase.wantErrMsg)
			assert.Equal(t, testCase.wantAdditional, additionalMessages(err))
		})
	}
}
