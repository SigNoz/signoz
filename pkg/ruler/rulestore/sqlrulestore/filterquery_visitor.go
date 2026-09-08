package sqlrulestore

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/parser/filterquery"
	grammar "github.com/SigNoz/signoz/pkg/parser/filterquery/grammar"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	qbtypesv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/antlr4-go/antlr/v4"
	sqlbuilder "github.com/huandu/go-sqlbuilder"
)

// bunPlaceholderFlavor is any flavor that renders `?` placeholders, which bun
// re-binds to the actual backend (e.g. `$1` for Postgres) at query time.
const bunPlaceholderFlavor = sqlbuilder.SQLite

const (
	ruleDataColumn  = "rule.data"
	ruleLabelsField = "labels"
	nameJSONPath    = "$.alert"
	descriptionPath = "$.description"
	labelsJSONPath  = "$.labels"
	alertTypePath   = "$.alertType"
	ruleTypePath    = "$.ruleType"
)

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

func (v *visitor) compile(query string) (string, []any, []string) {
	tree, _, collector := filterquery.Parse(query)
	if len(collector.Errors) > 0 {
		return "", nil, collector.Errors
	}
	condition, _ := v.visit(tree).(string)
	if len(v.errors) > 0 {
		return "", nil, v.errors
	}
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
	// A lone token is a free-text term; a quoted token matches its contents
	// literally: the escape hatch for a phrase or a term that looks like DSL.
	return v.buildFreeTextTerm(trimQuotes(ctx.GetText()))
}

// VisitComparison dispatches a single `key OP value` term. Label keys are
// matched case-sensitively; an unknown key is rejected rather than silently
// matching nothing.
func (v *visitor) VisitComparison(ctx *grammar.ComparisonContext) any {
	rawKey := strings.TrimSpace(ctx.Key().GetText())
	key := strings.ToLower(rawKey)

	operation, ok := v.extractOperation(ctx)
	if !ok {
		return ""
	}

	if allowedOperations, isReserved := ruletypes.ReservedOps[ruletypes.DSLKey(key)]; isReserved {
		return v.visitComparisonForReservedKeys(ctx, operation, ruletypes.DSLKey(key), allowedOperations)
	}

	if strings.HasPrefix(key, ruletypes.DSLLabelsKeyPrefix) {
		labelKey := rawKey[len(ruletypes.DSLLabelsKeyPrefix):]
		if labelKey == "" {
			v.addError("labels filter is missing a key, use labels.<key>")
			return ""
		}
		return v.visitComparisonForLabels(ctx, operation, labelKey)
	}

	v.addError("unknown filter key %q, use one of the reserved keys or labels.<key>", rawKey)
	return ""
}

func (v *visitor) visitComparisonForReservedKeys(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, allowedOperations map[qbtypesv5.FilterOperator]struct{}) string {
	if _, allowed := allowedOperations[operation]; !allowed {
		v.addError("operator %s is not allowed for key %q", operationName(operation), key)
		return ""
	}
	switch key {
	case ruletypes.DSLKeyName:
		columnExpression := string(v.formatter.JSONExtractString(ruleDataColumn, nameJSONPath))
		return v.buildStringOperation(v.selectBuilder, ctx, operation, columnExpression, string(key))
	case ruletypes.DSLKeySeverity:
		// severity is an alias for labels.severity and shares its semantics,
		// including negations matching rules that carry no severity at all.
		return v.buildLabelComparison(ctx, operation, "severity")
	case ruletypes.DSLKeyCreatedBy:
		return v.buildStringOperation(v.selectBuilder, ctx, operation, "rule.created_by", string(key))
	case ruletypes.DSLKeyUpdatedBy:
		return v.buildStringOperation(v.selectBuilder, ctx, operation, "rule.updated_by", string(key))
	case ruletypes.DSLKeyCreatedAt:
		return v.buildTimestampComparison(ctx, operation, "rule.created_at")
	case ruletypes.DSLKeyUpdatedAt:
		return v.buildTimestampComparison(ctx, operation, "rule.updated_at")
	case ruletypes.DSLKeyAlertType:
		return v.buildEnumComparison(ctx, operation, key, alertTypePath, alertTypeValues())
	case ruletypes.DSLKeyRuleType:
		return v.buildEnumComparison(ctx, operation, key, ruleTypePath, ruleTypeValues())
	}
	v.addError("no handler for reserved key %q", key)
	return ""
}

// visitComparisonForLabels builds a predicate on one label's value. A missing
// label uniformly evaluates as the empty string (COALESCE) for every value
// operator, so `!= 'x'` matches label-less rules, `!= ''` does not, and
// `= ''` does. Presence itself is expressed with EXISTS/NOT EXISTS, which test
// the raw extraction.
func (v *visitor) visitComparisonForLabels(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, labelKey string) string {
	if _, allowed := ruletypes.LabelsKeyOps[operation]; !allowed {
		v.addError("operator %s is not allowed on a labels.<key> filter", operationName(operation))
		return ""
	}
	return v.buildLabelComparison(ctx, operation, labelKey)
}

func (v *visitor) buildLabelComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, labelKey string) string {
	columnExpression := string(v.formatter.JSONExtractMapValue(ruleDataColumn, ruleLabelsField, labelKey))

	switch operation {
	case qbtypesv5.FilterOperatorExists:
		return fmt.Sprintf("%s IS NOT NULL", columnExpression)
	case qbtypesv5.FilterOperatorNotExists:
		return fmt.Sprintf("%s IS NULL", columnExpression)
	}

	keyForError := ruletypes.DSLLabelsKeyPrefix + labelKey
	columnExpression = fmt.Sprintf("COALESCE(%s, '')", columnExpression)
	return v.buildStringOperation(v.selectBuilder, ctx, operation, columnExpression, keyForError)
}

func (v *visitor) buildEnumComparison(ctx *grammar.ComparisonContext, operation qbtypesv5.FilterOperator, key ruletypes.DSLKey, jsonPath string, allowedValues []string) string {
	columnExpression := string(v.formatter.JSONExtractString(ruleDataColumn, jsonPath))

	var values []string
	switch operation {
	case qbtypesv5.FilterOperatorEqual, qbtypesv5.FilterOperatorNotEqual:
		value, ok := v.extractSingleStringValue(ctx, string(key))
		if !ok {
			return ""
		}
		values = []string{value}
	case qbtypesv5.FilterOperatorIn, qbtypesv5.FilterOperatorNotIn:
		list, ok := v.extractStringValueList(ctx, string(key))
		if !ok {
			return ""
		}
		values = list
	default:
		v.addError("operator %s on %q is not implemented", operationName(operation), key)
		return ""
	}

	for _, value := range values {
		if !slices.Contains(allowedValues, value) {
			v.addError("invalid value %q for %q, expected one of: %s", value, key, strings.Join(allowedValues, ", "))
			return ""
		}
	}

	arguments := make([]any, len(values))
	for i, s := range values {
		arguments[i] = s
	}
	switch operation {
	case qbtypesv5.FilterOperatorEqual:
		return v.selectBuilder.Equal(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotEqual:
		return v.selectBuilder.NotEqual(columnExpression, arguments[0])
	case qbtypesv5.FilterOperatorNotIn:
		return v.selectBuilder.NotIn(columnExpression, arguments...)
	default:
		return v.selectBuilder.In(columnExpression, arguments...)
	}
}

func alertTypeValues() []string {
	values := make([]string, 0, 4)
	for _, value := range (ruletypes.AlertType("")).Enum() {
		values = append(values, string(value.(ruletypes.AlertType)))
	}
	return values
}

func ruleTypeValues() []string {
	values := make([]string, 0, 3)
	for _, value := range (ruletypes.RuleType{}).Enum() {
		values = append(values, value.(ruletypes.RuleType).StringValue())
	}
	return values
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
	v.addError("could not determine operator in expression %q", ctx.GetText())
	return qbtypesv5.FilterOperatorUnknown, false
}

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
		// The user's % and _ stay as wildcards; ESCAPE pins backslash as the
		// escape char (the Postgres default; SQLite has none).
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, builder.Var(val))
	case qbtypesv5.FilterOperatorILike, qbtypesv5.FilterOperatorNotILike:
		val, ok := v.extractSingleStringValue(ctx, keyForError)
		if !ok {
			return ""
		}
		// SQLite has no ILIKE keyword and Postgres LIKE is case-sensitive, so
		// LOWER both sides.
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
		escaped := v.formatter.EscapeLikePattern(val)
		return fmt.Sprintf("%s %s %s ESCAPE '\\'", columnExpression, like, builder.Var("%"+escaped+"%"))
	case qbtypesv5.FilterOperatorRegexp, qbtypesv5.FilterOperatorNotRegexp:
		v.addError("REGEXP filtering on %q is not supported", keyForError)
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

// ─── free-text search ────────────────────────────────────────────────────────

// buildFreeTextTerm matches value as a case-insensitive substring of the rule
// name, description, or any label key/value (the labels JSON is matched as raw
// text, which also matches keys).
func (v *visitor) buildFreeTextTerm(value string) string {
	nameColumn := string(v.formatter.JSONExtractString(ruleDataColumn, nameJSONPath))
	descriptionColumn := string(v.formatter.JSONExtractString(ruleDataColumn, descriptionPath))
	labelsColumn := string(v.formatter.JSONExtractString(ruleDataColumn, labelsJSONPath))

	return v.selectBuilder.Or(
		v.buildFreeTextContains(nameColumn, value),
		v.buildFreeTextContains(descriptionColumn, value),
		v.buildFreeTextContains(labelsColumn, value),
	)
}

// buildFreeTextContains emits a case-insensitive contains. COALESCE keeps a
// NULL column (an absent description) false rather than NULL, otherwise
// `NOT (...)` goes NULL and drops every description-less rule.
func (v *visitor) buildFreeTextContains(columnExpression, value string) string {
	lowerColumn := string(v.formatter.LowerExpression("COALESCE(" + columnExpression + ", '')"))
	pattern := "%" + v.formatter.EscapeLikePattern(value) + "%"
	return fmt.Sprintf("%s LIKE LOWER(%s) ESCAPE '\\'", lowerColumn, v.selectBuilder.Var(pattern))
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
		return ctx.KEY().GetText(), true
	}
	v.addError("expected a string value for %q, got %q", keyForError, ctx.GetText())
	return "", false
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

// operationName is the user-facing spelling, used only in error messages.
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
