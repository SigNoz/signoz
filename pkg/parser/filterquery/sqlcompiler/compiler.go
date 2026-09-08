// Package sqlcompiler compiles list-page filter queries to relational-store WHERE clauses; telemetry queries stay on querybuilder's ClickHouse visitor.
package sqlcompiler

import (
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/parser/filterquery"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// bunPlaceholderFlavor is any flavor that renders the `?` placeholders bun expects.
const bunPlaceholderFlavor = sqlbuilder.SQLite

// FieldResolver is the per-feature policy: which keys exist and what each maps to.
type FieldResolver interface {
	// ResolveComparison builds the predicate for one `key OP value` term; key keeps the user's casing.
	ResolveComparison(b *Builder, key string, operation qbtypesv5.FilterOperator, ctx *grammar.ComparisonContext) string
	// FreeText builds the predicate for a bare token.
	FreeText(b *Builder, value string) string
}

// Compiled is a `?`-placeholder WHERE clause with its bun bind args.
type Compiled struct {
	SQL  string
	Args []any
}

func (c Compiled) IsEmpty() bool {
	return c.SQL == ""
}

// Compile on success returns a non-nil *Compiled, empty for an empty query; callers gate on IsEmpty, not nil.
func Compile(query string, formatter sqlstore.SQLFormatter, resolver FieldResolver) (*Compiled, []string) {
	if len(strings.TrimSpace(query)) == 0 {
		return &Compiled{}, nil
	}

	v := &visitor{
		builder: &Builder{
			selectBuilder: sqlbuilder.NewSelectBuilder(),
			formatter:     formatter,
		},
		resolver: resolver,
	}

	tree, _, collector := filterquery.Parse(query)
	if len(collector.Errors) > 0 {
		return nil, collector.Errors
	}
	condition, _ := v.visit(tree).(string)
	if len(v.builder.errors) > 0 {
		return nil, v.builder.errors
	}
	if condition == "" {
		return &Compiled{}, nil
	}
	sql, arguments := v.builder.selectBuilder.Args.CompileWithFlavor(condition, bunPlaceholderFlavor)
	return &Compiled{SQL: sql, Args: arguments}, nil
}

// Builder is the per-compile toolbox handed to a FieldResolver.
type Builder struct {
	selectBuilder *sqlbuilder.SelectBuilder
	formatter     sqlstore.SQLFormatter
	errors        []string
}

func (b *Builder) SelectBuilder() *sqlbuilder.SelectBuilder {
	return b.selectBuilder
}

func (b *Builder) Formatter() sqlstore.SQLFormatter {
	return b.formatter
}

func (b *Builder) AddError(format string, arguments ...any) {
	b.errors = append(b.errors, fmt.Sprintf(format, arguments...))
}

// StringOperation interns placeholders into sb so nested subquery arguments thread correctly.
func (b *Builder) StringOperation(sb *sqlbuilder.SelectBuilder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression, keyForError string) string {
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		val, ok := b.ExtractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		return sb.Equal(columnExpression, val)
	case qbtypesv5.FilterOperatorNotEqual:
		val, ok := b.ExtractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		return sb.NotEqual(columnExpression, val)
	case qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike:
		val, ok := b.ExtractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		if endsWithDanglingEscape(val) {
			b.AddError("LIKE pattern for %q must not end with an unescaped backslash, use \\\\ to match a literal backslash", keyForError)
			return ""
		}
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotLike {
			like = "NOT LIKE"
		}
		// ESCAPE pins backslash as the escape char (the Postgres default, SQLite has none).
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, sb.Var(val))
	case qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike:
		val, ok := b.ExtractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		if endsWithDanglingEscape(val) {
			b.AddError("ILIKE pattern for %q must not end with an unescaped backslash, use \\\\ to match a literal backslash", keyForError)
			return ""
		}
		// SQLite has no ILIKE and Postgres LIKE is case-sensitive, so LOWER both sides.
		lowerColumn := string(b.formatter.LowerExpression(columnExpression))
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotILike {
			like = "NOT LIKE"
		}
		return fmt.Sprintf("%s %s LOWER(%s) ESCAPE '\\'", lowerColumn, like, sb.Var(val))
	case qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains:
		val, ok := b.ExtractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotContains {
			like = "NOT LIKE"
		}
		// Escape the user's % and _ so they match literally, then wrap in wildcards.
		escaped := b.formatter.EscapeLikePattern(val)
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, sb.Var("%"+escaped+"%"))
	case qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp:
		b.AddError("REGEXP filtering on %q is not supported", keyForError)
		return ""
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		values, ok := b.ExtractStringValueList(ctx, keyForError)
		if !ok {
			return ""
		}
		arguments := make([]any, len(values))
		for i, s := range values {
			arguments[i] = s
		}
		if operation == qbtypesv5.FilterOperatorNotIn {
			return sb.NotIn(columnExpression, arguments...)
		}
		return sb.In(columnExpression, arguments...)
	}
	b.AddError("operator %s on %q is not implemented", OperationName(operation), keyForError)
	return ""
}

func (b *Builder) TimestampComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression string) string {
	switch operation {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLessThan, qbtypesv5.FilterOperatorLessThanOrEq,
		qbtypesv5.FilterOperatorGreaterThan, qbtypesv5.FilterOperatorGreaterThanOrEq:
		t, ok := b.extractSingleTimestampValue(ctx)
		if !ok {
			return ""
		}
		switch operation {
		case qbtypesv5.FilterOperatorEqual:
			return b.selectBuilder.Equal(columnExpression, t)
		case qbtypesv5.FilterOperatorNotEqual:
			return b.selectBuilder.NotEqual(columnExpression, t)
		case qbtypesv5.FilterOperatorLessThan:
			return b.selectBuilder.LessThan(columnExpression, t)
		case qbtypesv5.FilterOperatorLessThanOrEq:
			return b.selectBuilder.LessEqualThan(columnExpression, t)
		case qbtypesv5.FilterOperatorGreaterThan:
			return b.selectBuilder.GreaterThan(columnExpression, t)
		case qbtypesv5.FilterOperatorGreaterThanOrEq:
			return b.selectBuilder.GreaterEqualThan(columnExpression, t)
		}
	case qbtypesv5.FilterOperatorBetween, qbtypesv5.FilterOperatorNotBetween:
		timestamps, ok := b.extractTwoTimestampValues(ctx)
		if !ok {
			return ""
		}
		if operation == qbtypesv5.FilterOperatorNotBetween {
			return b.selectBuilder.NotBetween(columnExpression, timestamps[0], timestamps[1])
		}
		return b.selectBuilder.Between(columnExpression, timestamps[0], timestamps[1])
	}
	b.AddError("operator %s on timestamp is not implemented", OperationName(operation))
	return ""
}

func (b *Builder) BoolComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression string) string {
	value, ok := b.extractSingleBoolValue(ctx)
	if !ok {
		return ""
	}
	if operation == qbtypesv5.FilterOperatorNotEqual {
		return b.selectBuilder.NotEqual(columnExpression, value)
	}
	return b.selectBuilder.Equal(columnExpression, value)
}

// A pattern ending in an unescaped backslash never matches on sqlite and errors on Postgres.
func endsWithDanglingEscape(value string) bool {
	trailing := len(value) - len(strings.TrimRight(value, `\`))
	return trailing%2 == 1
}

// FreeTextContains COALESCEs the column so NOT (...) does not go NULL and drop rows where it is absent.
func (b *Builder) FreeTextContains(sb *sqlbuilder.SelectBuilder, columnExpression, value string) string {
	lowerColumn := string(b.formatter.LowerExpression("COALESCE(" + columnExpression + ", '')"))
	pattern := "%" + b.formatter.EscapeLikePattern(value) + "%"
	return fmt.Sprintf("%s LIKE LOWER(%s) ESCAPE '\\'", lowerColumn, sb.Var(pattern))
}

func (b *Builder) ExtractSingleStringValue(ctx *grammar.ComparisonContext, keyForError string) (string, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		b.AddError("expected exactly one value for %q", keyForError)
		return "", false
	}
	return b.extractStringValue(values[0], keyForError)
}

func (b *Builder) ExtractStringValueList(ctx *grammar.ComparisonContext, keyForError string) ([]string, bool) {
	var valuesCtx []grammar.IValueContext
	switch {
	case ctx.InClause() != nil:
		inClause := ctx.InClause()
		if inClause.ValueList() != nil {
			valuesCtx = inClause.ValueList().AllValue()
		} else {
			valuesCtx = []grammar.IValueContext{inClause.Value()}
		}
	case ctx.NotInClause() != nil:
		notInClause := ctx.NotInClause()
		if notInClause.ValueList() != nil {
			valuesCtx = notInClause.ValueList().AllValue()
		} else {
			valuesCtx = []grammar.IValueContext{notInClause.Value()}
		}
	default:
		b.AddError("IN clause is missing for %q", keyForError)
		return nil, false
	}
	if len(valuesCtx) == 0 {
		b.AddError("IN list for %q is empty", keyForError)
		return nil, false
	}
	out := make([]string, 0, len(valuesCtx))
	for _, valueContext := range valuesCtx {
		s, ok := b.extractStringValue(valueContext, keyForError)
		if !ok {
			return nil, false
		}
		out = append(out, s)
	}
	return out, true
}

func (b *Builder) extractSingleBoolValue(ctx *grammar.ComparisonContext) (bool, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		b.AddError("expected a single boolean (true/false)")
		return false, false
	}
	return b.extractBoolValue(values[0])
}

func (b *Builder) extractSingleTimestampValue(ctx *grammar.ComparisonContext) (time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		b.AddError("expected a single RFC3339 timestamp")
		return time.Time{}, false
	}
	return b.extractTimestampValue(values[0])
}

func (b *Builder) extractTwoTimestampValues(ctx *grammar.ComparisonContext) ([2]time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 2 {
		b.AddError("BETWEEN expects two RFC3339 timestamps")
		return [2]time.Time{}, false
	}
	first, ok1 := b.extractTimestampValue(values[0])
	second, ok2 := b.extractTimestampValue(values[1])
	if !ok1 || !ok2 {
		return [2]time.Time{}, false
	}
	return [2]time.Time{first, second}, true
}

func (b *Builder) extractStringValue(ctx grammar.IValueContext, keyForError string) (string, bool) {
	if ctx.QUOTED_TEXT() != nil {
		return trimQuotes(ctx.QUOTED_TEXT().GetText()), true
	}
	if ctx.KEY() != nil {
		return ctx.KEY().GetText(), true
	}
	b.AddError("expected a string value for %q, got %q", keyForError, ctx.GetText())
	return "", false
}

func (b *Builder) extractBoolValue(ctx grammar.IValueContext) (bool, bool) {
	if ctx.BOOL() == nil {
		b.AddError("expected a boolean (true/false), got %q", ctx.GetText())
		return false, false
	}
	return strings.EqualFold(ctx.BOOL().GetText(), "true"), true
}

func (b *Builder) extractTimestampValue(ctx grammar.IValueContext) (time.Time, bool) {
	if ctx.QUOTED_TEXT() == nil {
		b.AddError("expected an RFC3339 timestamp string, got %q", ctx.GetText())
		return time.Time{}, false
	}
	raw := trimQuotes(ctx.QUOTED_TEXT().GetText())
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		b.AddError("invalid RFC3339 timestamp %q: %s", raw, err.Error())
		return time.Time{}, false
	}
	return t, true
}

type visitor struct {
	grammar.BaseFilterQueryVisitor
	builder  *Builder
	resolver FieldResolver
}

func (v *visitor) visit(tree antlr.ParseTree) any {
	if tree == nil {
		return nil
	}
	return tree.Accept(v)
}

func (v *visitor) VisitQuery(ctx *grammar.QueryContext) any {
	return v.visit(ctx.Expression())
}

func (v *visitor) VisitExpression(ctx *grammar.ExpressionContext) any {
	return v.visit(ctx.OrExpression())
}

func (v *visitor) VisitOrExpression(ctx *grammar.OrExpressionContext) any {
	parts := ctx.AllAndExpression()
	conditions := make([]string, 0, len(parts))
	for _, part := range parts {
		if condition, ok := v.visit(part).(string); ok && condition != "" {
			conditions = append(conditions, condition)
		}
	}
	switch len(conditions) {
	case 0:
		return ""
	case 1:
		return conditions[0]
	default:
		return v.builder.selectBuilder.Or(conditions...)
	}
}

func (v *visitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	parts := ctx.AllUnaryExpression()
	conditions := make([]string, 0, len(parts))
	for _, part := range parts {
		if condition, ok := v.visit(part).(string); ok && condition != "" {
			conditions = append(conditions, condition)
		}
	}
	switch len(conditions) {
	case 0:
		return ""
	case 1:
		return conditions[0]
	default:
		return v.builder.selectBuilder.And(conditions...)
	}
}

func (v *visitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	condition, _ := v.visit(ctx.Primary()).(string)
	if condition == "" {
		return ""
	}
	if ctx.NOT() != nil {
		return fmt.Sprintf("NOT (%s)", condition)
	}
	return condition
}

func (v *visitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		return v.visit(ctx.OrExpression())
	}
	if ctx.Comparison() != nil {
		return v.visit(ctx.Comparison())
	}
	// A quoted lone token matches its contents literally, the escape hatch for a phrase that looks like DSL.
	return v.resolver.FreeText(v.builder, trimQuotes(ctx.GetText()))
}

func (v *visitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	key := strings.TrimSpace(ctx.Key().GetText())
	operation, ok := v.extractOperation(ctx)
	if !ok {
		return ""
	}
	return v.resolver.ResolveComparison(v.builder, key, operation, ctx)
}

func (v *visitor) extractOperation(ctx *grammar.ComparisonContext) (qbtypesv5.FilterOperator, bool) {
	maybeNot := func(operation qbtypesv5.FilterOperator) qbtypesv5.FilterOperator {
		if ctx.NOT() != nil {
			return operation.Inverse()
		}
		return operation
	}
	switch {
	case ctx.EQUALS() != nil:
		return qbtypesv5.FilterOperatorEqual, true
	case ctx.NOT_EQUALS() != nil, ctx.NEQ() != nil:
		return qbtypesv5.FilterOperatorNotEqual, true
	case ctx.LT() != nil:
		return qbtypesv5.FilterOperatorLessThan, true
	case ctx.LE() != nil:
		return qbtypesv5.FilterOperatorLessThanOrEq, true
	case ctx.GT() != nil:
		return qbtypesv5.FilterOperatorGreaterThan, true
	case ctx.GE() != nil:
		return qbtypesv5.FilterOperatorGreaterThanOrEq, true
	case ctx.BETWEEN() != nil:
		return maybeNot(qbtypesv5.FilterOperatorBetween), true
	case ctx.LIKE() != nil:
		return maybeNot(qbtypesv5.FilterOperatorLike), true
	case ctx.ILIKE() != nil:
		return maybeNot(qbtypesv5.FilterOperatorILike), true
	case ctx.CONTAINS() != nil:
		return maybeNot(qbtypesv5.FilterOperatorContains), true
	case ctx.REGEXP() != nil:
		return maybeNot(qbtypesv5.FilterOperatorRegexp), true
	case ctx.InClause() != nil:
		return qbtypesv5.FilterOperatorIn, true
	case ctx.NotInClause() != nil:
		return qbtypesv5.FilterOperatorNotIn, true
	case ctx.EXISTS() != nil:
		return maybeNot(qbtypesv5.FilterOperatorExists), true
	}
	v.builder.AddError("could not determine operator in expression %q", ctx.GetText())
	return qbtypesv5.FilterOperatorUnknown, false
}

// OperationName is the user-facing spelling, used only in error messages.
func OperationName(operation qbtypesv5.FilterOperator) string {
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		return "="
	case qbtypesv5.FilterOperatorNotEqual:
		return "!="
	case qbtypesv5.FilterOperatorLessThan:
		return "<"
	case qbtypesv5.FilterOperatorLessThanOrEq:
		return "<="
	case qbtypesv5.FilterOperatorGreaterThan:
		return ">"
	case qbtypesv5.FilterOperatorGreaterThanOrEq:
		return ">="
	case qbtypesv5.FilterOperatorBetween:
		return "BETWEEN"
	case qbtypesv5.FilterOperatorNotBetween:
		return "NOT BETWEEN"
	case qbtypesv5.FilterOperatorLike:
		return "LIKE"
	case qbtypesv5.FilterOperatorNotLike:
		return "NOT LIKE"
	case qbtypesv5.FilterOperatorILike:
		return "ILIKE"
	case qbtypesv5.FilterOperatorNotILike:
		return "NOT ILIKE"
	case qbtypesv5.FilterOperatorContains:
		return "CONTAINS"
	case qbtypesv5.FilterOperatorNotContains:
		return "NOT CONTAINS"
	case qbtypesv5.FilterOperatorRegexp:
		return "REGEXP"
	case qbtypesv5.FilterOperatorNotRegexp:
		return "NOT REGEXP"
	case qbtypesv5.FilterOperatorIn:
		return "IN"
	case qbtypesv5.FilterOperatorNotIn:
		return "NOT IN"
	case qbtypesv5.FilterOperatorExists:
		return "EXISTS"
	case qbtypesv5.FilterOperatorNotExists:
		return "NOT EXISTS"
	}
	return "?"
}

func trimQuotes(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			s = s[1 : len(s)-1]
		}
	}
	s = strings.ReplaceAll(s, `\\`, `\`)
	s = strings.ReplaceAll(s, `\'`, `'`)
	return s
}
