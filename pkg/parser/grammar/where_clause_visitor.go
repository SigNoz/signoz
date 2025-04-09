package parser

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// WhereClauseVisitor implements the FilterQueryVisitor interface
// to convert the parsed filter expressions into ClickHouse WHERE clause
type WhereClauseVisitor struct {
	conditionBuilder qbtypes.ConditionBuilder
	warnings         []string
	fieldKeys        map[string][]telemetrytypes.TelemetryFieldKey
	errors           []string
	builder          *sqlbuilder.SelectBuilder
	fullTextColumn   telemetrytypes.TelemetryFieldKey
}

// NewWhereClauseVisitor creates a new WhereClauseVisitor
func NewWhereClauseVisitor(
	conditionBuilder qbtypes.ConditionBuilder,
	fieldKeys map[string][]telemetrytypes.TelemetryFieldKey,
	builder *sqlbuilder.SelectBuilder,
	fullTextColumn telemetrytypes.TelemetryFieldKey,
) *WhereClauseVisitor {
	return &WhereClauseVisitor{
		conditionBuilder: conditionBuilder,
		fieldKeys:        fieldKeys,
		builder:          builder,
		fullTextColumn:   fullTextColumn,
	}
}

// ErrorListener is a custom error listener to capture syntax errors
type ErrorListener struct {
	*antlr.DefaultErrorListener
	Errors []string
}

// NewErrorListener creates a new error listener
func NewErrorListener() *ErrorListener {
	return &ErrorListener{
		DefaultErrorListener: antlr.NewDefaultErrorListener(),
		Errors:               []string{},
	}
}

// SyntaxError captures syntax errors during parsing
func (l *ErrorListener) SyntaxError(recognizer antlr.Recognizer, offendingSymbol any, line, column int, msg string, e antlr.RecognitionException) {
	l.Errors = append(l.Errors, fmt.Sprintf("line %d:%d %s", line, column, msg))
}

// PrepareWhereClause generates a ClickHouse compatible WHERE clause from the filter query
func PrepareWhereClause(
	query string,
	fieldKeys map[string][]telemetrytypes.TelemetryFieldKey,
	conditionBuilder qbtypes.ConditionBuilder,
	fullTextColumn telemetrytypes.TelemetryFieldKey,
) (string, []any, error) {
	// Setup the ANTLR parsing pipeline
	input := antlr.NewInputStream(query)
	lexer := NewFilterQueryLexer(input)

	sb := sqlbuilder.NewSelectBuilder()

	visitor := NewWhereClauseVisitor(conditionBuilder, fieldKeys, sb, fullTextColumn)

	// Set up error handling
	errorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(errorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parser := NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(errorListener)

	// Parse the query
	tree := parser.Query()

	// Handle syntax errors
	if len(errorListener.Errors) > 0 {
		return "", nil, fmt.Errorf("syntax error in filter query: %s", strings.Join(errorListener.Errors, "; "))
	}

	// Visit the parse tree with our ClickHouse visitor
	cond := visitor.Visit(tree).(string)

	whereClause, args := visitor.builder.Where(cond).BuildWithFlavor(sqlbuilder.ClickHouse)

	return whereClause, args, nil
}

// Visit dispatches to the specific visit method based on node type
func (v *WhereClauseVisitor) Visit(tree antlr.ParseTree) any {
	// Handle nil nodes to prevent panic
	if tree == nil {
		return ""
	}

	switch t := tree.(type) {
	case *QueryContext:
		return v.VisitQuery(t)
	case *ExpressionContext:
		return v.VisitExpression(t)
	case *OrExpressionContext:
		return v.VisitOrExpression(t)
	case *AndExpressionContext:
		return v.VisitAndExpression(t)
	case *UnaryExpressionContext:
		return v.VisitUnaryExpression(t)
	case *PrimaryContext:
		return v.VisitPrimary(t)
	case *ComparisonContext:
		return v.VisitComparison(t)
	case *InClauseContext:
		return v.VisitInClause(t)
	case *NotInClauseContext:
		return v.VisitNotInClause(t)
	case *ValueListContext:
		return v.VisitValueList(t)
	case *FullTextContext:
		return v.VisitFullText(t)
	case *FunctionCallContext:
		return v.VisitFunctionCall(t)
	case *FunctionParamListContext:
		return v.VisitFunctionParamList(t)
	case *FunctionParamContext:
		return v.VisitFunctionParam(t)
	case *ArrayContext:
		return v.VisitArray(t)
	case *ValueContext:
		return v.VisitValue(t)
	case *KeyContext:
		return v.VisitKey(t)
	default:
		return ""
	}
}

func (v *WhereClauseVisitor) VisitQuery(ctx *QueryContext) any {

	return v.Visit(ctx.Expression())
}

// VisitExpression passes through to the orExpression
func (v *WhereClauseVisitor) VisitExpression(ctx *ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

// VisitOrExpression handles OR expressions
func (v *WhereClauseVisitor) VisitOrExpression(ctx *OrExpressionContext) any {
	andExpressions := ctx.AllAndExpression()

	andExpressionConditions := make([]string, len(andExpressions))
	for i, expr := range andExpressions {
		andExpressionConditions[i] = v.Visit(expr).(string)
	}

	if len(andExpressionConditions) == 1 {
		return andExpressionConditions[0]
	}

	return v.builder.Or(andExpressionConditions...)
}

// VisitAndExpression handles AND expressions
func (v *WhereClauseVisitor) VisitAndExpression(ctx *AndExpressionContext) any {
	unaryExpressions := ctx.AllUnaryExpression()

	unaryExpressionConditions := make([]string, len(unaryExpressions))
	for i, expr := range unaryExpressions {
		unaryExpressionConditions[i] = v.Visit(expr).(string)
	}

	if len(unaryExpressionConditions) == 1 {
		return unaryExpressionConditions[0]
	}

	return v.builder.And(unaryExpressionConditions...)
}

// VisitUnaryExpression handles NOT expressions
func (v *WhereClauseVisitor) VisitUnaryExpression(ctx *UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(string)

	// Check if this is a NOT expression
	if ctx.NOT() != nil {
		return fmt.Sprintf("NOT (%s)", result)
	}

	return result
}

// VisitPrimary handles grouped expressions, comparisons, function calls, and full-text search
func (v *WhereClauseVisitor) VisitPrimary(ctx *PrimaryContext) any {
	if ctx.OrExpression() != nil {
		// This is a parenthesized expression
		return fmt.Sprintf("(%s)", v.Visit(ctx.OrExpression()).(string))
	} else if ctx.Comparison() != nil {
		return v.Visit(ctx.Comparison())
	} else if ctx.FunctionCall() != nil {
		return v.Visit(ctx.FunctionCall())
	} else if ctx.FullText() != nil {
		return v.Visit(ctx.FullText())
	}

	// Handle standalone key as a full text search term
	if ctx.GetChildCount() == 1 {
		child := ctx.GetChild(0)
		if keyCtx, ok := child.(*KeyContext); ok {
			// create a full text search condition on the body field
			keyText := keyCtx.GetText()
			cond, err := v.conditionBuilder.GetCondition(context.Background(), &v.fullTextColumn, qbtypes.FilterOperatorRegexp, keyText, v.builder)
			if err != nil {
				return ""
			}
			return cond
		}
	}

	return "" // Should not happen with valid input
}

// VisitComparison handles all comparison operators
func (v *WhereClauseVisitor) VisitComparison(ctx *ComparisonContext) any {
	keys := v.Visit(ctx.Key()).([]telemetrytypes.TelemetryFieldKey)

	// Handle EXISTS specially
	if ctx.EXISTS() != nil {
		op := qbtypes.FilterOperatorExists
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotExists
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), &key, op, nil, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		return v.builder.Or(conds...)
	}

	// Handle IN clause
	if ctx.InClause() != nil || ctx.NotInClause() != nil {
		values := v.Visit(ctx.InClause()).([]any)
		op := qbtypes.FilterOperatorIn
		if ctx.NotInClause() != nil {
			op = qbtypes.FilterOperatorNotIn
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), &key, op, values, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		return v.builder.Or(conds...)
	}

	// Handle BETWEEN
	if ctx.BETWEEN() != nil {
		op := qbtypes.FilterOperatorBetween
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotBetween
		}

		values := ctx.AllValue()
		if len(values) != 2 {
			return ""
		}

		value1 := v.Visit(values[0])
		value2 := v.Visit(values[1])

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), &key, op, []any{value1, value2}, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		return v.builder.Or(conds...)
	}

	// Get all values for operations that need them
	values := ctx.AllValue()
	if len(values) > 0 {
		value := v.Visit(values[0])

		var op qbtypes.FilterOperator

		// Handle each type of comparison
		if ctx.EQUALS() != nil {
			op = qbtypes.FilterOperatorEqual
		} else if ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil {
			op = qbtypes.FilterOperatorNotEqual
		} else if ctx.LT() != nil {
			op = qbtypes.FilterOperatorLessThan
		} else if ctx.LE() != nil {
			op = qbtypes.FilterOperatorLessThan
		} else if ctx.GT() != nil {
			op = qbtypes.FilterOperatorGreaterThan
		} else if ctx.GE() != nil {
			op = qbtypes.FilterOperatorGreaterThan
		} else if ctx.LIKE() != nil {
			op = qbtypes.FilterOperatorLike
		} else if ctx.ILIKE() != nil {
			op = qbtypes.FilterOperatorLike
		} else if ctx.NOT_LIKE() != nil {
			op = qbtypes.FilterOperatorNotLike
		} else if ctx.NOT_ILIKE() != nil {
			op = qbtypes.FilterOperatorNotLike
		} else if ctx.REGEXP() != nil {
			op = qbtypes.FilterOperatorRegexp
		} else if ctx.NOT() != nil && ctx.REGEXP() != nil {
			op = qbtypes.FilterOperatorNotRegexp
		} else if ctx.CONTAINS() != nil {
			op = qbtypes.FilterOperatorContains
		} else if ctx.NOT() != nil && ctx.CONTAINS() != nil {
			op = qbtypes.FilterOperatorNotContains
		}

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), &key, op, value, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		return v.builder.Or(conds...)
	}

	return "" // Should not happen with valid input
}

// VisitInClause handles IN expressions
func (v *WhereClauseVisitor) VisitInClause(ctx *InClauseContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitNotInClause handles NOT IN expressions
func (v *WhereClauseVisitor) VisitNotInClause(ctx *NotInClauseContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitValueList handles comma-separated value lists
func (v *WhereClauseVisitor) VisitValueList(ctx *ValueListContext) any {
	values := ctx.AllValue()

	parts := []any{}
	for _, val := range values {
		parts = append(parts, v.Visit(val))
	}

	return parts
}

// VisitFullText handles standalone quoted strings for full-text search
func (v *WhereClauseVisitor) VisitFullText(ctx *FullTextContext) any {
	// remove quotes from the quotedText
	quotedText := strings.Trim(ctx.QUOTED_TEXT().GetText(), "\"'")
	cond, err := v.conditionBuilder.GetCondition(context.Background(), &v.fullTextColumn, qbtypes.FilterOperatorRegexp, quotedText, v.builder)
	if err != nil {
		return ""
	}
	return cond
}

// VisitFunctionCall handles function calls like has(), hasAny(), etc.
func (v *WhereClauseVisitor) VisitFunctionCall(ctx *FunctionCallContext) any {
	// Get function name based on which token is present
	var functionName string
	if ctx.HAS() != nil {
		functionName = "has"
	} else if ctx.HASANY() != nil {
		functionName = "hasany"
	} else if ctx.HASALL() != nil {
		functionName = "hasall"
	} else if ctx.HASNONE() != nil {
		functionName = "hasnone"
	} else {
		// Default fallback
		functionName = "unknown_function"
	}
	params := v.Visit(ctx.FunctionParamList()).(string)

	// Map our functions to ClickHouse equivalents
	switch functionName {
	case "has":
		return fmt.Sprintf("has(%s)", params)
	case "hasany":
		return fmt.Sprintf("hasAny(%s)", params)
	case "hasall":
		return fmt.Sprintf("hasAll(%s)", params)
	case "hasnone":
		// ClickHouse doesn't have hasNone directly, so we negate hasAny
		return fmt.Sprintf("not hasAny(%s)", params)
	default:
		return fmt.Sprintf("%s(%s)", functionName, params)
	}
}

// VisitFunctionParamList handles the parameter list for function calls
func (v *WhereClauseVisitor) VisitFunctionParamList(ctx *FunctionParamListContext) any {
	params := ctx.AllFunctionParam()
	if len(params) == 0 {
		return ""
	}

	parts := make([]any, len(params))
	for i, param := range params {
		parts[i] = v.Visit(param)
	}

	return parts
}

// VisitFunctionParam handles individual parameters in function calls
func (v *WhereClauseVisitor) VisitFunctionParam(ctx *FunctionParamContext) any {
	if ctx.Key() != nil {
		return v.Visit(ctx.Key())
	} else if ctx.Value() != nil {
		return v.Visit(ctx.Value())
	} else if ctx.Array() != nil {
		return v.Visit(ctx.Array())
	}

	return "" // Should not happen with valid input
}

// VisitArray handles array literals
func (v *WhereClauseVisitor) VisitArray(ctx *ArrayContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitValue handles literal values: strings, numbers, booleans
func (v *WhereClauseVisitor) VisitValue(ctx *ValueContext) any {
	if ctx.QUOTED_TEXT() != nil {
		txt := ctx.QUOTED_TEXT().GetText()
		// trim quotes and return the value
		return strings.Trim(txt, "\"'")
	} else if ctx.NUMBER() != nil {
		number, err := strconv.ParseFloat(ctx.NUMBER().GetText(), 64)
		if err != nil {
			v.errors = append(v.errors, fmt.Sprintf("failed to parse number %s", ctx.NUMBER().GetText()))
			return ""
		}
		return number
	} else if ctx.BOOL() != nil {
		// Convert to ClickHouse boolean literal
		boolText := strings.ToLower(ctx.BOOL().GetText())
		return boolText == "true"
	} else if ctx.KEY() != nil {
		return ctx.KEY().GetText()
	}

	return "" // Should not happen with valid input
}

// VisitKey handles field/column references
func (v *WhereClauseVisitor) VisitKey(ctx *KeyContext) any {

	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(ctx.KEY().GetText())

	fieldKeysForName := v.fieldKeys[fieldKey.Name]

	if len(fieldKeysForName) == 0 {
		v.errors = append(v.errors, fmt.Sprintf("Key %s not found", fieldKey.Name))
	}

	if len(fieldKeysForName) > 1 {
		// this is warning state, we must have a unambiguous key
		v.warnings = append(v.warnings, fmt.Sprintf("Key %s is ambiguous, found %d different combinations of field context and data type", fieldKey.Name, len(fieldKeysForName)))
	}

	return fieldKeysForName
}
