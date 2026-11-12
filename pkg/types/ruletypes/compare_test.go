package ruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCompareOperator_NormalizeAndLiteral(t *testing.T) {
	cases := []struct {
		canonical CompareOperator
		literal   string
		spellings []CompareOperator
	}{
		{ValueIsAbove, "above", []CompareOperator{ValueIsAbove, ValueIsAboveLiteral, ValueIsAboveSymbol}},
		{ValueIsBelow, "below", []CompareOperator{ValueIsBelow, ValueIsBelowLiteral, ValueIsBelowSymbol}},
		{ValueIsEq, "equal", []CompareOperator{ValueIsEq, ValueIsEqLiteral, ValueIsEqLiteralShort, ValueIsEqSymbol}},
		{ValueIsNotEq, "not_equal", []CompareOperator{ValueIsNotEq, ValueIsNotEqLiteral, ValueIsNotEqLiteralShort, ValueIsNotEqSymbol}},
		{ValueAboveOrEq, "above_or_equal", []CompareOperator{ValueAboveOrEq, ValueAboveOrEqLiteral, ValueAboveOrEqLiteralShort, ValueAboveOrEqSymbol}},
		{ValueBelowOrEq, "below_or_equal", []CompareOperator{ValueBelowOrEq, ValueBelowOrEqLiteral, ValueBelowOrEqLiteralShort, ValueBelowOrEqSymbol}},
		{ValueOutsideBounds, "outside_bounds", []CompareOperator{ValueOutsideBounds, ValueOutsideBoundsLiteral}},
	}
	for _, c := range cases {
		for _, op := range c.spellings {
			t.Run(op.StringValue(), func(t *testing.T) {
				assert.Equal(t, c.canonical, op.Normalize())
				assert.Equal(t, c.literal, op.Literal())
			})
		}
	}
}
