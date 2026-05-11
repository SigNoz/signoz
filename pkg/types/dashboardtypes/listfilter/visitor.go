package listfilter

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
)

// fragment is one composable WHERE fragment. sql uses `?` placeholders;
// args lines up positionally with the placeholders.
type fragment struct {
	sql  string
	args []any
}

func newFragment(sql string, args ...any) *fragment {
	return &fragment{sql: sql, args: args}
}

type visitor struct {
	grammar.BaseFilterQueryVisitor
	formatter sqlstore.SQLFormatter
	errors    []string
}

func newVisitor(formatter sqlstore.SQLFormatter) *visitor {
	return &visitor{
		formatter: formatter,
	}
}

// Emitted WHERE fragment uses aliases `dashboard` and `pd` (public_dashboard).
func (v *visitor) compile(query string) (*fragment, []string) {
	tree, _, collector := filterquery.Parse(query)
	if len(collector.Errors) > 0 {
		return nil, collector.Errors
	}
	frag, _ := v.visit(tree).(*fragment)
	return frag, nil
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
	frags := make([]*fragment, 0, len(parts))
	for _, p := range parts {
		if f, ok := v.visit(p).(*fragment); ok && f != nil {
			frags = append(frags, f)
		}
	}
	return joinFragments(frags, "OR")
}

func (v *visitor) VisitAndExpression(ctx *grammar.AndExpressionContext) any {
	parts := ctx.AllUnaryExpression()
	frags := make([]*fragment, 0, len(parts))
	for _, p := range parts {
		if f, ok := v.visit(p).(*fragment); ok && f != nil {
			frags = append(frags, f)
		}
	}
	return joinFragments(frags, "AND")
}

func (v *visitor) VisitUnaryExpression(ctx *grammar.UnaryExpressionContext) any {
	f, _ := v.visit(ctx.Primary()).(*fragment)
	if f == nil {
		return nil
	}
	if ctx.NOT() != nil {
		return newFragment("NOT ("+f.sql+")", f.args...)
	}
	return f
}

func (v *visitor) VisitPrimary(ctx *grammar.PrimaryContext) any {
	if ctx.OrExpression() != nil {
		f, _ := v.visit(ctx.OrExpression()).(*fragment)
		if f == nil {
			return nil
		}
		return newFragment("("+f.sql+")", f.args...)
	}
	if ctx.Comparison() != nil {
		return v.visit(ctx.Comparison())
	}
	// Bare keys, values, full text, and function calls are not part of the
	// dashboard list DSL.
	v.addErr("unsupported expression %q — every term must be of the form `key OP value`", ctx.GetText())
	return nil
}

// VisitComparison dispatches a single `key OP value` term. A key that matches
// a reserved DSL key (name, description, etc.) becomes a column-level
// predicate; any other identifier is treated as a tag key — the operator
// applies to the tag's value, with a case-insensitive match on the tag's key.
func (v *visitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	key, ok := v.parseKey(ctx)
	if !ok {
		return nil
	}

	op, ok := v.opFromContext(ctx)
	if !ok {
		return nil
	}

	if reservedOpSet, isReserved := reservedOps[dashboardtypes.DSLKey(key)]; isReserved {
		if _, allowed := reservedOpSet[op]; !allowed {
			v.addErr("operator %s is not allowed for key %q", opName(op), key)
			return nil
		}
		switch dashboardtypes.DSLKey(key) {
		case dashboardtypes.DSLKeyName:
			return v.emitJSONStringComparison(ctx, op, "$.data.display.name")
		case dashboardtypes.DSLKeyDescription:
			return v.emitJSONStringComparison(ctx, op, "$.data.display.description")
		case dashboardtypes.DSLKeyCreatedAt:
			return v.emitTimestampComparison(ctx, op, "dashboard.created_at")
		case dashboardtypes.DSLKeyUpdatedAt:
			return v.emitTimestampComparison(ctx, op, "dashboard.updated_at")
		case dashboardtypes.DSLKeyCreatedBy:
			return v.emitStringComparison(ctx, op, "dashboard.created_by")
		case dashboardtypes.DSLKeyLocked:
			return v.emitBoolComparison(ctx, op, "dashboard.locked")
		case dashboardtypes.DSLKeyPublic:
			return v.emitPublicComparison(ctx, op)
		}
	}

	if _, allowed := tagKeyOps[op]; !allowed {
		v.addErr("operator %s is not allowed on a tag-key filter", opName(op))
		return nil
	}
	return v.emitTagComparison(ctx, op, key)
}

func (v *visitor) parseKey(ctx *grammar.ComparisonContext) (string, bool) {
	keyText := strings.ToLower(strings.TrimSpace(ctx.Key().GetText()))
	if keyText == "" {
		v.addErr("filter key cannot be empty")
		return "", false
	}
	return keyText, true
}

func (v *visitor) opFromContext(ctx *grammar.ComparisonContext) (qbtypesv5.FilterOperator, bool) {
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
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotBetween, true
		}
		return qbtypesv5.FilterOperatorBetween, true
	case ctx.LIKE() != nil:
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotLike, true
		}
		return qbtypesv5.FilterOperatorLike, true
	case ctx.ILIKE() != nil:
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotILike, true
		}
		return qbtypesv5.FilterOperatorILike, true
	case ctx.CONTAINS() != nil:
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotContains, true
		}
		return qbtypesv5.FilterOperatorContains, true
	case ctx.REGEXP() != nil:
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotRegexp, true
		}
		return qbtypesv5.FilterOperatorRegexp, true
	case ctx.InClause() != nil:
		return qbtypesv5.FilterOperatorIn, true
	case ctx.NotInClause() != nil:
		return qbtypesv5.FilterOperatorNotIn, true
	case ctx.EXISTS() != nil:
		if ctx.NOT() != nil {
			return qbtypesv5.FilterOperatorNotExists, true
		}
		return qbtypesv5.FilterOperatorExists, true
	}
	v.addErr("could not determine operator in expression %q", ctx.GetText())
	return qbtypesv5.FilterOperatorUnknown, false
}

// ─── per-key emitters ────────────────────────────────────────────────────────

func (v *visitor) emitJSONStringComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, jsonPath string) *fragment {
	colExpr := string(v.formatter.JSONExtractString("dashboard.data", jsonPath))
	return v.emitStringOp(ctx, op, colExpr, string(dashboardtypes.DSLKeyName))
}

func (v *visitor) emitStringComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, colExpr string) *fragment {
	return v.emitStringOp(ctx, op, colExpr, string(dashboardtypes.DSLKeyCreatedBy))
}

// emitStringOp covers all the operators the spec allows on text-shaped keys
// (name, description, created_by). Tag uses a separate emitter that wraps each
// produced fragment in an EXISTS subquery.
func (v *visitor) emitStringOp(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, colExpr, keyForErr string) *fragment {
	switch op {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLike, qbtypesv5.FilterOperatorNotLike:
		val, ok := v.singleString(ctx, keyForErr)
		if !ok {
			return nil
		}
		return newFragment(colExpr+" "+opName(op)+" ?", val)
	case qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike:
		val, ok := v.singleString(ctx, keyForErr)
		if !ok {
			return nil
		}
		// SQLite has no ILIKE keyword and Postgres LIKE is case-sensitive — emit
		// LOWER(col) LIKE LOWER(?) so behavior is identical on both dialects.
		lowerCol := string(v.formatter.LowerExpression(colExpr))
		return newFragment(lowerCol+" "+opName(iLikeToLike(op))+" LOWER(?)", val)
	case qbtypesv5.FilterOperatorContains, qbtypesv5.FilterOperatorNotContains:
		val, ok := v.singleString(ctx, keyForErr)
		if !ok {
			return nil
		}
		return newFragment(colExpr+" "+opName(containsToLike(op))+" ?", "%"+escapeLike(val)+"%")
	case qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp:
		v.addErr("REGEXP filtering on %q is not yet supported", keyForErr)
		return nil
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		vals, ok := v.stringList(ctx, keyForErr)
		if !ok {
			return nil
		}
		return inFragment(colExpr, op, vals)
	}
	v.addErr("operator %s on %q is not implemented", opName(op), keyForErr)
	return nil
}

func (v *visitor) emitTimestampComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, colExpr string) *fragment {
	switch op {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual,
		qbtypesv5.FilterOperatorLessThan, qbtypesv5.FilterOperatorLessThanOrEq,
		qbtypesv5.FilterOperatorGreaterThan, qbtypesv5.FilterOperatorGreaterThanOrEq:
		t, ok := v.singleTimestamp(ctx)
		if !ok {
			return nil
		}
		return newFragment(colExpr+" "+opName(op)+" ?", t)
	case qbtypesv5.FilterOperatorBetween, qbtypesv5.FilterOperatorNotBetween:
		ts, ok := v.twoTimestamps(ctx)
		if !ok {
			return nil
		}
		return newFragment(colExpr+" "+opName(op)+" ? AND ?", ts[0], ts[1])
	}
	v.addErr("operator %s on timestamp is not implemented", opName(op))
	return nil
}

func (v *visitor) emitBoolComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, colExpr string) *fragment {
	b, ok := v.singleBool(ctx)
	if !ok {
		return nil
	}
	return newFragment(colExpr+" "+opName(op)+" ?", b)
}

// emitPublicComparison renders `public = true|false` against the LEFT-joined
// public_dashboard alias `pd`. The spec says public is a virtual column whose
// truthiness is the existence of a row in public_dashboard.
func (v *visitor) emitPublicComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator) *fragment {
	b, ok := v.singleBool(ctx)
	if !ok {
		return nil
	}
	want := b
	if op == qbtypesv5.FilterOperatorNotEqual {
		want = !b
	}
	if want {
		return newFragment("pd.id IS NOT NULL")
	}
	return newFragment("pd.id IS NULL")
}

const tagSubqueryPrefix = "SELECT 1 FROM tag_relations tr JOIN tag t ON t.id = tr.tag_id " +
	"WHERE tr.entity_type = 'dashboard' AND tr.entity_id = dashboard.id " +
	"AND LOWER(t.key) = LOWER(?)"

// emitTagComparison wraps the inner predicate in EXISTS (or NOT EXISTS for the
// negated operators). The inner predicate matches the tag's key
// case-insensitively and applies the user's operator to the tag's value.
// EXISTS / NOT EXISTS skip the value predicate — they assert the existence
// (or absence) of any tag with the given key.
func (v *visitor) emitTagComparison(ctx *grammar.ComparisonContext, op qbtypesv5.FilterOperator, key string) *fragment {
	if op == qbtypesv5.FilterOperatorExists || op == qbtypesv5.FilterOperatorNotExists {
		wrapper := "EXISTS"
		if op == qbtypesv5.FilterOperatorNotExists {
			wrapper = "NOT EXISTS"
		}
		return newFragment(wrapper+" ("+tagSubqueryPrefix+")", key)
	}

	// All other tag operators take the positive form of the value predicate
	// and toggle the EXISTS wrapper for negation. Inverse() flips Not<X> → <X>.
	negated := op.IsNegativeOperator()
	posOp := op
	if negated {
		posOp = op.Inverse()
	}
	inner := v.emitStringOp(ctx, posOp, "t.value", key)
	if inner == nil {
		return nil
	}
	wrapper := "EXISTS"
	if negated {
		wrapper = "NOT EXISTS"
	}
	args := append([]any{key}, inner.args...)
	return newFragment(wrapper+" ("+tagSubqueryPrefix+" AND "+inner.sql+")", args...)
}

// ─── value extraction helpers ───────────────────────────────────────────────

func (v *visitor) addErr(format string, args ...any) {
	v.errors = append(v.errors, fmt.Sprintf(format, args...))
}

func (v *visitor) singleString(ctx *grammar.ComparisonContext, keyForErr string) (string, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addErr("expected exactly one value for %q", keyForErr)
		return "", false
	}
	return v.stringValue(values[0], keyForErr)
}

func (v *visitor) singleBool(ctx *grammar.ComparisonContext) (bool, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addErr("expected a single boolean (true/false)")
		return false, false
	}
	return v.boolValue(values[0])
}

func (v *visitor) singleTimestamp(ctx *grammar.ComparisonContext) (time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 1 {
		v.addErr("expected a single RFC3339 timestamp")
		return time.Time{}, false
	}
	return v.timestampValue(values[0])
}

func (v *visitor) twoTimestamps(ctx *grammar.ComparisonContext) ([2]time.Time, bool) {
	values := ctx.AllValue()
	if len(values) != 2 {
		v.addErr("BETWEEN expects two RFC3339 timestamps")
		return [2]time.Time{}, false
	}
	a, ok1 := v.timestampValue(values[0])
	b, ok2 := v.timestampValue(values[1])
	if !ok1 || !ok2 {
		return [2]time.Time{}, false
	}
	return [2]time.Time{a, b}, true
}

func (v *visitor) stringList(ctx *grammar.ComparisonContext, keyForErr string) ([]string, bool) {
	var valuesCtx []grammar.IValueContext
	switch {
	case ctx.InClause() != nil:
		ic := ctx.InClause()
		if ic.ValueList() != nil {
			valuesCtx = ic.ValueList().AllValue()
		} else {
			valuesCtx = []grammar.IValueContext{ic.Value()}
		}
	case ctx.NotInClause() != nil:
		nc := ctx.NotInClause()
		if nc.ValueList() != nil {
			valuesCtx = nc.ValueList().AllValue()
		} else {
			valuesCtx = []grammar.IValueContext{nc.Value()}
		}
	default:
		v.addErr("IN clause is missing for %q", keyForErr)
		return nil, false
	}
	if len(valuesCtx) == 0 {
		v.addErr("IN list for %q is empty", keyForErr)
		return nil, false
	}
	out := make([]string, 0, len(valuesCtx))
	for _, vc := range valuesCtx {
		s, ok := v.stringValue(vc, keyForErr)
		if !ok {
			return nil, false
		}
		out = append(out, s)
	}
	return out, true
}

func (v *visitor) stringValue(ctx grammar.IValueContext, keyForErr string) (string, bool) {
	if ctx.QUOTED_TEXT() != nil {
		return trimQuotes(ctx.QUOTED_TEXT().GetText()), true
	}
	if ctx.KEY() != nil {
		// Bare tokens are accepted as strings, mirroring the FilterQuery lexer's
		// treatment of unquoted identifiers on the value side.
		return ctx.KEY().GetText(), true
	}
	v.addErr("expected a string value for %q, got %q", keyForErr, ctx.GetText())
	return "", false
}

func (v *visitor) boolValue(ctx grammar.IValueContext) (bool, bool) {
	if ctx.BOOL() == nil {
		v.addErr("expected a boolean (true/false), got %q", ctx.GetText())
		return false, false
	}
	return strings.EqualFold(ctx.BOOL().GetText(), "true"), true
}

func (v *visitor) timestampValue(ctx grammar.IValueContext) (time.Time, bool) {
	if ctx.QUOTED_TEXT() == nil {
		v.addErr("expected an RFC3339 timestamp string, got %q", ctx.GetText())
		return time.Time{}, false
	}
	raw := trimQuotes(ctx.QUOTED_TEXT().GetText())
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		v.addErr("invalid RFC3339 timestamp %q: %s", raw, err.Error())
		return time.Time{}, false
	}
	return t, true
}

// ─── fragment helpers ────────────────────────────────────────────────────────

func joinFragments(frags []*fragment, conn string) *fragment {
	if len(frags) == 0 {
		return nil
	}
	if len(frags) == 1 {
		return frags[0]
	}
	parts := make([]string, len(frags))
	args := make([]any, 0)
	for i, f := range frags {
		parts[i] = f.sql
		args = append(args, f.args...)
	}
	return newFragment(strings.Join(parts, " "+conn+" "), args...)
}

func inFragment(colExpr string, op qbtypesv5.FilterOperator, vals []string) *fragment {
	placeholders := strings.Repeat("?, ", len(vals))
	placeholders = placeholders[:len(placeholders)-2]
	args := make([]any, len(vals))
	for i, s := range vals {
		args[i] = s
	}
	return newFragment(colExpr+" "+opName(op)+" ("+placeholders+")", args...)
}

// opName returns the user-facing spelling of a FilterOperator. For the
// operators we emit directly into SQL (=, !=, <, LIKE, IN, BETWEEN, …) the
// spelling doubles as the SQL keyword. For the operators we don't emit
// directly (ILIKE, CONTAINS, REGEXP, EXISTS, NOT EXISTS) it's only used in
// error messages.
func opName(op qbtypesv5.FilterOperator) string {
	switch op {
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

// iLikeToLike maps ILIKE → LIKE for the LOWER(col) LIKE LOWER(?) emission.
func iLikeToLike(op qbtypesv5.FilterOperator) qbtypesv5.FilterOperator {
	if op == qbtypesv5.FilterOperatorNotILike {
		return qbtypesv5.FilterOperatorNotLike
	}
	return qbtypesv5.FilterOperatorLike
}

// containsToLike maps CONTAINS → LIKE for the LIKE '%val%' emission.
func containsToLike(op qbtypesv5.FilterOperator) qbtypesv5.FilterOperator {
	if op == qbtypesv5.FilterOperatorNotContains {
		return qbtypesv5.FilterOperatorNotLike
	}
	return qbtypesv5.FilterOperatorLike
}

// escapeLike escapes the LIKE meta-characters % and _ in user input so that a
// CONTAINS query of `50%` doesn't match every value containing `50`.
func escapeLike(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return r.Replace(s)
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
