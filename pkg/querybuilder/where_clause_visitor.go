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
	"github.com/antlr4-go/antlr/v4"

	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

var searchTroubleshootingGuideURL = "https://signoz.io/docs/userguide/search-troubleshooting/"

// BooleanExpression represents a boolean expression with proper evaluation context
type BooleanExpression struct {
	SQL     string
	IsTrue  bool
	IsEmpty bool
}

// NewBooleanExpression creates a BooleanExpression from SQL
func NewBooleanExpression(sql string) BooleanExpression {
	return BooleanExpression{
		SQL:     sql,
		IsTrue:  sql == "true",
		IsEmpty: sql == "",
	}
}

// booleanEvaluatingVisitor is a specialized visitor for resource filter context
// that properly applies boolean algebra during tree traversal
type booleanEvaluatingVisitor struct {
	*filterExpressionVisitor
}

func newBooleanEvaluatingVisitor(opts FilterExprVisitorOpts) *booleanEvaluatingVisitor {
	return &booleanEvaluatingVisitor{
		filterExpressionVisitor: newFilterExpressionVisitor(opts),
	}
}

// Visit dispatches to boolean-aware visit methods
func (v *booleanEvaluatingVisitor) Visit(tree antlr.ParseTree) any {
	if tree == nil {
		return NewBooleanExpression("")
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
	default:
		// For leaf nodes, delegate to original visitor and wrap result
		result := v.filterExpressionVisitor.Visit(tree)
		if sql, ok := result.(string); ok {
			return NewBooleanExpression(sql)
		}
		return NewBooleanExpression("")
	}
}

func (v *booleanEvaluatingVisitor) VisitQuery(ctx *grammar.QueryContext) any {
	return v.Visit(ctx.Expression())
}

func (v *booleanEvaluatingVisitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

func (v *booleanEvaluatingVisitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	andExpressions := ctx.AllAndExpression()

	var result BooleanExpression
	hasTrue := false
	hasEmpty := false

	for i, expr := range andExpressions {
		exprResult := v.Visit(expr).(BooleanExpression)
		if exprResult.IsTrue {
			hasTrue = true
		}
		if exprResult.IsEmpty {
			hasEmpty = true
		}

		if i == 0 {
			result = exprResult
		} else {
			if result.IsEmpty {
				result = exprResult
			} else if !exprResult.IsEmpty {
				sql := v.builder.Or(result.SQL, exprResult.SQL)
				result = NewBooleanExpression(sql)
			}
		}
	}

	// In resource filter context, if any operand is empty (meaning "include all resources"),
	// the entire OR should be empty (include all resources)
	if hasEmpty && v.onlyResourceFilter {
		result.IsEmpty = true
		result.IsTrue = true
		result.SQL = ""
	} else if hasTrue {
		// Mark as always true if any operand is true, but preserve the SQL structure
		result.IsTrue = true
	}

	return result
}

func (v *booleanEvaluatingVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	unaryExpressions := ctx.AllUnaryExpression()

	var result BooleanExpression
	allTrue := true

	for i, expr := range unaryExpressions {
		exprResult := v.Visit(expr).(BooleanExpression)
		if !exprResult.IsTrue && !exprResult.IsEmpty {
			allTrue = false
		}

		if i == 0 {
			result = exprResult
		} else {
			// Apply boolean AND logic
			if exprResult.IsTrue {
				// A AND true = A, continue with result
				continue
			}
			if result.IsTrue {
				result = exprResult
			} else if result.IsEmpty {
				result = exprResult
			} else if !exprResult.IsEmpty {
				sql := v.builder.And(result.SQL, exprResult.SQL)
				result = NewBooleanExpression(sql)
			}
		}
	}

	// If all terms were "true", mark the result as always true
	if allTrue && len(unaryExpressions) > 0 {
		result.IsTrue = true
		if result.SQL == "" {
			result.SQL = "true"
		}
	}

	return result
}

func (v *booleanEvaluatingVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(BooleanExpression)

	if ctx.NOT() != nil {
		// Apply NOT logic with resource filter context awareness
		if v.onlyResourceFilter {
			if result.IsTrue {
				return NewBooleanExpression("") // NOT(true) = include all resources
			}
			if result.IsEmpty {
				return NewBooleanExpression("") // NOT(empty) = include all resources
			}
		}

		sql := fmt.Sprintf("NOT (%s)", result.SQL)
		return NewBooleanExpression(sql)
	}

	return result
}

func (v *booleanEvaluatingVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		result := v.Visit(ctx.OrExpression()).(BooleanExpression)
		// If no boolean simplification happened, preserve original parentheses structure
		if !result.IsEmpty && !result.IsTrue {
			// Use original visitor to get proper parentheses structure
			originalSQL := v.filterExpressionVisitor.Visit(ctx)
			if sql, ok := originalSQL.(string); ok && sql != "" {
				return NewBooleanExpression(sql)
			}
			result.SQL = fmt.Sprintf("(%s)", result.SQL)
		}
		return result
	}

	// For other cases, delegate to original visitor
	sqlResult := v.filterExpressionVisitor.Visit(ctx)
	if sql, ok := sqlResult.(string); ok {
		return NewBooleanExpression(sql)
	}
	return NewBooleanExpression("")
}

// filterExpressionVisitor implements the FilterQueryVisitor interface
// to convert the parsed filter expressions into ClickHouse WHERE clause
type filterExpressionVisitor struct {
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
	jsonBodyPrefix     string
	jsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	skipResourceFilter bool
	onlyResourceFilter bool
	skipFullTextFilter bool
	skipFunctionCalls  bool
	ignoreNotFoundKeys bool
	variables          map[string]qbtypes.VariableItem

	keysWithWarnings map[string]bool
}

type FilterExprVisitorOpts struct {
	Logger             *slog.Logger
	FieldMapper        qbtypes.FieldMapper
	ConditionBuilder   qbtypes.ConditionBuilder
	FieldKeys          map[string][]*telemetrytypes.TelemetryFieldKey
	Builder            *sqlbuilder.SelectBuilder
	FullTextColumn     *telemetrytypes.TelemetryFieldKey
	JsonBodyPrefix     string
	JsonKeyToKey       qbtypes.JsonKeyToFieldFunc
	SkipResourceFilter bool
	OnlyResourceFilter bool // Only process resource terms, skip non-resource terms
	SkipFullTextFilter bool
	SkipFunctionCalls  bool
	IgnoreNotFoundKeys bool
	Variables          map[string]qbtypes.VariableItem
}

// newFilterExpressionVisitor creates a new filterExpressionVisitor
func newFilterExpressionVisitor(opts FilterExprVisitorOpts) *filterExpressionVisitor {
	return &filterExpressionVisitor{
		logger:             opts.Logger,
		fieldMapper:        opts.FieldMapper,
		conditionBuilder:   opts.ConditionBuilder,
		fieldKeys:          opts.FieldKeys,
		builder:            opts.Builder,
		fullTextColumn:     opts.FullTextColumn,
		jsonBodyPrefix:     opts.JsonBodyPrefix,
		jsonKeyToKey:       opts.JsonKeyToKey,
		skipResourceFilter: opts.SkipResourceFilter,
		onlyResourceFilter: opts.OnlyResourceFilter,
		skipFullTextFilter: opts.SkipFullTextFilter,
		skipFunctionCalls:  opts.SkipFunctionCalls,
		ignoreNotFoundKeys: opts.IgnoreNotFoundKeys,
		variables:          opts.Variables,
		keysWithWarnings:   make(map[string]bool),
	}
}

type PreparedWhereClause struct {
	WhereClause    *sqlbuilder.WhereClause
	Warnings       []string
	WarningsDocURL string
}

// PrepareWhereClause generates a ClickHouse compatible WHERE clause from the filter query
func PrepareWhereClause(query string, opts FilterExprVisitorOpts) (*PreparedWhereClause, error) {
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

	// In resource filter context, apply robust boolean evaluation only when needed
	if opts.OnlyResourceFilter {
		// Check if the condition contains patterns that need boolean simplification
		// We need boolean evaluation when:
		// 1. Expression contains " true" (indicating simplified non-resource terms)
		// 2. Expression is exactly "true"
		// 3. Expression contains "NOT" with true values that need simplification
		needsBooleanEval := strings.Contains(cond, " true") ||
			cond == "true" ||
			(strings.Contains(cond, "NOT") && strings.Contains(cond, "true"))

		if needsBooleanEval {
			// Re-parse and evaluate with boolean algebra
			boolVisitor := newBooleanEvaluatingVisitor(opts)
			boolResult := boolVisitor.Visit(tree)
			if boolExpr, ok := boolResult.(BooleanExpression); ok {
				if boolExpr.IsEmpty {
					cond = "true" // Empty means include all resources
				} else {
					cond = boolExpr.SQL
				}
			}
		}
	}

	whereClause := sqlbuilder.NewWhereClause().AddWhereExpr(visitor.builder.Args, cond)

	return &PreparedWhereClause{whereClause, visitor.warnings, visitor.mainWarnURL}, nil
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

	validConditions := []string{}

	for _, expr := range andExpressions {
		if condExpr, ok := v.Visit(expr).(string); ok && condExpr != "" {
			validConditions = append(validConditions, condExpr)
		}
	}

	if len(validConditions) == 0 {
		return ""
	}

	if len(validConditions) == 1 {
		return validConditions[0]
	}

	return v.builder.Or(validConditions...)
}

// VisitAndExpression handles AND expressions
func (v *filterExpressionVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	unaryExpressions := ctx.AllUnaryExpression()

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
func (v *filterExpressionVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	result := v.Visit(ctx.Primary()).(string)

	// Check if this is a NOT expression
	if ctx.NOT() != nil {
		// In resource filter context, handle NOT specially
		if v.onlyResourceFilter {
			// NOT(true) means NOT(all non-resource terms) which means "include all resources"
			if result == "true" {
				return "" // No filtering = include all resources
			}
			// NOT(empty) should return empty (no filtering)
			if result == "" {
				return ""
			}
		}
		return fmt.Sprintf("NOT (%s)", result)
	}

	return result
}

// VisitPrimary handles grouped expressions, comparisons, function calls, and full-text search
func (v *filterExpressionVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		// This is a parenthesized expression
		if condExpr, ok := v.Visit(ctx.OrExpression()).(string); ok && condExpr != "" {
			return fmt.Sprintf("(%s)", condExpr)
		}
		return ""
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
			return ""
		}

		if v.fullTextColumn == nil {
			v.errors = append(v.errors, "full text search is not supported")
			return ""
		}
		child := ctx.GetChild(0)
		if keyCtx, ok := child.(*grammar.KeyContext); ok {
			// create a full text search condition on the body field

			keyText := keyCtx.GetText()
			cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(keyText), v.builder)
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
			cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(text), v.builder)
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

	// this is used to only process resource terms in resource filter context
	if v.onlyResourceFilter {
		filteredKeys := []*telemetrytypes.TelemetryFieldKey{}
		for _, key := range keys {
			if key.FieldContext == telemetrytypes.FieldContextResource {
				filteredKeys = append(filteredKeys, key)
			}
		}
		keys = filteredKeys
		if len(keys) == 0 {
			// For non-resource terms in resource filter context, return "true"
			// This ensures OR expressions work correctly (e.g., resource OR non-resource)
			return "true"
		}
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
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
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
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
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
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
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
			if !ok && len(var_) > 0 {
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
			if ctx.NOT() != nil {
				op = qbtypes.FilterOperatorNotLike
			}
		} else if ctx.ILIKE() != nil {
			op = qbtypes.FilterOperatorILike
			if ctx.NOT() != nil {
				op = qbtypes.FilterOperatorNotILike
			}
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
		if op.IsNegativeOperator() {
			return v.builder.And(conds...)
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
		return ""
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
	cond, err := v.conditionBuilder.ConditionFor(context.Background(), v.fullTextColumn, qbtypes.FilterOperatorRegexp, FormatFullTextSearch(text), v.builder)
	if err != nil {
		v.errors = append(v.errors, fmt.Sprintf("failed to build full text search condition: %s", err.Error()))
		return ""
	}
	return cond
}

// VisitFunctionCall handles function calls like has(), hasAny(), etc.
func (v *filterExpressionVisitor) VisitFunctionCall(ctx *grammar.FunctionCallContext) any {
	if v.skipFunctionCalls {
		return ""
	}

	// Get function name based on which token is present
	var functionName string
	if ctx.HAS() != nil {
		functionName = "has"
	} else if ctx.HASANY() != nil {
		functionName = "hasAny"
	} else if ctx.HASALL() != nil {
		functionName = "hasAll"
	} else if ctx.HASTOKEN() != nil {
		functionName = "hasToken"
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
			if strings.HasPrefix(key.Name, v.jsonBodyPrefix) {
				fieldName, _ = v.jsonKeyToKey(context.Background(), key, qbtypes.FilterOperatorUnknown, value)
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
	if strings.HasPrefix(fieldKey.Name, v.jsonBodyPrefix) && v.jsonBodyPrefix != "" {
		if keyName != "" {
			fieldKeysForName = append(fieldKeysForName, &fieldKey)
		}
	}

	if len(fieldKeysForName) == 0 {
		// check if the key exists with {fieldContext}.{key}
		// because the context could be legitimate prefix in user data, example `span.div_num = 20`
		keyWithContext := fmt.Sprintf("%s.%s", fieldKey.FieldContext.StringValue(), fieldKey.Name)
		if len(v.fieldKeys[keyWithContext]) > 0 {
			return v.fieldKeys[keyWithContext]
		}

		if strings.HasPrefix(fieldKey.Name, v.jsonBodyPrefix) && v.jsonBodyPrefix != "" && keyName == "" {
			v.errors = append(v.errors, "missing key for body json search - expected key of the form `body.key` (ex: `body.status`)")
		} else if !v.ignoreNotFoundKeys {
			// TODO(srikanthccv): do we want to return an error here?
			// should we infer the type and auto-magically build a key for expression?
			v.errors = append(v.errors, fmt.Sprintf("key `%s` not found", fieldKey.Name))
			v.mainErrorURL = "https://signoz.io/docs/userguide/search-troubleshooting/#key-fieldname-not-found"
		}
	}

	if len(fieldKeysForName) > 1 && !v.keysWithWarnings[keyName] {
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
		v.mainWarnURL = "https://signoz.io/docs/userguide/field-context-data-types/"
		// this is warning state, we must have a unambiguous key
		v.warnings = append(v.warnings, warnMsg)
		v.keysWithWarnings[keyName] = true
		v.logger.Warn("ambiguous key", "field_key_name", fieldKey.Name) //nolint:sloglint
	}

	return fieldKeysForName
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
