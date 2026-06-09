package impldashboard

import (
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/parser/filterquery"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// bunPlaceholderFlavor is any flavor that renders `?` placeholders, which bun
// re-binds to the actual backend (e.g. `$1` for Postgres) at query time.
const bunPlaceholderFlavor = sqlbuilder.SQLite

type visitor struct {
	grammar.BaseFilterQueryVisitor
	selectBuilder *sqlbuilder.SelectBuilder
	formatter     sqlstore.SQLFormatter
	errors        []string
}

func newVisitor(formatter sqlstore.SQLFormatter) *visitor {
	return &visitor{
		selectBuilder: sqlbuilder.NewSelectBuilder(),
		formatter:     formatter,
	}
}

// compile turns the parse tree into `?`-placeholder WHERE SQL + arguments for bun.
func (v *visitor) compile(query string) (string, []any, []string) {
	tree, _, collector := filterquery.Parse(query)
	if len(collector.Errors) > 0 {
		return "", nil, collector.Errors
	}
	condition, _ := v.visit(tree).(string)
	if condition == "" {
		return "", nil, nil
	}
	sql, arguments := v.selectBuilder.Args.CompileWithFlavor(condition, bunPlaceholderFlavor)
	return sql, arguments, nil
}

func (v *visitor) visit(tree antlr.ParseTree) any {
	if tree == nil {
		return nil
	}
	return tree.Accept(v)
}

// ════════════════════════════════════════════════════════════════════════
// methods from grammar.BaseFilterQueryVisitor that are overridden
// ════════════════════════════════════════════════════════════════════════

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
		return v.selectBuilder.Or(conditions...)
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
		return v.selectBuilder.And(conditions...)
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
	// Bare keys, values, full text, and function calls are not part of the
	// dashboard list DSL.
	v.addError("unsupported expression %q — every term must be of the form `key OP value`", ctx.GetText())
	return ""
}

// VisitComparison dispatches a single `key OP value` term. A key that matches
// a reserved DSL key (name, description, etc.) becomes a column-level
// predicate; any other identifier is treated as a tag key — the operator
// applies to the tag's value, with a case-insensitive match on the tag's key.
func (v *visitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	key := strings.ToLower(strings.TrimSpace(ctx.Key().GetText()))

	operation, ok := v.extractOperation(ctx)
	if !ok {
		return ""
	}

	if allowedOperations, isReserved := dashboardtypes.ReservedOps[dashboardtypes.DSLKey(key)]; isReserved {
		return v.visitComparisonForReservedKeys(ctx, operation, dashboardtypes.DSLKey(key), allowedOperations)
	}
	return v.visitComparisonForTags(ctx, operation, key)
}

func (v *visitor) visitComparisonForReservedKeys(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key dashboardtypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		v.addError("operator %s is not allowed for key %q", operationName(operation), key)
		return ""
	}
	switch key {
	case dashboardtypes.DSLKeyName:
		return v.buildJSONStringComparison(ctx, operation, dashboardtypes.DSLKeyName, "$.spec.display.name")
	case dashboardtypes.DSLKeyDescription:
		return v.buildJSONStringComparison(ctx, operation, dashboardtypes.DSLKeyDescription, "$.spec.display.description")
	case dashboardtypes.DSLKeyCreatedAt:
		return v.buildTimestampComparison(ctx, operation, "dashboard.created_at")
	case dashboardtypes.DSLKeyUpdatedAt:
		return v.buildTimestampComparison(ctx, operation, "dashboard.updated_at")
	case dashboardtypes.DSLKeyCreatedBy:
		return v.buildStringComparison(ctx, operation, dashboardtypes.DSLKeyCreatedBy, "dashboard.created_by")
	case dashboardtypes.DSLKeyLocked:
		return v.buildBoolComparison(ctx, operation, "dashboard.locked")
	}
	// Unreachable for real input: every dashboardtypes.ReservedOps key has a case above, and
	// TestCompileReservedKeysAllHandled guards that the two stay in sync.
	v.addError("no handler for reserved key %q", key)
	return ""
}

func (v *visitor) visitComparisonForTags(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, tagKey string) string {
	if _, allowed := dashboardtypes.TagKeyOps[operation]; !allowed {
		v.addError("operator %s is not allowed on a tag-key filter", operationName(operation))
		return ""
	}
	return v.buildTagComparison(ctx, operation, tagKey)
}

func (v *visitor) extractOperation(ctx *grammar.ComparisonContext) (qbtypesv5.FilterOperator, bool) {
	// For operators that take an optional leading NOT, Inverse() maps each to
	// its Not<X> counterpart.
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
	v.addError("could not determine operator in expression %q", ctx.GetText())
	return qbtypesv5.FilterOperatorUnknown, false
}

// ─── per-key emitters ────────────────────────────────────────────────────────

func (v *visitor) buildJSONStringComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key dashboardtypes.DSLKey, jsonPath string) string {
	columnExpression := string(v.formatter.JSONExtractString("dashboard.data", jsonPath))
	return v.buildStringOperation(v.selectBuilder, ctx, operation, columnExpression, string(key))
}

func (v *visitor) buildStringComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key dashboardtypes.DSLKey, columnExpression string) string {
	return v.buildStringOperation(v.selectBuilder, ctx, operation, columnExpression, string(key))
}

// buildStringOperation covers all the operators the spec allows on text-shaped keys
// (name, description, created_by, and a tag's value). Placeholders are interned
// into builder — the outer builder for column predicates, the subquery builder for
// tag-value predicates — so nested EXISTS arguments thread correctly.
func (v *visitor) buildStringOperation(builder *sqlbuilder.SelectBuilder, ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression, keyForError string) string {
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		return builder.Equal(columnExpression, val)
	case qbtypesv5.FilterOperatorNotEqual:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		return builder.NotEqual(columnExpression, val)
	case qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotLike {
			like = "NOT LIKE"
		}
		// The user's % and _ stay as wildcards; ESCAPE pins backslash as the escape
		// char so a literal `\` in the pattern is read the same on both dialects —
		// Postgres defaults to `\`, SQLite has no default escape.
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, builder.Var(val))
	case qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		// SQLite has no ILIKE keyword and Postgres LIKE is case-sensitive — emit
		// LOWER(col) LIKE LOWER(?) so behavior is identical on both dialects. ESCAPE
		// pins backslash as the escape char (Postgres default; SQLite has none).
		lowerColumn := string(v.formatter.LowerExpression(columnExpression))
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotILike {
			like = "NOT LIKE"
		}
		return fmt.Sprintf("%s %s LOWER(%s) ESCAPE '\\'", lowerColumn, like, builder.Var(val))
	case qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		like := "LIKE"
		if operation == qbtypesv5.FilterOperatorNotContains {
			like = "NOT LIKE"
		}
		// Escape the user's % and _ so they match literally, then wrap in wildcards.
		// ESCAPE declares the backslash we just injected as the escape char — needed
		// on SQLite (no default) and a harmless restatement of the Postgres default.
		escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(val)
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, builder.Var("%"+escaped+"%"))
	case qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp:
		v.addError("REGEXP filtering on %q is not yet supported", keyForError)
		return ""
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		values, ok := v.extractStringValueList(ctx, keyForError)
		if !ok {
			return ""
		}
		arguments := make([]any, len(values))
		for i, s := range values {
			arguments[i] = s
		}
		if operation == qbtypesv5.FilterOperatorNotIn {
			return builder.NotIn(columnExpression, arguments...)
		}
		return builder.In(columnExpression, arguments...)
	}
	v.addError("operator %s on %q is not implemented", operationName(operation), keyForError)
	return ""
}

func (v *visitor) buildTimestampComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression string) string {
	switch operation {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLessThan, qbtypesv5.FilterOperatorLessThanOrEq,
		qbtypesv5.FilterOperatorGreaterThan, qbtypesv5.FilterOperatorGreaterThanOrEq:
		t, ok := v.extractSingleTimestampValue(ctx)
		if !ok {
			return ""
		}
		switch operation {
		case qbtypesv5.FilterOperatorEqual:
			return v.selectBuilder.Equal(columnExpression, t)
		case qbtypesv5.FilterOperatorNotEqual:
			return v.selectBuilder.NotEqual(columnExpression, t)
		case qbtypesv5.FilterOperatorLessThan:
			return v.selectBuilder.LessThan(columnExpression, t)
		case qbtypesv5.FilterOperatorLessThanOrEq:
			return v.selectBuilder.LessEqualThan(columnExpression, t)
		case qbtypesv5.FilterOperatorGreaterThan:
			return v.selectBuilder.GreaterThan(columnExpression, t)
		case qbtypesv5.FilterOperatorGreaterThanOrEq:
			return v.selectBuilder.GreaterEqualThan(columnExpression, t)
		}
	case qbtypesv5.FilterOperatorBetween, qbtypesv5.FilterOperatorNotBetween:
		timestamps, ok := v.extractTwoTimestampValues(ctx)
		if !ok {
			return ""
		}
		if operation == qbtypesv5.FilterOperatorNotBetween {
			return v.selectBuilder.NotBetween(columnExpression, timestamps[0], timestamps[1])
		}
		return v.selectBuilder.Between(columnExpression, timestamps[0], timestamps[1])
	}
	v.addError("operator %s on timestamp is not implemented", operationName(operation))
	return ""
}

func (v *visitor) buildBoolComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, columnExpression string) string {
	b, ok := v.extractSingleBoolValue(ctx)
	if !ok {
		return ""
	}
	if operation == qbtypesv5.FilterOperatorNotEqual {
		return v.selectBuilder.NotEqual(columnExpression, b)
	}
	return v.selectBuilder.Equal(columnExpression, b)
}

func (v *visitor) buildTagComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, tagKey string) string {
	subqueryBuilder := sqlbuilder.NewSelectBuilder()

	if operation == qbtypesv5.FilterOperatorExists || operation == qbtypesv5.FilterOperatorNotExists {
		buildSubqueryForTagKey(subqueryBuilder, tagKey)
	} else {
		// All other tag operators take the positive form of the value predicate
		// and toggle the EXISTS wrapper for negation. Inverse() flips Not<X> → <X>.
		positiveOperation := operation
		if operation.IsNegativeOperator() {
			positiveOperation = operation.Inverse()
		}
		valuePredicate := v.buildStringOperation(subqueryBuilder, ctx, positiveOperation, "t.value", tagKey)
		if valuePredicate == "" {
			return ""
		}
		buildSubqueryForTagKeyAndValue(subqueryBuilder, tagKey, valuePredicate)
	}

	if operation.IsNegativeOperator() {
		return v.selectBuilder.NotExists(subqueryBuilder)
	}
	return v.selectBuilder.Exists(subqueryBuilder)
}

func buildSubqueryForTagKey(subqueryBuilder *sqlbuilder.SelectBuilder, tagKey string) *sqlbuilder.SelectBuilder {
	const dashboardTagKind = `"dashboard"`

	return subqueryBuilder.
		Select("1").
		From("tag_relation tr").
		Join("tag t", "t.id = tr.tag_id").
		Where(
			subqueryBuilder.Equal("tr.kind", dashboardTagKind),
			"tr.resource_id = dashboard.id",
			"LOWER(t.key) = LOWER("+subqueryBuilder.Var(tagKey)+")",
		)
}

func buildSubqueryForTagKeyAndValue(subqueryBuilder *sqlbuilder.SelectBuilder, tagKey, valuePredicate string) *sqlbuilder.SelectBuilder {
	return buildSubqueryForTagKey(subqueryBuilder, tagKey).Where(valuePredicate)
}

// ─── value extraction helpers ───────────────────────────────────────────────

func (v *visitor) addError(format string, arguments ...any) {
	v.errors = append(v.errors, fmt.Sprintf(format, arguments...))
}

func (v *visitor) extractSingleStringValue(ctx *grammar.ComparisonContext, keyForError string) (string, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addError("expected exactly one value for %q", keyForError)
		return "", false
	}
	return v.extractStringValue(values[0], keyForError)
}

func (v *visitor) extractSingleBoolValue(ctx *grammar.ComparisonContext) (bool, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addError("expected a single boolean (true/false)")
		return false, false
	}
	return v.extractBoolValue(values[0])
}

func (v *visitor) extractSingleTimestampValue(ctx *grammar.ComparisonContext) (time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addError("expected a single RFC3339 timestamp")
		return time.Time{}, false
	}
	return v.extractTimestampValue(values[0])
}

func (v *visitor) extractTwoTimestampValues(ctx *grammar.ComparisonContext) ([2]time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 2 {
		v.addError("BETWEEN expects two RFC3339 timestamps")
		return [2]time.Time{}, false
	}
	a, ok1 := v.extractTimestampValue(values[0])
	b, ok2 := v.extractTimestampValue(values[1])
	if !ok1 || !ok2 {
		return [2]time.Time{}, false
	}
	return [2]time.Time{a, b}, true
}

func (v *visitor) extractStringValueList(ctx *grammar.ComparisonContext, keyForError string) ([]string, bool) {
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
		v.addError("IN clause is missing for %q", keyForError)
		return nil, false
	}
	if len(valuesCtx) == 0 {
		v.addError("IN list for %q is empty", keyForError)
		return nil, false
	}
	out := make([]string, 0, len(valuesCtx))
	for _, valueContext := range valuesCtx {
		s, ok := v.extractStringValue(valueContext, keyForError)
		if !ok {
			return nil, false
		}
		out = append(out, s)
	}
	return out, true
}

func (v *visitor) extractStringValue(ctx grammar.IValueContext, keyForError string) (string, bool) {
	if ctx.QUOTED_TEXT() != nil {
		return trimQuotes(ctx.QUOTED_TEXT().GetText()), true
	}
	if ctx.KEY() != nil {
		// Bare tokens are accepted as strings, mirroring the FilterQuery lexer's
		// treatment of unquoted identifiers on the value side.
		return ctx.KEY().GetText(), true
	}
	v.addError("expected a string value for %q, got %q", keyForError, ctx.GetText())
	return "", false
}

func (v *visitor) extractBoolValue(ctx grammar.IValueContext) (bool, bool) {
	if ctx.BOOL() == nil {
		v.addError("expected a boolean (true/false), got %q", ctx.GetText())
		return false, false
	}
	return strings.EqualFold(ctx.BOOL().GetText(), "true"), true
}

func (v *visitor) extractTimestampValue(ctx grammar.IValueContext) (time.Time, bool) {
	if ctx.QUOTED_TEXT() == nil {
		v.addError("expected an RFC3339 timestamp string, got %q", ctx.GetText())
		return time.Time{}, false
	}
	raw := trimQuotes(ctx.QUOTED_TEXT().GetText())
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		v.addError("invalid RFC3339 timestamp %q: %s", raw, err.Error())
		return time.Time{}, false
	}
	return t, true
}

// ─── operator spelling ───────────────────────────────────────────────────────

// operationName returns the user-facing spelling of a FilterOperator, used only in
// error messages — go-sqlbuilder's Cond helpers emit the SQL keywords.
func operationName(operation qbtypesv5.FilterOperator) string {
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
