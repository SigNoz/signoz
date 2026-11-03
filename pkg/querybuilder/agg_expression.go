package querybuilder

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/aggregationexpression/grammar"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/antlr4-go/antlr/v4"
)

// AggregationKeySelectors returns the keys an aggregation expression reads: its
// field arguments and the keys in a combinator's predicate. An expression the
// grammar rejects falls back to every key token in it.
func AggregationKeySelectors(expression string) []*telemetrytypes.FieldKeySelector {
	calls, err := parseAggregationExpression(expression)
	if err != nil {
		return QueryStringToKeysSelectors(expression)
	}

	var selectors []*telemetrytypes.FieldKeySelector
	for _, args := range calls {
		for _, arg := range args {
			selectors = append(selectors, QueryStringToKeysSelectors(arg)...)
		}
	}
	return selectors
}

// parseAggregationExpression parses an aggregation expression into the
// arguments of each function call, as written. It checks each call as the
// rewriter does: a known function and, for one that requires arguments, an
// argument count in range. Only the first of comma-separated expressions is
// read, since it is the only one the rewriter renders.
func parseAggregationExpression(expression string) ([][]string, error) {
	input := antlr.NewInputStream(expression)

	lexer := grammar.NewAggregationExpressionLexer(input)
	lexerErrors := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrors)

	parser := grammar.NewAggregationExpressionParser(antlr.NewCommonTokenStream(lexer, antlr.TokenDefaultChannel))
	parserErrors := NewErrorListener()
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrors)

	query := parser.Query()

	if syntaxErrors := append(lexerErrors.SyntaxErrors, parserErrors.SyntaxErrors...); len(syntaxErrors) > 0 {
		messages := make([]string, 0, len(syntaxErrors))
		for _, syntaxError := range syntaxErrors {
			messages = append(messages, syntaxError.Error())
		}
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "syntax error in aggregation expression %q", expression).
			WithAdditional(messages...)
	}

	var calls [][]string
	for _, functionCall := range collectFunctionCalls(query.Expression(0), nil) {
		name := strings.ToLower(functionCall.KEY().GetText())
		function, ok := AggreFuncMap[valuer.NewString(name)]
		if !ok {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unrecognized function: %s", name)
		}

		var args []string
		if argumentList := functionCall.ArgumentList(); argumentList != nil {
			for _, argument := range argumentList.AllArgument() {
				args = append(args, input.GetText(argument.GetStart().GetStart(), argument.GetStop().GetStop()))
			}
		}
		if function.RequireArgs && (len(args) < function.MinArgs || len(args) > function.MaxArgs) {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid number of arguments for %q: %d", name, len(args))
		}

		calls = append(calls, args)
	}
	return calls, nil
}

func collectFunctionCalls(expression grammar.IExpressionContext, calls []grammar.IFunctionCallContext) []grammar.IFunctionCallContext {
	switch e := expression.(type) {
	case *grammar.FunctionExpressionContext:
		calls = append(calls, e.FunctionCall())
	case *grammar.UnaryExpressionContext:
		calls = collectFunctionCalls(e.Expression(), calls)
	case *grammar.ParenthesizedExpressionContext:
		calls = collectFunctionCalls(e.Expression(), calls)
	case *grammar.AdditiveExpressionContext:
		for _, operand := range e.AllExpression() {
			calls = collectFunctionCalls(operand, calls)
		}
	case *grammar.MultiplicativeExpressionContext:
		for _, operand := range e.AllExpression() {
			calls = collectFunctionCalls(operand, calls)
		}
	}
	return calls
}
