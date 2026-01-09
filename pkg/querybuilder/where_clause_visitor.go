package querybuilder

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/antlr4-go/antlr/v4"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

var searchTroubleshootingGuideURL = "https://signoz.io/docs/userguide/search-troubleshooting/"

const stringMatchingOperatorDocURL = "https://signoz.io/docs/userguide/operators-reference/#string-matching-operators"

// filterExpressionVisitor implements the FilterQueryVisitor interface
// to convert the parsed filter expressions into ClickHouse WHERE clause
type filterExpressionVisitor struct {
	context            context.Context
	orgID              valuer.UUID
	logger             *slog.Logger
	fieldMapper        qbtypes.FieldMapper
	conditionBuilder   qbtypes.ConditionBuilder
	warnings           []string
	mainWarnURL        string
	fieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
	errors             []string
	mainErrorURL       string
	builder            *sqlbuilder.SelectBuilder
	fullTextColumn     *telemetrytypes.TelemetryFieldKey
	jsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	skipResourceFilter bool
	skipFullTextFilter bool
	skipFunctionCalls  bool
	ignoreNotFoundKeys bool
	variables          map[string]qbtypes.VariableItem

	keysWithWarnings map[string]bool
	startNs          uint64
	endNs            uint64
	evolutions       []*telemetrytypes.EvolutionEntry
}

type FilterExprVisitorOpts struct {
	Context            context.Context
	OrgID              valuer.UUID
	Logger             *slog.Logger
	FieldMapper        qbtypes.FieldMapper
	ConditionBuilder   qbtypes.ConditionBuilder
	FieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
	Builder            *sqlbuilder.SelectBuilder
	FullTextColumn     *telemetrytypes.TelemetryFieldKey
	JsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	SkipResourceFilter bool
	SkipFullTextFilter bool
	SkipFunctionCalls  bool
	IgnoreNotFoundKeys bool
	Variables          map[string]qbtypes.VariableItem
	StartNs            uint64
	EndNs              uint64
	Evolutions         []*telemetrytypes.EvolutionEntry
}

// newFilterExpressionVisitor creates a new filterExpressionVisitor
func newFilterExpressionVisitor(opts FilterExprVisitorOpts) *filterExpressionVisitor {
	return &filterExpressionVisitor{
		context:            opts.Context,
		orgID:              opts.OrgID,
		logger:             opts.Logger,
		fieldMapper:        opts.FieldMapper,
		conditionBuilder:   opts.ConditionBuilder,
		fieldKeys:          opts.FieldKeys,
		builder:            opts.Builder,
		fullTextColumn:     opts.FullTextColumn,
		jsonKeyToKey:       opts.JsonKeyToKey,
		skipResourceFilter: opts.SkipResourceFilter,
		skipFullTextFilter: opts.SkipFullTextFilter,
		skipFunctionCalls:  opts.SkipFunctionCalls,
		ignoreNotFoundKeys: opts.IgnoreNotFoundKeys,
		variables:          opts.Variables,
		keysWithWarnings:   make(map[string]bool),
		startNs:            opts.StartNs,
		endNs:              opts.EndNs,
		evolutions:         opts.Evolutions,
	}
}

type PreparedWhereClause struct {
	WhereClause    *sqlbuilder.WhereClause
	Warnings       []string
	WarningsDocURL string
}

// PrepareWhereClause generates a ClickHouse compatible WHERE clause from the filter query
func PrepareWhereClause(query string, opts FilterExprVisitorOpts, startNs uint64, endNs uint64) (*PreparedWhereClause, error) {

	// Setup the ANTLR parsing pipeline
	input := antlr.NewInputStream(query)
	lexer := grammar.NewFilterQueryLexer(input)

	if opts.Builder == nil {
		sb := sqlbuilder.NewSelectBuilder()
		opts.Builder = sb
	}

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

	// override skipResourceFilter if the expression contains OR
	for _, tok := range tokens.GetAllTokens() {
		if tok.GetTokenType() == grammar.FilterQueryParserOR {
			opts.SkipResourceFilter = false
			break
		}
	}
	tokens.Reset()

	opts.StartNs = startNs
	opts.EndNs = endNs
	visitor := newFilterExpressionVisitor(opts)

	// Handle syntax errors
	if len(parserErrorListener.SyntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d syntax errors while parsing the search expression.",
			len(parserErrorListener.SyntaxErrors),
		)
		additionals := make([]string, len(parserErrorListener.SyntaxErrors))
		for _, err := range parserErrorListener.SyntaxErrors {
			if err.Error() != "" {
				additionals = append(additionals, err.Error())
			}
		}

		return nil, combinedErrors.WithAdditional(additionals...).WithUrl(searchTroubleshootingGuideURL)
	}

	// Visit the parse tree with our ClickHouse visitor
	cond := visitor.Visit(tree).(string)

	if len(visitor.errors) > 0 {
		// combine all errors into a single error
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d errors while parsing the search expression.",
			len(visitor.errors),
		)
		url := visitor.mainErrorURL
		if url == "" {
			url = searchTroubleshootingGuideURL
		}
		return nil, combinedErrors.WithAdditional(visitor.errors...).WithUrl(url)
	}

	if cond == "" {
		cond = "true"
	}

	whereClause := sqlbuilder.NewWhereClause().AddWhereExpr(visitor.builder.Args, cond)

	return &PreparedWhereClause{WhereClause: whereClause, Warnings: visitor.warnings, WarningsDocURL: visitor.mainWarnURL}, nil
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

func (v *filterExpressionVisitor) VisitQuery(tree *grammar.QueryContext) any {

	return v.Visit(tree.Expression())
}

// VisitExpression passes through to the orExpression
func (v *filterExpressionVisitor) VisitExpression(tree *grammar.ExpressionContext) any {
	return v.Visit(tree.OrExpression())
}

// VisitOrExpression handles OR expressions
func (v *filterExpressionVisitor) VisitOrExpression(tree *grammar.OrExpressionContext) any {
	andExpressions := tree.AllAndExpression()

	andExpressionConditions := make([]string, len(andExpressions))
	for i, expr := range andExpressions {
		if condExpr, ok := v.Visit(expr).(string); ok && condExpr != "" {
			andExpressionConditions[i] = condExpr
		}
	}

	if len(andExpressionConditions) == 0 {
		return ""
	}

	if len(andExpressionConditions) == 1 {
		return andExpressionConditions[0]
	}

	return v.builder.Or(andExpressionConditions...)
}

// VisitAndExpression handles AND expressions
func (v *filterExpressionVisitor) VisitAndExpression(tree *grammar.AndExpressionContext) any {
	unaryExpressions := tree.AllUnaryExpression()

	unaryExpressionConditions := make([]string, len(unaryExpressions))
	for i, expr := range unaryExpressions {
		if condExpr, ok := v.Visit(expr).(string); ok && condExpr != "" {
			unaryExpressionConditions[i] = condExpr
		}
	}

	if len(unaryExpressionConditions) == 0 {
		return ""
	}

	if len(unaryExpressionConditions) == 1 {
		return unaryExpressionConditions[0]
	}

	return v.builder.And(unaryExpressionConditions...)
}

// VisitUnaryExpression handles NOT expressions
func (v *filterExpressionVisitor) VisitUnaryExpression(tree *grammar.UnaryExpressionContext) any {
	result := v.Visit(tree.Primary()).(string)

	// Check if this is a NOT expression
	if tree.NOT() != nil {
		return fmt.Sprintf("NOT (%s)", result)
	}

	return result
}

// VisitPrimary handles grouped expressions, comparisons, function calls, and full-text search
func (v *filterExpressionVisitor) VisitPrimary(tree *grammar.PrimaryContext) any {
	if tree.OrExpression() != nil {
		// This is a parenthesized expression
		if condExpr, ok := v.Visit(tree.OrExpression()).(string); ok && condExpr != "" {
			return fmt.Sprintf("(%s)", v.Visit(tree.OrExpression()).(string))
		}
		return ""
	} else if tree.Comparison() != nil {
		return v.Visit(tree.Comparison())
	} else if tree.FunctionCall() != nil {
		return v.Visit(tree.FunctionCall())
	} else if tree.FullText() != nil {
		return v.Visit(tree.FullText())
	}

	// Handle standalone key/value as a full text search term
	if tree.GetChildCount() == 1 {
		if v.skipFullTextFilter {
			return ""
		}

		if v.fullTextColumn == nil {
			v.errors = append(v.errors, "full text search is not supported")
			return ""
		}
		child := tree.GetChild(0)
		if keyCtx, ok := child.(*grammar.KeyContext); ok {
			// create a full text search condition on the body field

			keyText := keyCtx.GetText()
			cond, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(keyText), v.builder, v.evolutions)
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
			cond, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(text), v.builder, v.evolutions)
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
func (v *filterExpressionVisitor) VisitComparison(tree *grammar.ComparisonContext) any {
	keys := v.Visit(tree.Key()).([]*telemetrytypes.TelemetryFieldKey)

	// if key is missing and can be ignored, the condition is ignored
	if len(keys) == 0 && v.ignoreNotFoundKeys {
		return ""
	}

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
		if len(keys) == 0 {
			return ""
		}
	}

	// Handle EXISTS specially
	if tree.EXISTS() != nil {
		op := qbtypes.FilterOperatorExists
		if tree.NOT() != nil {
			op = qbtypes.FilterOperatorNotExists
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, key, op, nil, v.builder, v.evolutions)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		// if there is only one condition, return it directly, one less `()` wrapper
		if len(conds) == 1 {
			return conds[0]
		}
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
		}
		return v.builder.Or(conds...)
	}

	// Handle IN clause
	if tree.InClause() != nil || tree.NotInClause() != nil {

		var values []any
		var retValue any
		if tree.InClause() != nil {
			retValue = v.Visit(tree.InClause())
		} else if tree.NotInClause() != nil {
			retValue = v.Visit(tree.NotInClause())
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
				if !ok && len(var_) > 0 {
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
						if len(varValues) == 0 {
							v.errors = append(v.errors, fmt.Sprintf("malformed request payload: variable `%s` used in expression has an empty list value", strings.TrimPrefix(var_, "$")))
							return ""
						}
						values = varValues
					case any:
						values = []any{varValues}
					}
				}
			}
		}

		op := qbtypes.FilterOperatorIn
		if tree.NotInClause() != nil {
			op = qbtypes.FilterOperatorNotIn
		}
		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, key, op, values, v.builder, v.evolutions)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
		}
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
		}
		return v.builder.Or(conds...)
	}

	// Handle BETWEEN
	if tree.BETWEEN() != nil {
		op := qbtypes.FilterOperatorBetween
		if tree.NOT() != nil {
			op = qbtypes.FilterOperatorNotBetween
		}

		values := tree.AllValue()
		if len(values) != 2 {
			return ""
		}

		value1 := v.Visit(values[0])
		value2 := v.Visit(values[1])

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, key, op, []any{value1, value2}, v.builder, v.evolutions)
			if err != nil {
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
		}
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
		}
		return v.builder.Or(conds...)
	}

	// Get all values for operations that need them
	values := tree.AllValue()
	if len(values) > 0 {
		value := v.Visit(values[0])

		if var_, ok := value.(string); ok {
			// check if this is a variables
			var ok bool
			var varItem qbtypes.VariableItem
			varItem, ok = v.variables[var_]
			// if not present, try without `$` prefix
			if !ok && len(var_) > 0 {
				varItem, ok = v.variables[var_[1:]]
			}

			if ok {
				switch varValues := varItem.Value.(type) {
				case []any:
					if len(varValues) == 0 {
						v.errors = append(v.errors, fmt.Sprintf("malformed request payload: variable `%s` used in expression has an empty list value", strings.TrimPrefix(var_, "$")))
						return ""
					}
					value = varValues[0]
				case any:
					value = varValues
				}
			}
		}

		var op qbtypes.FilterOperator

		// Handle each type of comparison
		if tree.EQUALS() != nil {
			op = qbtypes.FilterOperatorEqual
		} else if tree.NOT_EQUALS() != nil || tree.NEQ() != nil {
			op = qbtypes.FilterOperatorNotEqual
		} else if tree.LT() != nil {
			op = qbtypes.FilterOperatorLessThan
		} else if tree.LE() != nil {
			op = qbtypes.FilterOperatorLessThanOrEq
		} else if tree.GT() != nil {
			op = qbtypes.FilterOperatorGreaterThan
		} else if tree.GE() != nil {
			op = qbtypes.FilterOperatorGreaterThanOrEq
		} else if tree.LIKE() != nil {
			op = qbtypes.FilterOperatorLike
			if tree.NOT() != nil {
				op = qbtypes.FilterOperatorNotLike
			}
			v.warnIfLikeWithoutWildcards("LIKE", value)
		} else if tree.ILIKE() != nil {
			op = qbtypes.FilterOperatorILike
			if tree.NOT() != nil {
				op = qbtypes.FilterOperatorNotILike
			}
			v.warnIfLikeWithoutWildcards("ILIKE", value)
		} else if tree.REGEXP() != nil {
			op = qbtypes.FilterOperatorRegexp
			if tree.NOT() != nil {
				op = qbtypes.FilterOperatorNotRegexp
			}
		} else if tree.CONTAINS() != nil {
			op = qbtypes.FilterOperatorContains
			if tree.NOT() != nil {
				op = qbtypes.FilterOperatorNotContains
			}
		}

		var conds []string
		for _, key := range keys {
			condition, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, key, op, value, v.builder, v.evolutions)
			if err != nil {
				v.errors = append(v.errors, fmt.Sprintf("failed to build condition: %s", err.Error()))
				return ""
			}
			conds = append(conds, condition)
		}
		if len(conds) == 1 {
			return conds[0]
		}
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
		}
		return v.builder.Or(conds...)
	}

	return "" // Should not happen with valid input
}

// warnIfLikeWithoutWildcards adds a guidance warning when LIKE/ILIKE is used without wildcards
func (v *filterExpressionVisitor) warnIfLikeWithoutWildcards(op string, value any) {
	if hasLikeWildcards(value) {
		return
	}

	msg := op + " operator used without wildcards (% or _). Consider using = operator for exact matches or add wildcards for pattern matching."
	v.warnings = append(v.warnings, msg)
	if v.mainWarnURL == "" {
		v.mainWarnURL = stringMatchingOperatorDocURL
	}
}

// VisitInClause handles IN expressions
func (v *filterExpressionVisitor) VisitInClause(tree *grammar.InClauseContext) any {
	if tree.ValueList() != nil {
		return v.Visit(tree.ValueList())
	}
	return v.Visit(tree.Value())
}

// VisitNotInClause handles NOT IN expressions
func (v *filterExpressionVisitor) VisitNotInClause(tree *grammar.NotInClauseContext) any {
	if tree.ValueList() != nil {
		return v.Visit(tree.ValueList())
	}
	return v.Visit(tree.Value())
}

// VisitValueList handles comma-separated value lists
func (v *filterExpressionVisitor) VisitValueList(tree *grammar.ValueListContext) any {
	values := tree.AllValue()

	parts := []any{}
	for _, val := range values {
		parts = append(parts, v.Visit(val))
	}

	return parts
}

// VisitFullText handles standalone quoted strings for full-text search
func (v *filterExpressionVisitor) VisitFullText(tree *grammar.FullTextContext) any {

	if v.skipFullTextFilter {
		return ""
	}

	var text string

	if tree.QUOTED_TEXT() != nil {
		text = trimQuotes(tree.QUOTED_TEXT().GetText())
	} else if tree.FREETEXT() != nil {
		text = tree.FREETEXT().GetText()
	}

	if v.fullTextColumn == nil {
		v.errors = append(v.errors, "full text search is not supported")
		return ""
	}
	cond, err := v.conditionBuilder.ConditionFor(v.context, v.orgID, v.startNs, v.endNs, v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(text), v.builder, v.evolutions)
	if err != nil {
		v.errors = append(v.errors, fmt.Sprintf("failed to build full text search condition: %s", err.Error()))
		return ""
	}
	return cond
}

// VisitFunctionCall handles function calls like has(), hasAny(), etc.
func (v *filterExpressionVisitor) VisitFunctionCall(tree *grammar.FunctionCallContext) any {
	if v.skipFunctionCalls {
		return ""
	}

	// Get function name based on which token is present
	var functionName string
	if tree.HAS() != nil {
		functionName = "has"
	} else if tree.HASANY() != nil {
		functionName = "hasAny"
	} else if tree.HASALL() != nil {
		functionName = "hasAll"
	} else if tree.HASTOKEN() != nil {
		functionName = "hasToken"
	} else {
		// Default fallback
		v.errors = append(v.errors, fmt.Sprintf("unknown function `%s`", tree.GetText()))
		return ""
	}
	params := v.Visit(tree.FunctionParamList()).([]any)

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

		if functionName == "hasToken" {

			if key.Name != "body" {
				if v.mainErrorURL == "" {
					v.mainErrorURL = "https://signoz.io/docs/userguide/functions-reference/#hastoken-function"
				}
				v.errors = append(v.errors, fmt.Sprintf("function `%s` only supports body field as first parameter", functionName))
			}

			// this will only work with string.
			if _, ok := value[0].(string); !ok {
				if v.mainErrorURL == "" {
					v.mainErrorURL = "https://signoz.io/docs/userguide/functions-reference/#hastoken-function"
				}
				v.errors = append(v.errors, fmt.Sprintf("function `%s` expects value parameter to be a string", functionName))
				return ""
			}
			conds = append(conds, fmt.Sprintf("hasToken(LOWER(%s), LOWER(%s))", key.Name, v.builder.Var(value[0])))
		} else {
			// this is that all other functions only support array fields
			if key.FieldContext == telemetrytypes.FieldContextBody {
				fieldName, _ = v.jsonKeyToKey(v.context, key, qbtypes.FilterOperatorUnknown, value)
			} else {
				// TODO(add docs for json body search)
				if v.mainErrorURL == "" {
					v.mainErrorURL = "https://signoz.io/docs/userguide/search-troubleshooting/#function-supports-only-body-json-search"
				}
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
	}

	if len(conds) == 1 {
		return conds[0]
	}
	return v.builder.Or(conds...)
}

// VisitFunctionParamList handles the parameter list for function calls
func (v *filterExpressionVisitor) VisitFunctionParamList(tree *grammar.FunctionParamListContext) any {
	params := tree.AllFunctionParam()
	parts := make([]any, len(params))

	for i, param := range params {
		parts[i] = v.Visit(param)
	}

	return parts
}

// VisitFunctionParam handles individual parameters in function calls
func (v *filterExpressionVisitor) VisitFunctionParam(tree *grammar.FunctionParamContext) any {
	if tree.Key() != nil {
		return v.Visit(tree.Key())
	} else if tree.Value() != nil {
		return v.Visit(tree.Value())
	} else if tree.Array() != nil {
		return v.Visit(tree.Array())
	}

	return "" // Should not happen with valid input
}

// VisitArray handles array literals
func (v *filterExpressionVisitor) VisitArray(tree *grammar.ArrayContext) any {
	return v.Visit(tree.ValueList())
}

// VisitValue handles literal values: strings, numbers, booleans
func (v *filterExpressionVisitor) VisitValue(tree *grammar.ValueContext) any {
	if tree.QUOTED_TEXT() != nil {
		txt := tree.QUOTED_TEXT().GetText()
		// trim quotes and return the value
		return trimQuotes(txt)
	} else if tree.NUMBER() != nil {
		number, err := strconv.ParseFloat(tree.NUMBER().GetText(), 64)
		if err != nil {
			v.errors = append(v.errors, fmt.Sprintf("failed to parse number %s", tree.NUMBER().GetText()))
			return ""
		}
		return number
	} else if tree.BOOL() != nil {
		// Convert to ClickHouse boolean literal
		boolText := strings.ToLower(tree.BOOL().GetText())
		return boolText == "true"
	} else if tree.KEY() != nil {
		// Why do we have a KEY context here?
		// When the user writes an expression like `service.name=redis`
		// The `redis` part is a VALUE context but parsed as a KEY token
		// so we return the text as is
		return tree.KEY().GetText()
	}

	return "" // Should not happen with valid input
}

// VisitKey handles field/column references
func (v *filterExpressionVisitor) VisitKey(tree *grammar.KeyContext) any {
	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(tree.GetText())
	keyName := fieldKey.Name

	fieldKeysForName := v.fieldKeys[keyName]

	// if the context is explicitly provided, filter out the remaining
	// example, resource.attr = 'value', then we don't want to search on
	// anything other than the resource attributes
	if fieldKey.FieldContext != telemetrytypes.FieldContextUnspecified {
		filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
		for _, item := range fieldKeysForName {
			if item.FieldContext == fieldKey.FieldContext {
				filteredKeys = append(filteredKeys, item)
			}
		}
		fieldKeysForName = filteredKeys
	}

	// if the data type is explicitly provided, filter out the remaining
	// example, level:string = 'value', then we don't want to search on
	// anything other than the string attributes
	if fieldKey.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
		for _, item := range fieldKeysForName {
			if item.FieldDataType == fieldKey.FieldDataType {
				filteredKeys = append(filteredKeys, item)
			}
		}
		fieldKeysForName = filteredKeys
	}

	// for the body json search, we need to add search on the body field even
	// if there is a field with the same name as attribute/resource attribute
	// Since it will ORed with the fieldKeysForName, it will not result empty
	// when either of them have values
	// Note: Skip this logic if body json query is enabled so we can look up the key inside fields
	//
	// TODO(Piyush): After entire migration this is supposed to be removed.
	if !BodyJSONQueryEnabled && fieldKey.FieldContext == telemetrytypes.FieldContextBody {
		fieldKeysForName = append(fieldKeysForName, &fieldKey)
	}

	if len(fieldKeysForName) == 0 {
		// check if the key exists with {fieldContext}.{key}
		// because the context could be legitimate prefix in user data, example `span.div_num = 20`
		keyWithContext := fmt.Sprintf("%s.%s", fieldKey.FieldContext.StringValue(), fieldKey.Name)
		if len(v.fieldKeys[keyWithContext]) > 0 {
			return v.fieldKeys[keyWithContext]
		}

		if fieldKey.FieldContext == telemetrytypes.FieldContextBody && keyName == "" {
			v.errors = append(v.errors, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
		} else if !v.ignoreNotFoundKeys {
			// TODO(srikanthccv): do we want to return an error here?
			// should we infer the type and auto-magically build a key for expression?
			v.errors = append(v.errors, fmt.Sprintf("key `%s` not found", fieldKey.Name))
			v.mainErrorURL = "https://signoz.io/docs/userguide/search-troubleshooting/#key-fieldname-not-found"
		}
	}

	if len(fieldKeysForName) > 1 {
		warnMsg := fmt.Sprintf(
			"Key `%s` is ambiguous, found %d different combinations of field context / data type: %v.",
			fieldKey.Name,
			len(fieldKeysForName),
			fieldKeysForName,
		)
		mixedFieldContext := map[string]bool{}
		for _, item := range fieldKeysForName {
			mixedFieldContext[item.FieldContext.StringValue()] = true
		}

		// when there is both resource and attribute context, default to resource only
		if mixedFieldContext[telemetrytypes.FieldContextResource.StringValue()] &&
			mixedFieldContext[telemetrytypes.FieldContextAttribute.StringValue()] {
			filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
			for _, item := range fieldKeysForName {
				if item.FieldContext != telemetrytypes.FieldContextResource {
					continue
				}
				filteredKeys = append(filteredKeys, item)
			}
			fieldKeysForName = filteredKeys
			warnMsg += " " + "Using `resource` context by default. To query attributes explicitly, " +
				fmt.Sprintf("use the fully qualified name (e.g., 'attribute.%s')", fieldKey.Name)
		}

		if !v.keysWithWarnings[keyName] {
			v.mainWarnURL = "https://signoz.io/docs/userguide/field-context-data-types/"
			// this is warning state, we must have a unambiguous key
			v.warnings = append(v.warnings, warnMsg)
		}
		v.keysWithWarnings[keyName] = true
		v.logger.Warn("ambiguous key", "field_key_name", fieldKey.Name) //nolint:sloglint
	}

	return fieldKeysForName
}

// hasLikeWildcards checks if a value contains LIKE wildcards (% or _)
func hasLikeWildcards(value any) bool {
	str, ok := value.(string)
	if !ok {
		return false
	}
	return strings.Contains(str, "%") || strings.Contains(str, "_")
}

func trimQuotes(txt string) string {
	if len(txt) >= 2 {
		if (txt[0] == '"' && txt[len(txt)-1] == '"') ||
			(txt[0] == '\'' && txt[len(txt)-1] == '\'') {
			txt = txt[1 : len(txt)-1]
		}
	}

	// unescape so clickhouse-go can escape it
	// https://github.com/ClickHouse/clickhouse-go/blob/6c5ddb38dd2edc841a3b927711b841014759bede/bind.go#L278
	txt = strings.ReplaceAll(txt, `\\`, `\`)
	txt = strings.ReplaceAll(txt, `\'`, `'`)
	return txt
}
