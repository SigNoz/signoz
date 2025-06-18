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
	variableResolver   *VariableResolver
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
	var variableResolver *VariableResolver
	if opts.Variables != nil && len(opts.Variables) > 0 {
		variableResolver = NewVariableResolver(opts.Variables)
	}

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
		variableResolver:   variableResolver,
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
	case *grammar.VariableContext:
		return v.VisitVariable(t)
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
		if ctx.InClause() != nil {
			values = v.Visit(ctx.InClause()).([]any)
		} else if ctx.NotInClause() != nil {
			values = v.Visit(ctx.NotInClause()).([]any)
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

		// Check if we should skip this filter due to __all__ variable
		if strVal, ok := value.(string); ok && strVal == "__SKIP_FILTER__" {
			return "true" // Return always true condition to skip filter
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
	// Check if it's a variable
	if ctx.Variable() != nil {
		value := v.Visit(ctx.Variable())

		// If the variable resolved to "__SKIP_FILTER__", return empty array
		if skipVal, ok := value.(string); ok && skipVal == "__SKIP_FILTER__" {
			return []any{}
		}

		// If it's already an array, return it
		if arr, ok := value.([]any); ok {
			return arr
		}

		// Otherwise, wrap single value in array
		return []any{value}
	}

	// Handle regular value list
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}

	return []any{}
}

// VisitNotInClause handles NOT IN expressions
func (v *filterExpressionVisitor) VisitNotInClause(ctx *grammar.NotInClauseContext) any {
	// Check if it's a variable
	if ctx.Variable() != nil {
		value := v.Visit(ctx.Variable())

		// If the variable resolved to "__SKIP_FILTER__", return empty array
		if skipVal, ok := value.(string); ok && skipVal == "__SKIP_FILTER__" {
			return []any{}
		}

		// If it's already an array, return it
		if arr, ok := value.([]any); ok {
			return arr
		}

		// Otherwise, wrap single value in array
		return []any{value}
	}

	// Handle regular value list
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}

	return []any{}
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

// VisitVariable handles variable resolution
func (v *filterExpressionVisitor) VisitVariable(ctx *grammar.VariableContext) any {
	var varName string
	var varText string

	// Extract variable name based on syntax
	if ctx.DOLLAR_VAR() != nil {
		varText = ctx.DOLLAR_VAR().GetText()
		varName = varText[1:] // Remove $
	} else if ctx.CURLY_VAR() != nil {
		varText = ctx.CURLY_VAR().GetText()
		// Remove {{ }} and optional whitespace/dots
		varName = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(varText, "{{"), "}}"))
		varName = strings.TrimPrefix(varName, ".")
	} else if ctx.SQUARE_VAR() != nil {
		varText = ctx.SQUARE_VAR().GetText()
		// Remove [[ ]] and optional whitespace/dots
		varName = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(varText, "[["), "]]"))
		varName = strings.TrimPrefix(varName, ".")
	} else {
		v.errors = append(v.errors, "unknown variable type")
		return nil
	}

	// If no variable resolver is provided, return the variable text
	if v.variableResolver == nil {
		v.errors = append(v.errors, fmt.Sprintf("variable %s used but no variable resolver provided", varText))
		return varText
	}

	// Resolve the variable
	resolvedValue, skipFilter, err := v.variableResolver.ResolveVariable(varName)
	if err != nil {
		v.errors = append(v.errors, fmt.Sprintf("failed to resolve variable %s: %v", varText, err))
		return nil
	}

	if skipFilter {
		return "__SKIP_FILTER__"
	}

	return resolvedValue
}

// VisitValue handles literal values: strings, numbers, booleans, variables
func (v *filterExpressionVisitor) VisitValue(ctx *grammar.ValueContext) any {
	// Check if this is a variable first
	if ctx.Variable() != nil {
		return v.Visit(ctx.Variable())
	}

	if ctx.QUOTED_TEXT() != nil {
		txt := ctx.QUOTED_TEXT().GetText()
		// trim quotes and check for variable
		value := trimQuotes(txt)

		// Check if this is a variable reference
		if v.variableResolver != nil {
			if isVar, varName := v.variableResolver.IsVariableReference(value); isVar {
				resolvedValue, skipFilter, err := v.variableResolver.ResolveVariable(varName)
				if err != nil {
					v.errors = append(v.errors, fmt.Sprintf("failed to resolve variable: %s", err.Error()))
					return value
				}
				if skipFilter {
					// Return a special marker to indicate filter should be skipped
					return "__SKIP_FILTER__"
				}
				return resolvedValue
			}
		}

		return value
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
		keyText := ctx.KEY().GetText()

		// Check if this is a variable reference
		if v.variableResolver != nil {
			if isVar, varName := v.variableResolver.IsVariableReference(keyText); isVar {
				resolvedValue, skipFilter, err := v.variableResolver.ResolveVariable(varName)
				if err != nil {
					v.errors = append(v.errors, fmt.Sprintf("failed to resolve variable: %s", err.Error()))
					return keyText
				}
				if skipFilter {
					// Return a special marker to indicate filter should be skipped
					return "__SKIP_FILTER__"
				}
				return resolvedValue
			}
		}

		return keyText
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
