package querybuilder

import (
	"math"
	"slices"
	"strconv"

	grammar "github.com/SigNoz/signoz/pkg/parser/havingexpression/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// CompileFormulaHaving turns the having expression of a formula into a filter on
// its values. The querier computes a formula in Go after ClickHouse returns, so the
// having cannot run as SQL; it gets the same validation and messages as a
// builder-query having, with the formula name and __result as the only references.
func CompileFormulaHaving(formulaName, expression string) (func(value float64) bool, error) {
	rewriter := &HavingExpressionRewriter{columnMap: map[string]string{
		formulaName:               qbtypes.DefaultOrderByKey,
		qbtypes.DefaultOrderByKey: qbtypes.DefaultOrderByKey,
	}}
	_, tree, err := rewriter.parseAndValidate(expression)
	if err != nil {
		return nil, err
	}

	return compileOrExpression(tree.Expression().OrExpression()), nil
}

func compileOrExpression(ctx grammar.IOrExpressionContext) func(float64) bool {
	andExpressions := ctx.AllAndExpression()
	conditions := make([]func(float64) bool, len(andExpressions))
	for i, andExpression := range andExpressions {
		conditions[i] = compileAndExpression(andExpression)
	}

	return func(value float64) bool {
		for _, condition := range conditions {
			if condition(value) {
				return true
			}
		}
		return false
	}
}

func compileAndExpression(ctx grammar.IAndExpressionContext) func(float64) bool {
	primaries := ctx.AllPrimary()
	conditions := make([]func(float64) bool, len(primaries))
	for i, primary := range primaries {
		conditions[i] = compilePrimary(primary)
	}

	return func(value float64) bool {
		for _, condition := range conditions {
			if !condition(value) {
				return false
			}
		}
		return true
	}
}

func compilePrimary(ctx grammar.IPrimaryContext) func(float64) bool {
	var condition func(float64) bool
	if ctx.OrExpression() != nil {
		condition = compileOrExpression(ctx.OrExpression())
	} else {
		condition = compileComparison(ctx.Comparison())
	}

	if ctx.NOT() == nil {
		return condition
	}
	return func(value float64) bool { return !condition(value) }
}

func compileComparison(ctx grammar.IComparisonContext) func(float64) bool {
	left := compileOperand(ctx.Operand(0))

	if ctx.IN() != nil {
		signedNumbers := ctx.InList().AllSignedNumber()
		list := make([]float64, len(signedNumbers))
		for i, signedNumber := range signedNumbers {
			list[i] = parseHavingNumber(signedNumber.GetText())
		}
		notIn := ctx.NOT() != nil
		return func(value float64) bool { return slices.Contains(list, left(value)) != notIn }
	}

	right := compileOperand(ctx.Operand(1))
	compOp := ctx.CompOp()
	switch {
	case compOp.EQUALS() != nil:
		return func(value float64) bool { return left(value) == right(value) }
	case compOp.NOT_EQUALS() != nil, compOp.NEQ() != nil:
		return func(value float64) bool { return left(value) != right(value) }
	case compOp.LT() != nil:
		return func(value float64) bool { return left(value) < right(value) }
	case compOp.LE() != nil:
		return func(value float64) bool { return left(value) <= right(value) }
	case compOp.GT() != nil:
		return func(value float64) bool { return left(value) > right(value) }
	default:
		return func(value float64) bool { return left(value) >= right(value) }
	}
}

func compileOperand(ctx grammar.IOperandContext) func(float64) float64 {
	if ctx.Operand() == nil {
		return compileTerm(ctx.Term())
	}

	left := compileOperand(ctx.Operand())
	right := compileTerm(ctx.Term())
	if ctx.MINUS() != nil {
		return func(value float64) float64 { return left(value) - right(value) }
	}
	return func(value float64) float64 { return left(value) + right(value) }
}

func compileTerm(ctx grammar.ITermContext) func(float64) float64 {
	if ctx.Term() == nil {
		return compileFactor(ctx.Factor())
	}

	left := compileTerm(ctx.Term())
	right := compileFactor(ctx.Factor())
	switch {
	case ctx.SLASH() != nil:
		return func(value float64) float64 { return left(value) / right(value) }
	case ctx.PERCENT() != nil:
		return func(value float64) float64 { return math.Mod(left(value), right(value)) }
	default:
		return func(value float64) float64 { return left(value) * right(value) }
	}
}

func compileFactor(ctx grammar.IFactorContext) func(float64) float64 {
	if ctx.Factor() != nil {
		inner := compileFactor(ctx.Factor())
		if ctx.MINUS() != nil {
			return func(value float64) float64 { return -inner(value) }
		}
		return inner
	}

	if ctx.Operand() != nil {
		return compileOperand(ctx.Operand())
	}

	if number := ctx.Atom().NUMBER(); number != nil {
		constant := parseHavingNumber(number.GetText())
		return func(float64) float64 { return constant }
	}

	// validation rejects function calls, strings, and unknown names, so the atom
	// names the formula value
	return func(value float64) float64 { return value }
}

// ParseFloat reads every form the lexer admits as a number; a literal outside the
// float64 range becomes the nearest value ParseFloat returns.
func parseHavingNumber(text string) float64 {
	number, _ := strconv.ParseFloat(text, 64)
	return number
}
