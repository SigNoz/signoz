package variables

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/antlr4-go/antlr/v4"
)

// ErrorListener collects syntax errors during parsing
type ErrorListener struct {
	*antlr.DefaultErrorListener
	SyntaxErrors []error
}

// NewErrorListener creates a new error listener
func NewErrorListener() *ErrorListener {
	return &ErrorListener{
		DefaultErrorListener: antlr.NewDefaultErrorListener(),
		SyntaxErrors:         []error{},
	}
}

// SyntaxError is called when a syntax error is encountered
func (e *ErrorListener) SyntaxError(recognizer antlr.Recognizer, offendingSymbol any, line, column int, msg string, ex antlr.RecognitionException) {
	e.SyntaxErrors = append(e.SyntaxErrors, errors.NewInvalidInputf(errors.CodeInvalidInput, "line %d:%d %s", line, column, msg))
}

// variableReplacementVisitor implements the visitor interface
// to replace variables in filter expressions with their actual values
type variableReplacementVisitor struct {
	variables map[string]qbtypes.VariableItem
	errors    []string
}

// specialSkipMarker is used to indicate that a condition should be removed
const specialSkipMarker = "__SKIP_CONDITION__"

// ReplaceVariablesInExpression takes a filter expression and returns it with variables replaced
func ReplaceVariablesInExpression(expression string, variables map[string]qbtypes.VariableItem) (string, error) {
	input := antlr.NewInputStream(expression)
	lexer := grammar.NewFilterQueryLexer(input)

	visitor := &variableReplacementVisitor{
		variables: variables,
		errors:    []string{},
	}

	lexerErrorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parserErrorListener := NewErrorListener()
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	tree := parser.Query()

	if len(parserErrorListener.SyntaxErrors) > 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "syntax errors in expression: %v", parserErrorListener.SyntaxErrors)
	}

	result := visitor.Visit(tree).(string)

	if len(visitor.errors) > 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "errors processing expression: %v", visitor.errors)
	}

	// If the entire expression should be skipped, return empty string
	if result == specialSkipMarker {
		return "", nil
	}

	return result, nil
}

// Visit dispatches to the specific visit method based on node type
func (v *variableReplacementVisitor) Visit(tree antlr.ParseTree) any {
	if tree == nil {
		return ""
	}

	switch t := tree.(type) {
	case *grammar.QueryContext:
		return v.VisitQuery(t)
	case *grammar.ExpressionContext:
		return v.VisitExpression(t)
	case *grammar.OrExpressionContext:
		return v.VisitOrExpression(t)
	case *grammar.AndExpressionContext:
		return v.VisitAndExpression(t)
	case *grammar.UnaryExpressionContext:
		return v.VisitUnaryExpression(t)
	case *grammar.PrimaryContext:
		return v.VisitPrimary(t)
	case *grammar.ComparisonContext:
		return v.VisitComparison(t)
	case *grammar.InClauseContext:
		return v.VisitInClause(t)
	case *grammar.NotInClauseContext:
		return v.VisitNotInClause(t)
	case *grammar.ValueListContext:
		return v.VisitValueList(t)
	case *grammar.FullTextContext:
		return v.VisitFullText(t)
	case *grammar.FunctionCallContext:
		return v.VisitFunctionCall(t)
	case *grammar.FunctionParamListContext:
		return v.VisitFunctionParamList(t)
	case *grammar.FunctionParamContext:
		return v.VisitFunctionParam(t)
	case *grammar.ArrayContext:
		return v.VisitArray(t)
	case *grammar.ValueContext:
		return v.VisitValue(t)
	case *grammar.KeyContext:
		return v.VisitKey(t)
	default:
		// For unknown types, return the original text
		return tree.GetText()
	}
}

func (v *variableReplacementVisitor) VisitQuery(ctx *grammar.QueryContext) any {
	return v.Visit(ctx.Expression())
}

func (v *variableReplacementVisitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

func (v *variableReplacementVisitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	andExpressions := ctx.AllAndExpression()

	parts := make([]string, 0, len(andExpressions))
	for _, expr := range andExpressions {
		part := v.Visit(expr).(string)
		// Skip conditions that should be removed
		if part != specialSkipMarker && part != "" {
			parts = append(parts, part)
		}
	}

	if len(parts) == 0 {
		return specialSkipMarker
	}

	if len(parts) == 1 {
		return parts[0]
	}

	return strings.Join(parts, " OR ")
}

func (v *variableReplacementVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	unaryExpressions := ctx.AllUnaryExpression()

	parts := make([]string, 0, len(unaryExpressions))
	for _, expr := range unaryExpressions {
		part := v.Visit(expr).(string)
		// Skip conditions that should be removed
		if part != specialSkipMarker && part != "" {
			parts = append(parts, part)
		}
	}

	if len(parts) == 0 {
		return specialSkipMarker
	}

	if len(parts) == 1 {
		return parts[0]
	}

	return strings.Join(parts, " AND ")
}

func (v *variableReplacementVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(string)

	// If the condition should be skipped, propagate it up
	if result == specialSkipMarker {
		return specialSkipMarker
	}

	if ctx.NOT() != nil {
		return "NOT " + result
	}

	return result
}

func (v *variableReplacementVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		return "(" + v.Visit(ctx.OrExpression()).(string) + ")"
	} else if ctx.Comparison() != nil {
		return v.Visit(ctx.Comparison())
	} else if ctx.FunctionCall() != nil {
		return v.Visit(ctx.FunctionCall())
	} else if ctx.FullText() != nil {
		return v.Visit(ctx.FullText())
	}

	// Handle standalone key/value
	if ctx.GetChildCount() == 1 {
		child := ctx.GetChild(0)
		if parseTree, ok := child.(antlr.ParseTree); ok {
			return v.Visit(parseTree).(string)
		}
		// Fallback to getting text from the context
		return ctx.GetText()
	}

	return ctx.GetText()
}

func (v *variableReplacementVisitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	// First check if any value contains __all__ variable
	values := ctx.AllValue()
	for _, val := range values {
		valueResult := v.Visit(val).(string)
		if valueResult == specialSkipMarker {
			return specialSkipMarker
		}
	}

	// Also check in IN/NOT IN clauses
	if ctx.InClause() != nil {
		inResult := v.Visit(ctx.InClause()).(string)
		if inResult == specialSkipMarker {
			return specialSkipMarker
		}
	}

	if ctx.NotInClause() != nil {
		notInResult := v.Visit(ctx.NotInClause()).(string)
		if notInResult == specialSkipMarker {
			return specialSkipMarker
		}
	}

	var parts []string

	// Add key
	parts = append(parts, v.Visit(ctx.Key()).(string))

	// Handle EXISTS
	if ctx.EXISTS() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " EXISTS")
		return strings.Join(parts, "")
	}

	// Handle IN/NOT IN
	if ctx.InClause() != nil {
		parts = append(parts, " IN ")
		parts = append(parts, v.Visit(ctx.InClause()).(string))
		return strings.Join(parts, "")
	}

	if ctx.NotInClause() != nil {
		parts = append(parts, " NOT IN ")
		parts = append(parts, v.Visit(ctx.NotInClause()).(string))
		return strings.Join(parts, "")
	}

	// Handle BETWEEN
	if ctx.BETWEEN() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " BETWEEN ")
		values := ctx.AllValue()
		parts = append(parts, v.Visit(values[0]).(string))
		parts = append(parts, " AND ")
		parts = append(parts, v.Visit(values[1]).(string))
		return strings.Join(parts, "")
	}

	// Handle other operators
	if ctx.EQUALS() != nil {
		parts = append(parts, " = ")
	} else if ctx.NOT_EQUALS() != nil {
		parts = append(parts, " != ")
	} else if ctx.NEQ() != nil {
		parts = append(parts, " <> ")
	} else if ctx.LT() != nil {
		parts = append(parts, " < ")
	} else if ctx.LE() != nil {
		parts = append(parts, " <= ")
	} else if ctx.GT() != nil {
		parts = append(parts, " > ")
	} else if ctx.GE() != nil {
		parts = append(parts, " >= ")
	} else if ctx.LIKE() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " LIKE ")
	} else if ctx.ILIKE() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " ILIKE ")
	} else if ctx.REGEXP() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " REGEXP ")
	} else if ctx.CONTAINS() != nil {
		if ctx.NOT() != nil {
			parts = append(parts, " NOT")
		}
		parts = append(parts, " CONTAINS ")
	}

	// Add value
	if len(values) > 0 {
		parts = append(parts, v.Visit(values[0]).(string))
	}

	return strings.Join(parts, "")
}

func (v *variableReplacementVisitor) VisitInClause(ctx *grammar.InClauseContext) any {
	if ctx.ValueList() != nil {
		result := v.Visit(ctx.ValueList()).(string)
		if result == specialSkipMarker {
			return specialSkipMarker
		}
		return result
	}
	result := v.Visit(ctx.Value()).(string)
	if result == specialSkipMarker {
		return specialSkipMarker
	}
	return result
}

func (v *variableReplacementVisitor) VisitNotInClause(ctx *grammar.NotInClauseContext) any {
	if ctx.ValueList() != nil {
		result := v.Visit(ctx.ValueList()).(string)
		if result == specialSkipMarker {
			return specialSkipMarker
		}
		return result
	}
	result := v.Visit(ctx.Value()).(string)
	if result == specialSkipMarker {
		return specialSkipMarker
	}
	return result
}

func (v *variableReplacementVisitor) VisitValueList(ctx *grammar.ValueListContext) any {
	values := ctx.AllValue()

	// Check if any value is __all__
	for _, val := range values {
		result := v.Visit(val).(string)
		if result == specialSkipMarker {
			return specialSkipMarker
		}
	}

	parts := make([]string, 0, len(values))
	for i, val := range values {
		if i > 0 {
			parts = append(parts, ", ")
		}
		parts = append(parts, v.Visit(val).(string))
	}

	return "(" + strings.Join(parts, "") + ")"
}

func (v *variableReplacementVisitor) VisitFullText(ctx *grammar.FullTextContext) any {
	if ctx.QUOTED_TEXT() != nil {
		return ctx.QUOTED_TEXT().GetText()
	} else if ctx.FREETEXT() != nil {
		return ctx.FREETEXT().GetText()
	}
	return ""
}

func (v *variableReplacementVisitor) VisitFunctionCall(ctx *grammar.FunctionCallContext) any {
	var functionName string
	if ctx.HAS() != nil {
		functionName = "has"
	} else if ctx.HASANY() != nil {
		functionName = "hasAny"
	} else if ctx.HASALL() != nil {
		functionName = "hasAll"
	} else if ctx.HASTOKEN() != nil {
		functionName = "hasToken"
	}

	params := v.Visit(ctx.FunctionParamList()).(string)
	return functionName + "(" + params + ")"
}

func (v *variableReplacementVisitor) VisitFunctionParamList(ctx *grammar.FunctionParamListContext) any {
	params := ctx.AllFunctionParam()
	parts := make([]string, 0, len(params))

	for i, param := range params {
		if i > 0 {
			parts = append(parts, ", ")
		}
		parts = append(parts, v.Visit(param).(string))
	}

	return strings.Join(parts, "")
}

func (v *variableReplacementVisitor) VisitFunctionParam(ctx *grammar.FunctionParamContext) any {
	if ctx.Key() != nil {
		return v.Visit(ctx.Key())
	} else if ctx.Value() != nil {
		return v.Visit(ctx.Value())
	} else if ctx.Array() != nil {
		return v.Visit(ctx.Array())
	}
	return ""
}

func (v *variableReplacementVisitor) VisitArray(ctx *grammar.ArrayContext) any {
	valueList := v.Visit(ctx.ValueList()).(string)
	// Don't wrap in brackets if it's already wrapped in parentheses
	if strings.HasPrefix(valueList, "(") {
		return valueList
	}
	return "[" + valueList + "]"
}

func (v *variableReplacementVisitor) VisitValue(ctx *grammar.ValueContext) any {
	// First get the original value
	var originalValue string
	if ctx.QUOTED_TEXT() != nil {
		quotedText := ctx.QUOTED_TEXT().GetText()
		originalValue = trimQuotes(quotedText)
	} else if ctx.NUMBER() != nil {
		originalValue = ctx.NUMBER().GetText()
	} else if ctx.KEY() != nil {
		originalValue = ctx.KEY().GetText()
	} else if ctx.BOOL() != nil {
		originalValue = ctx.BOOL().GetText()
	}

	// Check if this is a variable (starts with $)
	if strings.HasPrefix(originalValue, "$") {
		varName := originalValue

		// Try with $ prefix first
		varItem, ok := v.variables[varName]
		if !ok && len(varName) > 1 {
			// Try without $ prefix
			varItem, ok = v.variables[varName[1:]]
		}

		if ok {
			// Handle dynamic variable with __all__ value
			if varItem.Type == qbtypes.DynamicVariableType {
				if allVal, ok := varItem.Value.(string); ok && allVal == "__all__" {
					// Return special marker to indicate this condition should be removed
					return specialSkipMarker
				}
			}

			// Replace variable with its value
			return v.formatVariableValue(varItem.Value)
		}
	}

	// Return original value if not a variable or variable not found
	// If it was quoted text and not a variable, return with quotes
	if ctx.QUOTED_TEXT() != nil && !strings.HasPrefix(originalValue, "$") {
		return ctx.QUOTED_TEXT().GetText()
	}
	return originalValue
}

func (v *variableReplacementVisitor) VisitKey(ctx *grammar.KeyContext) any {
	keyText := ctx.GetText()

	// Check if this key is actually a variable
	if strings.HasPrefix(keyText, "$") {
		varName := keyText

		// Try with $ prefix first
		varItem, ok := v.variables[varName]
		if !ok && len(varName) > 1 {
			// Try without $ prefix
			varItem, ok = v.variables[varName[1:]]
		}

		if ok {
			// Handle dynamic variable with __all__ value
			if varItem.Type == qbtypes.DynamicVariableType {
				if allVal, ok := varItem.Value.(string); ok && allVal == "__all__" {
					return specialSkipMarker
				}
			}
			// Replace variable with its value
			return v.formatVariableValue(varItem.Value)
		}
	}

	return keyText
}

// formatVariableValue formats a variable value for inclusion in the expression
func (v *variableReplacementVisitor) formatVariableValue(value any) string {
	switch val := value.(type) {
	case string:
		// Quote string values
		return fmt.Sprintf("'%s'", strings.ReplaceAll(val, "'", "\\'"))
	case []string:
		parts := make([]string, len(val))
		for i, item := range val {
			parts[i] = fmt.Sprintf("'%s'", strings.ReplaceAll(item, "'", "\\'"))
		}
		return "[" + strings.Join(parts, ", ") + "]"
	case []any:
		// Format array values
		parts := make([]string, len(val))
		for i, item := range val {
			parts[i] = v.formatVariableValue(item)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	case int, int32, int64, float32, float64:
		return fmt.Sprintf("%v", val)
	case bool:
		return strconv.FormatBool(val)
	default:
		return fmt.Sprintf("%v", val)
	}
}

func trimQuotes(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}
