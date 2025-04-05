package parser

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/antlr4-go/antlr/v4"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// ClickHouseVisitor implements the FilterQueryVisitor interface
// to convert the parsed filter expressions into ClickHouse WHERE clauses
type ClickHouseVisitor struct {
	conditionBuilder types.ConditionBuilder
	warnings         []string
	fieldKeys        map[string][]types.TelemetryFieldKey
	args             []any
	errors           []string
	builder          *sqlbuilder.SelectBuilder
}

// NewClickHouseVisitor creates a new ClickHouseVisitor
func NewClickHouseVisitor(
	conditionBuilder types.ConditionBuilder,
	fieldKeys map[string][]types.TelemetryFieldKey,
	builder *sqlbuilder.SelectBuilder,
) *ClickHouseVisitor {
	return &ClickHouseVisitor{
		conditionBuilder: conditionBuilder,
		fieldKeys:        fieldKeys,
		builder:          builder,
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

func getFieldSelectorFromKey(key string) types.FieldKeySelector {

	keyTextParts := strings.Split(key, ".")

	var explicitFieldContextProvided, explicitFieldDataTypeProvided bool
	var explicitFieldContext types.FieldContext
	var explicitFieldDataType types.FieldDataType

	if len(keyTextParts) > 1 {
		explicitFieldContext = types.FieldContextFromString(keyTextParts[0])
		if explicitFieldContext != types.FieldContextUnspecified {
			explicitFieldContextProvided = true
		}
	}

	if explicitFieldContextProvided {
		keyTextParts = keyTextParts[1:]
	}

	// check if there is a field data type provided
	if len(keyTextParts) > 1 {
		lastPart := keyTextParts[len(keyTextParts)-1]
		lastPartParts := strings.Split(lastPart, ":")
		if len(lastPartParts) > 1 {
			explicitFieldDataType = types.FieldDataTypeFromString(lastPartParts[1])
			if explicitFieldDataType != types.FieldDataTypeUnspecified {
				explicitFieldDataTypeProvided = true
			}
		}

		if explicitFieldDataTypeProvided {
			keyTextParts[len(keyTextParts)-1] = lastPartParts[0]
		}
	}

	realKey := strings.Join(keyTextParts, ".")

	fieldKeySelector := types.FieldKeySelector{
		Name: realKey,
	}

	if explicitFieldContextProvided {
		fieldKeySelector.FieldContext = explicitFieldContext
	} else {
		fieldKeySelector.FieldContext = types.FieldContextUnspecified
	}

	if explicitFieldDataTypeProvided {
		fieldKeySelector.FieldDataType = explicitFieldDataType
	} else {
		fieldKeySelector.FieldDataType = types.FieldDataTypeUnspecified
	}

	return fieldKeySelector
}

// PrepareWhereClause generates a ClickHouse compatible WHERE clause from the filter query
func PrepareWhereClause(query string, fieldKeys map[string][]types.TelemetryFieldKey, conditionBuilder types.ConditionBuilder) (string, error) {
	// Setup the ANTLR parsing pipeline
	input := antlr.NewInputStream(query)
	lexer := NewFilterQueryLexer(input)

	sb := sqlbuilder.NewSelectBuilder()

	visitor := NewClickHouseVisitor(conditionBuilder, fieldKeys, sb)

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
		return "", fmt.Errorf("syntax error in filter query: %s", strings.Join(errorListener.Errors, "; "))
	}

	// Visit the parse tree with our ClickHouse visitor
	whereClause := visitor.Visit(tree)

	// Convert result to string, handling nil cases
	if whereClause == nil {
		return "", fmt.Errorf("failed to generate WHERE clause for query: %s", query)
	}

	return whereClause.(string), nil
}

// Visit dispatches to the specific visit method based on node type
func (v *ClickHouseVisitor) Visit(tree antlr.ParseTree) any {
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

func (v *ClickHouseVisitor) VisitQuery(ctx *QueryContext) any {
	expressions := ctx.AllExpression()
	if len(expressions) == 0 {
		return ""
	}

	result := v.Visit(expressions[0])
	v.builder.Where(result.(string))

	sql, args := v.builder.BuildWithFlavor(sqlbuilder.ClickHouse)
	v.args = append(v.args, args...)
	return sql
}

// VisitExpression passes through to the orExpression
func (v *ClickHouseVisitor) VisitExpression(ctx *ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

// VisitOrExpression handles OR expressions
func (v *ClickHouseVisitor) VisitOrExpression(ctx *OrExpressionContext) any {
	andExpressions := ctx.AllAndExpression()
	if len(andExpressions) == 1 {
		return v.Visit(andExpressions[0])
	}

	parts := make([]string, len(andExpressions))
	for i, expr := range andExpressions {
		parts[i] = v.Visit(expr).(string)
	}

	return v.builder.Or(parts...)
}

// VisitAndExpression handles AND expressions
func (v *ClickHouseVisitor) VisitAndExpression(ctx *AndExpressionContext) any {
	unaryExpressions := ctx.AllUnaryExpression()
	if len(unaryExpressions) == 1 {
		return v.Visit(unaryExpressions[0])
	}

	unaryExpressionConditions := make([]string, len(unaryExpressions))
	for i, expr := range unaryExpressions {
		unaryExpressionConditions[i] = v.Visit(expr).(string)
	}

	return v.builder.And(unaryExpressionConditions...)
}

// VisitUnaryExpression handles NOT expressions
func (v *ClickHouseVisitor) VisitUnaryExpression(ctx *UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(string)

	// Check if this is a NOT expression
	if ctx.NOT() != nil {
		return fmt.Sprintf("NOT (%s)", result)
	}

	return result
}

// VisitPrimary handles grouped expressions, comparisons, function calls, and full-text search
func (v *ClickHouseVisitor) VisitPrimary(ctx *PrimaryContext) any {
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
			return fmt.Sprintf("lower(body) LIKE '%%%s%%' OR has(mapValues(attributes_string, '%%%s%%'))", strings.ToLower(keyText), keyText)
		}
	}

	return "" // Should not happen with valid input
}

// VisitComparison handles all comparison operators
func (v *ClickHouseVisitor) VisitComparison(ctx *ComparisonContext) any {
	keys := v.Visit(ctx.Key()).([]types.TelemetryFieldKey)

	// Handle EXISTS specially
	if ctx.EXISTS() != nil {
		op := types.FilterOperatorExists
		if ctx.NOT() != nil {
			op = types.FilterOperatorNotExists
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), key, op, nil, v.builder)
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
		op := types.FilterOperatorIn
		if ctx.NotInClause() != nil {
			op = types.FilterOperatorNotIn
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), key, op, values, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		return v.builder.Or(conds...)
	}

	// Handle BETWEEN
	if ctx.BETWEEN() != nil {
		op := types.FilterOperatorBetween
		if ctx.NOT() != nil {
			op = types.FilterOperatorNotBetween
		}

		values := ctx.AllValue()
		if len(values) != 2 {
			return ""
		}

		value1 := v.Visit(values[0])
		value2 := v.Visit(values[1])

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), key, op, []any{value1, value2}, v.builder)
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

		var op types.FilterOperator

		// Handle each type of comparison
		if ctx.EQUALS() != nil {
			op = types.FilterOperatorEqual
		} else if ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil {
			op = types.FilterOperatorNotEqual
		} else if ctx.LT() != nil {
			op = types.FilterOperatorLessThan
		} else if ctx.LE() != nil {
			op = types.FilterOperatorLessThan
		} else if ctx.GT() != nil {
			op = types.FilterOperatorGreaterThan
		} else if ctx.GE() != nil {
			op = types.FilterOperatorGreaterThan
		} else if ctx.LIKE() != nil {
			op = types.FilterOperatorLike
		} else if ctx.ILIKE() != nil {
			op = types.FilterOperatorLike
		} else if ctx.NOT_LIKE() != nil {
			op = types.FilterOperatorNotLike
		} else if ctx.NOT_ILIKE() != nil {
			op = types.FilterOperatorNotLike
		} else if ctx.REGEXP() != nil {
			op = types.FilterOperatorRegexp
		} else if ctx.NOT() != nil && ctx.REGEXP() != nil {
			op = types.FilterOperatorNotRegexp
		} else if ctx.CONTAINS() != nil {
			op = types.FilterOperatorContains
		} else if ctx.NOT() != nil && ctx.CONTAINS() != nil {
			op = types.FilterOperatorNotContains
		}

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.GetCondition(context.Background(), key, op, value, v.builder)
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
func (v *ClickHouseVisitor) VisitInClause(ctx *InClauseContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitNotInClause handles NOT IN expressions
func (v *ClickHouseVisitor) VisitNotInClause(ctx *NotInClauseContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitValueList handles comma-separated value lists
func (v *ClickHouseVisitor) VisitValueList(ctx *ValueListContext) any {
	values := ctx.AllValue()

	parts := []any{}
	for _, val := range values {
		parts = append(parts, v.Visit(val))
	}

	return parts
}

// VisitFullText handles standalone quoted strings for full-text search
func (v *ClickHouseVisitor) VisitFullText(ctx *FullTextContext) any {
	// remove quotes from the quotedText
	quotedText := strings.Trim(ctx.QUOTED_TEXT().GetText(), "\"'")
	return fmt.Sprintf("lower(body) LIKE '%%%s%%' OR has(mapValues(attributes_string, '%%%s%%'))", strings.ToLower(quotedText), quotedText)
}

// VisitFunctionCall handles function calls like has(), hasAny(), etc.
func (v *ClickHouseVisitor) VisitFunctionCall(ctx *FunctionCallContext) any {
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
func (v *ClickHouseVisitor) VisitFunctionParamList(ctx *FunctionParamListContext) any {
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
func (v *ClickHouseVisitor) VisitFunctionParam(ctx *FunctionParamContext) any {
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
func (v *ClickHouseVisitor) VisitArray(ctx *ArrayContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitValue handles literal values: strings, numbers, booleans
func (v *ClickHouseVisitor) VisitValue(ctx *ValueContext) any {
	if ctx.QUOTED_TEXT() != nil {
		txt := ctx.QUOTED_TEXT().GetText()
		// trim quotes and return the value
		return strings.Trim(txt, "\"'")
	} else if ctx.NUMBER() != nil {
		return ctx.NUMBER().GetText()
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
func (v *ClickHouseVisitor) VisitKey(ctx *KeyContext) any {

	fieldKeySelector := getFieldSelectorFromKey(ctx.KEY().GetText())

	fieldKeysForName := v.fieldKeys[fieldKeySelector.Name]

	if len(fieldKeysForName) == 0 {
		v.errors = append(v.errors, fmt.Sprintf("Key %s not found", fieldKeySelector.Name))
	}

	if len(fieldKeysForName) > 1 {
		// this is warning state, we must have a unambiguous key
		v.warnings = append(v.warnings, fmt.Sprintf("Key %s is ambiguous, found %d different combinations of field context and data type", fieldKeySelector.Name, len(fieldKeysForName)))
	}

	return fieldKeysForName
}
