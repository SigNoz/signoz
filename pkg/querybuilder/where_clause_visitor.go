package querybuilder

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// filterExpressionVisitor implements the FilterQueryVisitor interface
// to convert the parsed filter expressions into ClickHouse WHERE clause
type filterExpressionVisitor struct {
	fieldMapper        qbtypes.FieldMapper
	conditionBuilder   qbtypes.ConditionBuilder
	warnings           []string
	fieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
	errors             []string
	builder            *sqlbuilder.SelectBuilder
	fullTextColumn     *telemetrytypes.TelemetryFieldKey
	jsonBodyPrefix     string
	jsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	skipResourceFilter bool
	skipFullTextFilter bool
	variables          map[string]qbtypes.VariableItem
}

type FilterExprVisitorOpts struct {
	FieldMapper        qbtypes.FieldMapper
	ConditionBuilder   qbtypes.ConditionBuilder
	FieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
	Builder            *sqlbuilder.SelectBuilder
	FullTextColumn     *telemetrytypes.TelemetryFieldKey
	JsonBodyPrefix     string
	JsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	SkipResourceFilter bool
	SkipFullTextFilter bool
	Variables          map[string]qbtypes.VariableItem
}

// newFilterExpressionVisitor creates a new filterExpressionVisitor
func newFilterExpressionVisitor(opts FilterExprVisitorOpts) *filterExpressionVisitor {
	return &filterExpressionVisitor{
		fieldMapper:        opts.FieldMapper,
		conditionBuilder:   opts.ConditionBuilder,
		fieldKeys:          opts.FieldKeys,
		builder:            opts.Builder,
		fullTextColumn:     opts.FullTextColumn,
		jsonBodyPrefix:     opts.JsonBodyPrefix,
		jsonKeyToKey:       opts.JsonKeyToKey,
		skipResourceFilter: opts.SkipResourceFilter,
		skipFullTextFilter: opts.SkipFullTextFilter,
		variables:          opts.Variables,
	}
}

// PrepareWhereClause generates a ClickHouse compatible WHERE clause from the filter query
func PrepareWhereClause(query string, opts FilterExprVisitorOpts) (*sqlbuilder.WhereClause, []string, error) {
	// Setup the ANTLR parsing pipeline
	input := antlr.NewInputStream(query)
	lexer := grammar.NewFilterQueryLexer(input)

	if opts.Builder == nil {
		sb := sqlbuilder.NewSelectBuilder()
		opts.Builder = sb
	}

	visitor := newFilterExpressionVisitor(opts)

	// Set up error handling
	lexerErrorListener := NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parserErrorListener := NewErrorListener()
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	// Parse the query
	tree := parser.Query()

	// Handle syntax errors
	if len(parserErrorListener.SyntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"found %d syntax errors while parsing the filter expression",
			len(parserErrorListener.SyntaxErrors),
		)
		additionals := make([]string, len(parserErrorListener.SyntaxErrors))
		for _, err := range parserErrorListener.SyntaxErrors {
			additionals = append(additionals, err.Error())
		}
		return nil, nil, combinedErrors.WithAdditional(additionals...)
	}

	// Visit the parse tree with our ClickHouse visitor
	cond := visitor.Visit(tree).(string)

	if len(visitor.errors) > 0 {
		// combine all errors into a single error
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"found %d errors while parsing the search expression",
			len(visitor.errors),
		)
		return nil, nil, combinedErrors.WithAdditional(visitor.errors...)
	}

	whereClause := sqlbuilder.NewWhereClause().AddWhereExpr(visitor.builder.Args, cond)

	return whereClause, visitor.warnings, nil
}

// Visit dispatches to the specific visit method based on node type
func (v *filterExpressionVisitor) Visit(tree antlr.ParseTree) any {
	// Handle nil nodes to prevent panic
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
		return ""
	}
}

func (v *filterExpressionVisitor) VisitQuery(ctx *grammar.QueryContext) any {

	return v.Visit(ctx.Expression())
}

// VisitExpression passes through to the orExpression
func (v *filterExpressionVisitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

// VisitOrExpression handles OR expressions
func (v *filterExpressionVisitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
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
func (v *filterExpressionVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
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
func (v *filterExpressionVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(string)

	// Check if this is a NOT expression
	if ctx.NOT() != nil {
		return fmt.Sprintf("NOT (%s)", result)
	}

	return result
}

// VisitPrimary handles grouped expressions, comparisons, function calls, and full-text search
func (v *filterExpressionVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
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

	// Handle standalone key/value as a full text search term
	if ctx.GetChildCount() == 1 {
		if v.skipFullTextFilter {
			return "true"
		}

		if v.fullTextColumn == nil {
			v.errors = append(v.errors, "full text search is not supported")
			return ""
		}
		child := ctx.GetChild(0)
		if keyCtx, ok := child.(*grammar.KeyContext); ok {
			// create a full text search condition on the body field
			keyText := keyCtx.GetText()
			cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, keyText, v.builder)
			if err != nil {
				v.errors = append(v.errors, fmt.Sprintf("failed to build full text search condition: %s", err.Error()))
				return ""
			}
			return cond
		} else if valCtx, ok := child.(*grammar.ValueContext); ok {
			var text string
			if valCtx.QUOTED_TEXT() != nil {
				text = trimQuotes(valCtx.QUOTED_TEXT().GetText())
			} else if valCtx.NUMBER() != nil {
				text = valCtx.NUMBER().GetText()
			} else if valCtx.BOOL() != nil {
				text = valCtx.BOOL().GetText()
			} else if valCtx.KEY() != nil {
				text = valCtx.KEY().GetText()
			} else {
				v.errors = append(v.errors, fmt.Sprintf("unsupported value type: %s", valCtx.GetText()))
				return ""
			}
			cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, text, v.builder)
			if err != nil {
				v.errors = append(v.errors, fmt.Sprintf("failed to build full text search condition: %s", err.Error()))
				return ""
			}
			return cond
		}
	}

	return "" // Should not happen with valid input
}

// VisitComparison handles all comparison operators
func (v *filterExpressionVisitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	keys := v.Visit(ctx.Key()).([]*telemetrytypes.TelemetryFieldKey)

	// this is used to skip the resource filtering on main table if
	// the query may use the resources table sub-query filter
	if v.skipResourceFilter {
		filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
		for _, key := range keys {
			if key.FieldContext != telemetrytypes.FieldContextResource {
				filteredKeys = append(filteredKeys, key)
			}
		}
		keys = filteredKeys
	}

	// Handle EXISTS specially
	if ctx.EXISTS() != nil {
		op := qbtypes.FilterOperatorExists
		if ctx.NOT() != nil {
			op = qbtypes.FilterOperatorNotExists
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(context.Background(), key, op, nil, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		// if there is only one condition, return it directly, one less `()` wrapper
		if len(conds) == 1 {
			return conds[0]
		}
		return v.builder.Or(conds...)
	}

	// Handle IN clause
	if ctx.InClause() != nil || ctx.NotInClause() != nil {

		var values []any
		var retValue any
		if ctx.InClause() != nil {
			retValue = v.Visit(ctx.InClause())
		} else if ctx.NotInClause() != nil {
			retValue = v.Visit(ctx.NotInClause())
		}
		switch ret := retValue.(type) {
		case []any:
			values = ret
		case any:
			values = []any{ret}
		}

		if len(values) == 1 {
			if var_, ok := values[0].(string); ok {
				// check if this is a variables
				var ok bool
				var varItem qbtypes.VariableItem
				varItem, ok = v.variables[var_]
				// if not present, try without `$` prefix
				if !ok {
					varItem, ok = v.variables[var_[1:]]
				}

				if ok {
					// we have a variable, now check for dynamic variable
					if varItem.Type == qbtypes.DynamicVariableType {
						// check if it is special value to skip entire filter, if so skip it
						if all_, ok := varItem.Value.(string); ok && all_ == "__all__" {
							return ""
						}
					}
					switch varValues := varItem.Value.(type) {
					case []any:
						values = varValues
					case any:
						values = []any{varValues}
					}
				}
			}
		}

		op := qbtypes.FilterOperatorIn
		if ctx.NotInClause() != nil {
			op = qbtypes.FilterOperatorNotIn
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(context.Background(), key, op, values, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
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
			condition, err := v.conditionBuilder.ConditionFor(context.Background(), key, op, []any{value1, value2}, v.builder)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
		}
		return v.builder.Or(conds...)
	}

	// Get all values for operations that need them
	values := ctx.AllValue()
	if len(values) > 0 {
		value := v.Visit(values[0])

		if var_, ok := value.(string); ok {
			// check if this is a variables
			var ok bool
			var varItem qbtypes.VariableItem
			varItem, ok = v.variables[var_]
			// if not present, try without `$` prefix
			if !ok {
				varItem, ok = v.variables[var_[1:]]
			}

			if ok {
				switch varValues := varItem.Value.(type) {
				case []any:
					value = varValues[0]
				case any:
					value = varValues
				}
			}
		}

		var op qbtypes.FilterOperator

		// Handle each type of comparison
		if ctx.EQUALS() != nil {
			op = qbtypes.FilterOperatorEqual
		} else if ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil {
			op = qbtypes.FilterOperatorNotEqual
		} else if ctx.LT() != nil {
			op = qbtypes.FilterOperatorLessThan
		} else if ctx.LE() != nil {
			op = qbtypes.FilterOperatorLessThanOrEq
		} else if ctx.GT() != nil {
			op = qbtypes.FilterOperatorGreaterThan
		} else if ctx.GE() != nil {
			op = qbtypes.FilterOperatorGreaterThanOrEq
		} else if ctx.LIKE() != nil {
			op = qbtypes.FilterOperatorLike
		} else if ctx.ILIKE() != nil {
			op = qbtypes.FilterOperatorILike
		} else if ctx.NOT_LIKE() != nil {
			op = qbtypes.FilterOperatorNotLike
		} else if ctx.NOT_ILIKE() != nil {
			op = qbtypes.FilterOperatorNotILike
		} else if ctx.REGEXP() != nil {
			op = qbtypes.FilterOperatorRegexp
			if ctx.NOT() != nil {
				op = qbtypes.FilterOperatorNotRegexp
			}
		} else if ctx.CONTAINS() != nil {
			op = qbtypes.FilterOperatorContains
			if ctx.NOT() != nil {
				op = qbtypes.FilterOperatorNotContains
			}
		}

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(context.Background(), key, op, value, v.builder)
			if err != nil {
				v.errors = append(v.errors, fmt.Sprintf("failed to build condition: %s", err.Error()))
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
		}
		return v.builder.Or(conds...)
	}

	return "" // Should not happen with valid input
}

// VisitInClause handles IN expressions
func (v *filterExpressionVisitor) VisitInClause(ctx *grammar.InClauseContext) any {
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}
	return v.Visit(ctx.Value())
}

// VisitNotInClause handles NOT IN expressions
func (v *filterExpressionVisitor) VisitNotInClause(ctx *grammar.NotInClauseContext) any {
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}
	return v.Visit(ctx.Value())
}

// VisitValueList handles comma-separated value lists
func (v *filterExpressionVisitor) VisitValueList(ctx *grammar.ValueListContext) any {
	values := ctx.AllValue()

	parts := []any{}
	for _, val := range values {
		parts = append(parts, v.Visit(val))
	}

	return parts
}

// VisitFullText handles standalone quoted strings for full-text search
func (v *filterExpressionVisitor) VisitFullText(ctx *grammar.FullTextContext) any {

	if v.skipFullTextFilter {
		return "true"
	}

	var text string

	if ctx.QUOTED_TEXT() != nil {
		text = trimQuotes(ctx.QUOTED_TEXT().GetText())
	} else if ctx.FREETEXT() != nil {
		text = ctx.FREETEXT().GetText()
	}

	if v.fullTextColumn == nil {
		v.errors = append(v.errors, "full text search is not supported")
		return ""
	}
	cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, text, v.builder)
	if err != nil {
		v.errors = append(v.errors, fmt.Sprintf("failed to build full text search condition: %s", err.Error()))
		return ""
	}
	return cond
}

// VisitFunctionCall handles function calls like has(), hasAny(), etc.
func (v *filterExpressionVisitor) VisitFunctionCall(ctx *grammar.FunctionCallContext) any {
	// Get function name based on which token is present
	var functionName string
	if ctx.HAS() != nil {
		functionName = "has"
	} else if ctx.HASANY() != nil {
		functionName = "hasAny"
	} else if ctx.HASALL() != nil {
		functionName = "hasAll"
	} else {
		// Default fallback
		v.errors = append(v.errors, fmt.Sprintf("unknown function `%s`", ctx.GetText()))
		return ""
	}
	params := v.Visit(ctx.FunctionParamList()).([]any)

	if len(params) < 2 {
		v.errors = append(v.errors, fmt.Sprintf("function `%s` expects key and value parameters", functionName))
		return ""
	}

	keys, ok := params[0].([]*telemetrytypes.TelemetryFieldKey)
	if !ok {
		v.errors = append(v.errors, fmt.Sprintf("function `%s` expects key parameter to be a field key", functionName))
		return ""
	}
	value := params[1:]
	var conds []string
	for _, key := range keys {
		var fieldName string

		if strings.HasPrefix(key.Name, v.jsonBodyPrefix) {
			fieldName, _ = v.jsonKeyToKey(context.Background(), key, qbtypes.FilterOperatorUnknown, value)
		} else {
			v.errors = append(v.errors, fmt.Sprintf("function `%s` supports only body JSON search", functionName))
			return ""
		}

		var cond string
		// Map our functions to ClickHouse equivalents
		switch functionName {
		case "has":
			cond = fmt.Sprintf("has(%s, %s)", fieldName, v.builder.Var(value[0]))
		case "hasAny":
			cond = fmt.Sprintf("hasAny(%s, %s)", fieldName, v.builder.Var(value))
		case "hasAll":
			cond = fmt.Sprintf("hasAll(%s, %s)", fieldName, v.builder.Var(value))
		}
		conds = append(conds, cond)
	}

	if len(conds) == 1 {
		return conds[0]
	}
	return v.builder.Or(conds...)
}

// VisitFunctionParamList handles the parameter list for function calls
func (v *filterExpressionVisitor) VisitFunctionParamList(ctx *grammar.FunctionParamListContext) any {
	params := ctx.AllFunctionParam()
	parts := make([]any, len(params))

	for i, param := range params {
		parts[i] = v.Visit(param)
	}

	return parts
}

// VisitFunctionParam handles individual parameters in function calls
func (v *filterExpressionVisitor) VisitFunctionParam(ctx *grammar.FunctionParamContext) any {
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
func (v *filterExpressionVisitor) VisitArray(ctx *grammar.ArrayContext) any {
	return v.Visit(ctx.ValueList())
}

// VisitValue handles literal values: strings, numbers, booleans
func (v *filterExpressionVisitor) VisitValue(ctx *grammar.ValueContext) any {
	if ctx.QUOTED_TEXT() != nil {
		txt := ctx.QUOTED_TEXT().GetText()
		// trim quotes and return the value
		return trimQuotes(txt)
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
		// Why do we have a KEY context here?
		// When the user writes an expression like `service.name=redis`
		// The `redis` part is a VALUE context but parsed as a KEY token
		// so we return the text as is
		return ctx.KEY().GetText()
	}

	return "" // Should not happen with valid input
}

// VisitKey handles field/column references
func (v *filterExpressionVisitor) VisitKey(ctx *grammar.KeyContext) any {

	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(ctx.GetText())

	keyName := strings.TrimPrefix(fieldKey.Name, v.jsonBodyPrefix)

	fieldKeysForName := v.fieldKeys[keyName]

	// for the body json search, we need to add search on the body field even
	// if there is a field with the same name as attribute/resource attribute
	// Since it will ORed with the fieldKeysForName, it will not result empty
	// when either of them have values
	if strings.HasPrefix(fieldKey.Name, v.jsonBodyPrefix) && v.jsonBodyPrefix != "" {
		if keyName != "" {
			fieldKeysForName = append(fieldKeysForName, &fieldKey)
		}
	}

	if len(fieldKeysForName) == 0 {
		if strings.HasPrefix(fieldKey.Name, v.jsonBodyPrefix) && v.jsonBodyPrefix != "" && keyName == "" {
			v.errors = append(v.errors, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
		} else {
			// TODO(srikanthccv): do we want to return an error here?
			// should we infer the type and auto-magically build a key for expression?
			v.errors = append(v.errors, fmt.Sprintf("key `%s` not found", fieldKey.Name))
		}
	}

	if len(fieldKeysForName) > 1 {
		// this is warning state, we must have a unambiguous key
		v.warnings = append(v.warnings, fmt.Sprintf(
			"key `%s` is ambiguous, found %d different combinations of field context and data type: %v",
			fieldKey.Name,
			len(fieldKeysForName),
			fieldKeysForName,
		))
	}

	return fieldKeysForName
}

func trimQuotes(txt string) string {
	if len(txt) >= 2 {
		if (txt[0] == '"' && txt[len(txt)-1] == '"') ||
			(txt[0] == '\'' && txt[len(txt)-1] == '\'') {
			return txt[1 : len(txt)-1]
		}
	}
	return txt
}
