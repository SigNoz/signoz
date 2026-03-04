package queryBuilderToExpr

import (
	"fmt"
	"maps"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	grammar "github.com/SigNoz/signoz/pkg/parser/grammar"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/antlr4-go/antlr/v4"
	expr "github.com/antonmedv/expr"
	"go.uber.org/zap"
)

var (
	CodeExprCompilationFailed = errors.MustNewCode("expr_compilation_failed")
)

var logOperatorsToExpr = map[qbtypes.FilterOperator]string{
	qbtypes.FilterOperatorEqual:           "==",
	qbtypes.FilterOperatorNotEqual:        "!=",
	qbtypes.FilterOperatorLessThan:        "<",
	qbtypes.FilterOperatorLessThanOrEq:    "<=",
	qbtypes.FilterOperatorGreaterThan:     ">",
	qbtypes.FilterOperatorGreaterThanOrEq: ">=",
	qbtypes.FilterOperatorContains:        "contains",
	qbtypes.FilterOperatorNotContains:     "not contains",
	qbtypes.FilterOperatorRegexp:          "matches",
	qbtypes.FilterOperatorNotRegexp:       "not matches",
	qbtypes.FilterOperatorIn:              "in",
	qbtypes.FilterOperatorNotIn:           "not in",
	qbtypes.FilterOperatorExists:          "in",
	qbtypes.FilterOperatorNotExists:       "not in",
	// LIKE/NOT LIKE and ILIKE/NOT ILIKE are not supported yet
}

func getName(key *telemetrytypes.TelemetryFieldKey) (string, error) {
	if key == nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "field key is nil")
	}

	switch key.FieldContext {
	case telemetrytypes.FieldContextAttribute:
		return fmt.Sprintf(`attributes["%s"]`, key.Name), nil
	case telemetrytypes.FieldContextResource:
		return fmt.Sprintf(`resource["%s"]`, key.Name), nil
	case telemetrytypes.FieldContextBody:
		return fmt.Sprintf("%s.%s", key.FieldContext.StringValue(), key.Name), nil
	default:
		return key.Name, nil
	}
}

// exprVisitor is an ANTLR visitor that directly produces expr-lang expression strings,
// eliminating the intermediate FilterExprNode / FilterCondition representation.
type exprVisitor struct {
	errors []string
}

func (v *exprVisitor) Visit(tree antlr.ParseTree) any {
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
	case *grammar.ValueContext:
		return v.VisitValue(t)
	case *grammar.KeyContext:
		return v.VisitKey(t)
	case *grammar.FunctionCallContext:
		return v.VisitFunctionCall(t)
	case *grammar.FunctionParamListContext:
		return v.VisitFunctionParamList(t)
	case *grammar.FunctionParamContext:
		return v.VisitFunctionParam(t)
	case *grammar.ArrayContext:
		return v.VisitArray(t)
	case *grammar.FullTextContext:
		return v.VisitFullText(t)
	default:
		return ""
	}
}

func (v *exprVisitor) VisitQuery(ctx *grammar.QueryContext) any {
	return v.Visit(ctx.Expression())
}

func (v *exprVisitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.Visit(ctx.OrExpression())
}

func (v *exprVisitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	andExprs := ctx.AllAndExpression()
	var parts []string
	for _, andExpr := range andExprs {
		s, _ := v.Visit(andExpr).(string)
		if s != "" {
			parts = append(parts, s)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return strings.Join(parts, " or ")
}

func (v *exprVisitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	unaryExprs := ctx.AllUnaryExpression()
	var parts []string
	for _, unary := range unaryExprs {
		s, _ := v.Visit(unary).(string)
		if s != "" {
			parts = append(parts, s)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	if len(parts) == 1 {
		return parts[0]
	}
	return strings.Join(parts, " and ")
}

func (v *exprVisitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	s, _ := v.Visit(ctx.Primary()).(string)
	if s == "" {
		return ""
	}
	if ctx.NOT() != nil {
		// VisitPrimary already wraps parenthesized sub-expressions (when the user
		// wrote explicit parens, i.e. Primary.OrExpression != nil) in '(...)'.
		// In that case, prepend "not " without adding another pair of parens to
		// avoid the double-wrapping: not ((expr)) → not (expr).
		if primaryCtx, ok := ctx.Primary().(*grammar.PrimaryContext); ok && primaryCtx.OrExpression() != nil {
			return "not " + s
		}
		return fmt.Sprintf("not (%s)", s)
	}
	return s
}

func (v *exprVisitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	switch {
	case ctx.OrExpression() != nil:
		// Parenthesized sub-expression: wrap to preserve precedence.
		s, _ := v.Visit(ctx.OrExpression()).(string)
		if s == "" {
			return ""
		}
		return fmt.Sprintf("(%s)", s)
	case ctx.Comparison() != nil:
		return v.Visit(ctx.Comparison())
	case ctx.FunctionCall() != nil:
		return v.Visit(ctx.FunctionCall())
	case ctx.FullText() != nil:
		return v.Visit(ctx.FullText())
	default:
		return ""
	}
}

func (v *exprVisitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	key := v.buildKey(ctx.Key())
	if key == nil {
		return ""
	}

	// Validate: fields without context must be intrinsic (top-level OTEL log fields).
	_, isIntrinsic := telemetrylogs.IntrinsicFields[key.Name]
	if key.FieldContext == telemetrytypes.FieldContextUnspecified && !isIntrinsic {
		v.errors = append(v.errors, fmt.Sprintf(
			"field %q in filter expression must include a context prefix (attribute., resource., body.) OR can be one of the following fields: %v",
			key.Name, maps.Keys(telemetrylogs.IntrinsicFields),
		))
		return ""
	}

	// EXISTS / NOT EXISTS are structural and don't follow the standard value path.
	if ctx.EXISTS() != nil {
		return v.buildExistsExpr(key, ctx.NOT() != nil)
	}

	// BETWEEN / NOT BETWEEN: two numeric values, expanded to range comparisons.
	if ctx.BETWEEN() != nil {
		return v.buildBetweenExpr(key, ctx.NOT() != nil, ctx.AllValue())
	}

	// Determine operator from grammar tokens.
	notModifier := ctx.NOT() != nil
	var op qbtypes.FilterOperator
	switch {
	case ctx.EQUALS() != nil:
		op = qbtypes.FilterOperatorEqual
	case ctx.NOT_EQUALS() != nil || ctx.NEQ() != nil:
		op = qbtypes.FilterOperatorNotEqual
	case ctx.LT() != nil:
		op = qbtypes.FilterOperatorLessThan
	case ctx.LE() != nil:
		op = qbtypes.FilterOperatorLessThanOrEq
	case ctx.GT() != nil:
		op = qbtypes.FilterOperatorGreaterThan
	case ctx.GE() != nil:
		op = qbtypes.FilterOperatorGreaterThanOrEq
	case ctx.REGEXP() != nil:
		if notModifier {
			op = qbtypes.FilterOperatorNotRegexp
		} else {
			op = qbtypes.FilterOperatorRegexp
		}
	case ctx.CONTAINS() != nil:
		if notModifier {
			op = qbtypes.FilterOperatorNotContains
		} else {
			op = qbtypes.FilterOperatorContains
		}
	case ctx.InClause() != nil:
		op = qbtypes.FilterOperatorIn
	case ctx.NotInClause() != nil:
		op = qbtypes.FilterOperatorNotIn
	case ctx.LIKE() != nil || ctx.ILIKE() != nil:
		v.errors = append(v.errors, "LIKE/ILIKE operators are not supported in expr expressions")
		return ""
	default:
		v.errors = append(v.errors, fmt.Sprintf("unsupported comparison operator: %s", ctx.GetText()))
		return ""
	}

	if _, ok := logOperatorsToExpr[op]; !ok {
		v.errors = append(v.errors, fmt.Sprintf("operator not supported: %v", op))
		return ""
	}

	// Build the right-hand side value.
	var value any
	if op == qbtypes.FilterOperatorIn || op == qbtypes.FilterOperatorNotIn {
		value = v.buildValuesFromInClause(ctx.InClause(), ctx.NotInClause())
	} else {
		valuesCtx := ctx.AllValue()
		if len(valuesCtx) == 0 {
			v.errors = append(v.errors, "comparison operator requires a value")
			return ""
		}
		value = v.buildValue(valuesCtx[0])
	}

	// Validate regex patterns eagerly.
	if op == qbtypes.FilterOperatorRegexp || op == qbtypes.FilterOperatorNotRegexp {
		str, ok := value.(string)
		if !ok {
			v.errors = append(v.errors, "value for regex operator must be a string")
			return ""
		}
		if _, err := regexp.Compile(str); err != nil {
			v.errors = append(v.errors, "value for regex operator must be a valid regex")
			return ""
		}
	}

	filter, err := buildFilterExpr(key, op, value)
	if err != nil {
		v.errors = append(v.errors, err.Error())
		return ""
	}

	if _, err := expr.Compile(filter); err != nil {
		v.errors = append(v.errors, err.Error())
		return ""
	}

	return filter
}

// buildExistsExpr produces the expr-lang string for EXISTS / NOT EXISTS checks.
func (v *exprVisitor) buildExistsExpr(key *telemetrytypes.TelemetryFieldKey, isNotExists bool) string {
	op := qbtypes.FilterOperatorExists
	if isNotExists {
		op = qbtypes.FilterOperatorNotExists
	}

	switch key.FieldContext {
	case telemetrytypes.FieldContextBody:
		// JSON body: check membership in fromJSON(body).
		// Need to quote the key for expr lang
		quoted := exprFormattedValue(key.Name)
		jsonMembership := fmt.Sprintf(
			`((type(body) == "string" && isJSON(body)) && %s %s %s)`,
			quoted, logOperatorsToExpr[op], "fromJSON(body)",
		)
		// Map body: nil check on the field.
		nilOp := qbtypes.FilterOperatorNotEqual
		if isNotExists {
			nilOp = qbtypes.FilterOperatorEqual
		}
		nilCheckFilter := fmt.Sprintf("%s.%s %s nil", key.FieldContext.StringValue(), key.Name, logOperatorsToExpr[nilOp])
		return fmt.Sprintf(`(%s or (type(body) == "map" && (%s)))`, jsonMembership, nilCheckFilter)
	case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource:
		// Check membership in the attributes / resource map.
		target := "resource"
		if key.FieldContext == telemetrytypes.FieldContextAttribute {
			target = "attributes"
		}
		return fmt.Sprintf("%q %s %s", key.Name, logOperatorsToExpr[op], target)
	default:
		// Intrinsic / top-level field: use a nil comparison.
		nilOp := qbtypes.FilterOperatorNotEqual
		if isNotExists {
			nilOp = qbtypes.FilterOperatorEqual
		}
		return fmt.Sprintf("%s %s nil", key.Name, logOperatorsToExpr[nilOp])
	}
}

// buildBetweenExpr expands BETWEEN / NOT BETWEEN into range comparisons.
// Only numeric values are accepted; strings and booleans are rejected.
//
//	key BETWEEN lo AND hi     →  keyName != nil && keyName >= lo && keyName <= hi
//	key NOT BETWEEN lo AND hi →  keyName != nil && (keyName < lo || keyName > hi)
func (v *exprVisitor) buildBetweenExpr(key *telemetrytypes.TelemetryFieldKey, isNot bool, valuesCtx []grammar.IValueContext) string {
	if len(valuesCtx) != 2 {
		v.errors = append(v.errors, "BETWEEN operator requires exactly two values")
		return ""
	}

	lo := v.buildValue(valuesCtx[0])
	hi := v.buildValue(valuesCtx[1])

	for _, val := range []any{lo, hi} {
		switch val.(type) {
		case int64, float32, float64:
			// ok
		default:
			v.errors = append(v.errors, "BETWEEN operator requires numeric values")
			return ""
		}
	}

	keyName, err := getName(key)
	if err != nil {
		v.errors = append(v.errors, err.Error())
		return ""
	}

	loStr := exprFormattedValue(lo)
	hiStr := exprFormattedValue(hi)

	var filter string
	if isNot {
		filter = fmt.Sprintf("%s != nil && (%s < %s || %s > %s)", keyName, keyName, loStr, keyName, hiStr)
	} else {
		filter = fmt.Sprintf("%s != nil && %s >= %s && %s <= %s", keyName, keyName, loStr, keyName, hiStr)
	}

	if _, err := expr.Compile(filter); err != nil {
		v.errors = append(v.errors, err.Error())
		return ""
	}

	return filter
}

// buildFilterExpr converts key + op + value into a final expr-lang string.
func buildFilterExpr(key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator, value any) (string, error) {
	keyName, err := getName(key)
	if err != nil {
		return "", err
	}

	fmtValue := exprFormattedValue(value)
	var filter string

	if op == qbtypes.FilterOperatorContains || op == qbtypes.FilterOperatorNotContains {
		// contains / not contains must be case-insensitive to match query-time behaviour.
		filter = fmt.Sprintf("lower(%s) %s lower(%s)", keyName, logOperatorsToExpr[op], fmtValue)
	} else {
		filter = fmt.Sprintf("%s %s %s", keyName, logOperatorsToExpr[op], fmtValue)
	}

	// Avoid running operators on nil values (except equality, which handles nil fine).
	if op != qbtypes.FilterOperatorEqual && op != qbtypes.FilterOperatorNotEqual {
		filter = fmt.Sprintf("%s != nil && %s", keyName, filter)
	}

	return filter, nil
}

// buildKey turns a key grammar context into a TelemetryFieldKey.
func (v *exprVisitor) buildKey(ctx grammar.IKeyContext) *telemetrytypes.TelemetryFieldKey {
	if ctx == nil {
		return nil
	}
	key := telemetrytypes.GetFieldKeyFromKeyText(ctx.GetText())
	return &key
}

func (v *exprVisitor) buildValuesFromInClause(in grammar.IInClauseContext, notIn grammar.INotInClauseContext) []any {
	var ctxVal any
	if in != nil {
		ctxVal = v.VisitInClause(in)
	} else if notIn != nil {
		ctxVal = v.VisitNotInClause(notIn)
	}

	switch ret := ctxVal.(type) {
	case []any:
		return ret
	case any:
		if ret != nil {
			return []any{ret}
		}
	}
	return nil
}

func (v *exprVisitor) VisitInClause(ctx grammar.IInClauseContext) any {
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}
	return v.Visit(ctx.Value())
}

func (v *exprVisitor) VisitNotInClause(ctx grammar.INotInClauseContext) any {
	if ctx.ValueList() != nil {
		return v.Visit(ctx.ValueList())
	}
	return v.Visit(ctx.Value())
}

func (v *exprVisitor) VisitValueList(ctx grammar.IValueListContext) any {
	values := ctx.AllValue()
	parts := make([]any, 0, len(values))
	for _, val := range values {
		parts = append(parts, v.Visit(val))
	}
	return parts
}

func (v *exprVisitor) VisitValue(ctx *grammar.ValueContext) any {
	return v.buildValue(ctx)
}

func (v *exprVisitor) VisitKey(ctx *grammar.KeyContext) any {
	return v.buildKey(ctx)
}

func (v *exprVisitor) VisitFunctionCall(_ *grammar.FunctionCallContext) any {
	v.errors = append(v.errors, "function calls are not supported in expr expressions")
	return ""
}

func (v *exprVisitor) VisitFunctionParamList(_ *grammar.FunctionParamListContext) any {
	v.errors = append(v.errors, "function calls are not supported in expr expressions")
	return ""
}

func (v *exprVisitor) VisitFunctionParam(_ *grammar.FunctionParamContext) any {
	v.errors = append(v.errors, "function calls are not supported in expr expressions")
	return ""
}

func (v *exprVisitor) VisitArray(_ *grammar.ArrayContext) any {
	v.errors = append(v.errors, "array literals are not supported in expr expressions")
	return ""
}

func (v *exprVisitor) VisitFullText(_ *grammar.FullTextContext) any {
	v.errors = append(v.errors, "full-text search is not supported in expr expressions")
	return ""
}

// buildValue converts a grammar VALUE token into a Go type.
func (v *exprVisitor) buildValue(ctx grammar.IValueContext) any {
	switch {
	case ctx == nil:
		return nil
	case ctx.QUOTED_TEXT() != nil:
		return trimQuotes(ctx.QUOTED_TEXT().GetText())
	case ctx.NUMBER() != nil:
		text := ctx.NUMBER().GetText()
		if i, err := strconv.ParseInt(text, 10, 64); err == nil {
			return i
		}
		f, err := strconv.ParseFloat(text, 64)
		if err != nil {
			v.errors = append(v.errors, fmt.Sprintf("failed to parse number %s", text))
			return nil
		}
		return f
	case ctx.BOOL() != nil:
		return strings.ToLower(ctx.BOOL().GetText()) == "true"
	case ctx.KEY() != nil:
		return ctx.KEY().GetText()
	default:
		return nil
	}
}

// trimQuotes removes surrounding single or double quotes from a token and
// unescapes embedded escape sequences produced by the ANTLR lexer.
func trimQuotes(txt string) string {
	if len(txt) >= 2 {
		if (txt[0] == '"' && txt[len(txt)-1] == '"') ||
			(txt[0] == '\'' && txt[len(txt)-1] == '\'') {
			txt = txt[1 : len(txt)-1]
		}
	}
	txt = strings.ReplaceAll(txt, `\\`, `\`)
	txt = strings.ReplaceAll(txt, `\'`, `'`)
	return txt
}

// Parse converts the QB filter Expression (query builder expression string) into
// the Expr expression string used by the collector. It runs the ANTLR parser
// directly and produces the output in a single visitor pass, without building an
// intermediate FilterExprNode / FilterCondition tree.
func Parse(filter *qbtypes.Filter) (string, error) {
	if filter == nil || strings.TrimSpace(filter.Expression) == "" {
		return "", nil
	}

	input := antlr.NewInputStream(filter.Expression)
	lexer := grammar.NewFilterQueryLexer(input)

	lexerErrorListener := querybuilder.NewErrorListener()
	lexer.RemoveErrorListeners()
	lexer.AddErrorListener(lexerErrorListener)

	tokens := antlr.NewCommonTokenStream(lexer, 0)
	parserErrorListener := querybuilder.NewErrorListener()
	parser := grammar.NewFilterQueryParser(tokens)
	parser.RemoveErrorListeners()
	parser.AddErrorListener(parserErrorListener)

	tree := parser.Query()

	if len(parserErrorListener.SyntaxErrors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d syntax errors while parsing the search expression.",
			len(parserErrorListener.SyntaxErrors),
		)
		additionals := make([]string, 0, len(parserErrorListener.SyntaxErrors))
		for _, err := range parserErrorListener.SyntaxErrors {
			if err.Error() != "" {
				additionals = append(additionals, err.Error())
			}
		}
		return "", combinedErrors.WithAdditional(additionals...)
	}

	visitor := &exprVisitor{}
	result, _ := visitor.Visit(tree).(string)

	if len(visitor.errors) > 0 {
		combinedErrors := errors.Newf(
			errors.TypeInvalidInput,
			errors.CodeInvalidInput,
			"Found %d errors while building expr expression.",
			len(visitor.errors),
		)
		return "", combinedErrors.WithAdditional(visitor.errors...)
	}

	if _, err := expr.Compile(result); err != nil {
		return "", errors.WrapUnexpectedf(err, CodeExprCompilationFailed, "failed to compile expression: %s", result)
	}

	return result, nil
}

func exprFormattedValue(v any) string {
	switch x := v.(type) {
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%v", x)
	case string:
		return fmt.Sprintf("\"%s\"", quoteEscapedString(x))
	case bool:
		return fmt.Sprintf("%v", x)
	case []any:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string:
			parts := make([]string, len(x))
			for i, sVal := range x {
				parts[i] = fmt.Sprintf("'%s'", quoteEscapedString(sVal.(string)))
			}
			return "[" + strings.Join(parts, ",") + "]"
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}

func quoteEscapedString(str string) string {
	str = strings.ReplaceAll(str, `\`, `\\`)
	str = strings.ReplaceAll(str, `"`, `\"`)
	return str
}
