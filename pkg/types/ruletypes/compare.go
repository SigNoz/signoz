package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type CompareOperator struct {
	valuer.String
}

var (
	ValueIsAbove        = CompareOperator{valuer.NewString("1")}
	ValueIsAboveLiteral = CompareOperator{valuer.NewString("above")}
	ValueIsAboveSymbol  = CompareOperator{valuer.NewString(">")}

	ValueIsBelow        = CompareOperator{valuer.NewString("2")}
	ValueIsBelowLiteral = CompareOperator{valuer.NewString("below")}
	ValueIsBelowSymbol  = CompareOperator{valuer.NewString("<")}

	ValueIsEq             = CompareOperator{valuer.NewString("3")}
	ValueIsEqLiteral      = CompareOperator{valuer.NewString("equal")}
	ValueIsEqLiteralShort = CompareOperator{valuer.NewString("eq")}
	ValueIsEqSymbol       = CompareOperator{valuer.NewString("=")}

	ValueIsNotEq             = CompareOperator{valuer.NewString("4")}
	ValueIsNotEqLiteral      = CompareOperator{valuer.NewString("not_equal")}
	ValueIsNotEqLiteralShort = CompareOperator{valuer.NewString("not_eq")}
	ValueIsNotEqSymbol       = CompareOperator{valuer.NewString("!=")}

	ValueAboveOrEq             = CompareOperator{valuer.NewString("5")}
	ValueAboveOrEqLiteral      = CompareOperator{valuer.NewString("above_or_equal")}
	ValueAboveOrEqLiteralShort = CompareOperator{valuer.NewString("above_or_eq")}
	ValueAboveOrEqSymbol       = CompareOperator{valuer.NewString(">=")}

	ValueBelowOrEq             = CompareOperator{valuer.NewString("6")}
	ValueBelowOrEqLiteral      = CompareOperator{valuer.NewString("below_or_equal")}
	ValueBelowOrEqLiteralShort = CompareOperator{valuer.NewString("below_or_eq")}
	ValueBelowOrEqSymbol       = CompareOperator{valuer.NewString("<=")}

	ValueOutsideBounds        = CompareOperator{valuer.NewString("7")}
	ValueOutsideBoundsLiteral = CompareOperator{valuer.NewString("outside_bounds")}
)

func (CompareOperator) Enum() []any {
	return []any{
		ValueIsAboveLiteral,
		ValueIsBelowLiteral,
		ValueIsEqLiteral,
		ValueIsNotEqLiteral,
		// ValueAboveOrEqLiteral,
		// ValueBelowOrEqLiteral,
		ValueOutsideBoundsLiteral,
	}
}

func (c CompareOperator) Validate() error {
	switch c {
	case ValueIsAbove,
		ValueIsAboveLiteral,
		ValueIsAboveSymbol,
		ValueIsBelow,
		ValueIsBelowLiteral,
		ValueIsBelowSymbol,
		ValueIsEq,
		ValueIsEqLiteral,
		ValueIsEqLiteralShort,
		ValueIsEqSymbol,
		ValueIsNotEq,
		ValueIsNotEqLiteral,
		ValueIsNotEqLiteralShort,
		ValueIsNotEqSymbol,
		ValueOutsideBounds,
		ValueOutsideBoundsLiteral:
		return nil
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "unknown comparison operator, known values are: ")
	}
}
